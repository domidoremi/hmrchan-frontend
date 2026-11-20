import {
  computed,
  inject,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  watch,
  type Ref,
} from 'vue'
import { createVisibilityObserver } from '@/utils/modernAPIs'
import { usePostSelection } from '../presentation'
import { createWheelRegion } from './wheelRegion'
import { chapterKey } from './chapterContext'
import type { JournalPost } from '../models'

export function useCoverPlayback(posts: Readonly<Ref<JournalPost[]>>) {
  const chapter = inject(chapterKey, null)
  const items = computed(() => posts.value.slice(0, 6))
  const selection = usePostSelection(items)
  const root = ref<HTMLElement>()
  const hovered = ref(false),
    focused = ref(false),
    paused = ref(false)
  const visible = ref(false),
    hasEntered = ref(false),
    active = ref(false),
    fullMotion = ref(false)
  const blocked = ref(false),
    documentVisible = ref(!document.hidden)
  const lifetime = new AbortController()
  const cursor = ref(0)
  const scrubbing = computed(() => Boolean(chapter?.enabled.value))
  let timer: ReturnType<typeof setTimeout> | undefined
  let observer: IntersectionObserver | undefined
  let dialogObserver: MutationObserver | undefined
  let touch: { x: number; y: number; at: number } | undefined
  let wheelElement: HTMLElement | null = null
  let wheelHandler: ((event: WheelEvent) => void) | undefined

  const playing = computed(
    () =>
      active.value &&
      visible.value &&
      documentVisible.value &&
      fullMotion.value &&
      !blocked.value &&
      !hovered.value &&
      !focused.value &&
      !paused.value &&
      !chapter?.enabled.value &&
      items.value.length > 1
  )
  function clearTimer() {
    clearTimeout(timer)
    timer = undefined
  }
  watch([playing, selection.selectedId], () => {
    clearTimer()
    if (playing.value)
      timer = setTimeout(() => {
        timer = undefined
        if (playing.value) selection.step(1)
      }, 6500)
  })
  function syncEnvironment() {
    documentVisible.value = !document.hidden
    fullMotion.value = document.body.dataset['motion'] === 'full'
    blocked.value =
      document.body.classList.contains('journal-appearance-open') ||
      document.body.classList.contains('app-dialog-open') ||
      Boolean(document.querySelector('dialog[open]'))
  }
  function focusOut(event: FocusEvent) {
    if (!(event.relatedTarget instanceof Node) || !root.value?.contains(event.relatedTarget))
      focused.value = false
  }
  function position(i: number) {
    const length = items.value.length
    if (!length) return 0
    if (scrubbing.value) return i - cursor.value
    const offset = (i - selection.index.value + length) % length
    return offset > length / 2 ? offset - length : offset
  }
  function copyStyle(i: number) {
    const offset = position(i)
    return {
      '--copy-offset': scrubbing.value ? 0 : Math.max(-1, Math.min(1, offset)),
      opacity: i === selection.index.value ? 1 : 0,
      pointerEvents: i === selection.index.value ? ('auto' as const) : ('none' as const),
    }
  }
  function selectSheet(id: string) {
    if (id === selection.selectedId.value) return
    selection.selectedId.value = id
    if (chapter?.enabled.value) {
      if (paused.value) cursor.value = selection.index.value
      chapter.seek(selection.index.value / Math.max(1, items.value.length - 1), true)
    }
  }
  function step(direction: number) {
    const count = items.value.length
    const item = items.value[(selection.index.value + direction + count) % count]
    if (item) selectSheet(item.id)
  }
  function touchStart(event: TouchEvent) {
    const point = event.changedTouches[0]
    if (point) touch = { x: point.clientX, y: point.clientY, at: performance.now() }
  }
  function touchEnd(event: TouchEvent) {
    const point = event.changedTouches[0],
      start = touch
    touch = undefined
    if (!point || !start || performance.now() - start.at > 1200) return
    const dx = point.clientX - start.x,
      dy = point.clientY - start.y
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) step(dx < 0 ? 1 : -1)
  }
  function touchCancel() {
    touch = undefined
  }
  function setRoot(element: unknown) {
    root.value = element instanceof HTMLElement ? element : undefined
  }
  function bindWheel() {
    const element =
      root.value?.querySelector<HTMLElement>('.cover-scene, .next-stage-scene') ?? null
    if (element === wheelElement) return
    if (wheelElement && wheelHandler) wheelElement.removeEventListener('wheel', wheelHandler)
    wheelElement = element
    if (!element) return
    wheelHandler = createWheelRegion({
      element,
      position: () => selection.index.value,
      maximum: () => items.value.length - 1,
      stepped: true,
      enabled: () => active.value && !blocked.value && !chapter?.enabled.value,
      move: (index) => {
        const post = items.value[index]
        if (post) selectSheet(post.id)
      },
    })
    element.addEventListener('wheel', wheelHandler, { passive: false, signal: lifetime.signal })
  }
  watch([root, () => items.value.length], bindWheel, { flush: 'post' })
  onMounted(() => {
    active.value = true
    syncEnvironment()
    observer = createVisibilityObserver(
      ([entry]) => {
        visible.value = Boolean(entry?.isIntersecting)
        root.value?.classList.toggle('motion-offscreen', !visible.value)
        if (visible.value) hasEntered.value = true
      },
      { threshold: 0.2 }
    )
    if (root.value) {
      observer.observe(root.value)
    }
    bindWheel()
    dialogObserver = new MutationObserver(syncEnvironment)
    dialogObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    const dialog = document.querySelector('#app-dialog')
    if (dialog) dialogObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] })
    document.addEventListener('journalmotionchange', syncEnvironment, { signal: lifetime.signal })
    document.addEventListener('visibilitychange', syncEnvironment, { signal: lifetime.signal })
    window.addEventListener(
      'pagehide',
      () => {
        active.value = false
        clearTimer()
      },
      { signal: lifetime.signal }
    )
    window.addEventListener(
      'pageshow',
      () => {
        active.value = true
        syncEnvironment()
      },
      { signal: lifetime.signal }
    )
  })
  watch(root, (element, previous) => {
    if (previous) observer?.unobserve(previous)
    if (element) observer?.observe(element)
  })
  onActivated(() => {
    active.value = true
    syncEnvironment()
  })
  onDeactivated(() => {
    active.value = false
    clearTimer()
  })
  onBeforeUnmount(() => {
    lifetime.abort()
    clearTimer()
    observer?.disconnect()
    dialogObserver?.disconnect()
  })
  if (chapter) {
    watch(
      [chapter.height, () => items.value.length],
      ([height, count]) => {
        chapter.travel.value = Math.max(0, count - 1) * height * 0.6
      },
      { immediate: true }
    )
    watch([chapter.progress, chapter.enabled, active, blocked, paused], ([value, enabled]) => {
      if (!enabled || !active.value || blocked.value || paused.value) return
      cursor.value = value * Math.max(0, items.value.length - 1)
      const item = items.value[Math.round(cursor.value)]
      if (item) selection.selectedId.value = item.id
    })
  }
  return {
    ...selection,
    step,
    root,
    setRoot,
    items,
    hovered,
    focused,
    paused,
    playing,
    hasEntered,
    position,
    copyStyle,
    scrubbing,
    selectSheet,
    focusOut,
    touchStart,
    touchEnd,
    touchCancel,
  }
}
