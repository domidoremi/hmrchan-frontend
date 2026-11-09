import { nextTick, onBeforeUnmount, onMounted, ref, watch, useId, type Ref } from 'vue'
import { createVisibilityObserver } from '@/utils/modernAPIs'
import { usePostSelection } from '../presentation'
import type { JournalPost } from '../models'

export function useArchiveNavigation(
  posts: Readonly<Ref<JournalPost[]>>,
  open?: (post: JournalPost) => void
) {
  const previewId = `archive-preview-${useId()}`
  const selection = usePostSelection(posts)
  const root = ref<HTMLElement>(),
    preview = ref<HTMLElement>(),
    previewVisible = ref(true)
  let observer: IntersectionObserver | undefined
  function select(id: string) {
    selection.selectedId.value = id
  }
  async function keydown(event: KeyboardEvent) {
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      !(event.target instanceof Element)
    )
      return
    const row = event.target.closest<HTMLElement>('[data-select-post]')
    if (!row) {
      if (event.key === 'Escape' && preview.value?.contains(event.target)) {
        event.preventDefault()
        focusSelected()
      }
      return
    }
    if (event.key === 'Enter') {
      const post = posts.value.find((item) => item.id === row.dataset['selectPost'])
      if (post && open) {
        event.preventDefault()
        open(post)
      }
      return
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      showPreview()
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const items = posts.value
    if (!items.length) return
    const index =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : Math.min(
              items.length - 1,
              Math.max(0, selection.index.value + (event.key === 'ArrowDown' ? 1 : -1))
            )
    select(items[index]!.id)
    await nextTick()
    focusSelected()
  }
  function focusSelected() {
    const row = [...(root.value?.querySelectorAll<HTMLElement>('[data-select-post]') || [])].find(
      (el) => el.dataset['selectPost'] === selection.selectedId.value
    )
    row?.focus({ preventScroll: true })
    row?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
  }
  function showPreview() {
    preview.value?.scrollIntoView({
      block: 'start',
      behavior: document.body.dataset['motion'] === 'full' ? 'smooth' : 'instant',
    })
    preview.value
      ?.querySelector<HTMLElement>('[data-preview-open], button')
      ?.focus({ preventScroll: true })
  }
  watch(preview, (element, previous) => {
    if (previous) observer?.unobserve(previous)
    if (element) observer?.observe(element)
  })
  onMounted(() => {
    observer = createVisibilityObserver(
      ([entry]) => {
        previewVisible.value = Boolean(entry && entry.intersectionRatio >= 0.6)
      },
      { threshold: 0.6, rootMargin: '-72px 0px -88px 0px' }
    )
    if (preview.value) observer.observe(preview.value)
  })
  onBeforeUnmount(() => observer?.disconnect())
  function setRoot(element: unknown) {
    root.value = element instanceof HTMLElement ? element : undefined
  }
  function setPreview(element: unknown) {
    preview.value = element instanceof HTMLElement ? element : undefined
  }
  return {
    ...selection,
    previewId,
    setRoot,
    setPreview,
    previewVisible,
    select,
    keydown,
    showPreview,
  }
}
