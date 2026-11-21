import { inject, nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { createResizeObserver, createVisibilityObserver } from '@/utils/modernAPIs'
import { createWheelRegion } from './wheelRegion'
import { createFilmViewport } from './filmViewport'
import { chapterKey } from './chapterContext'
import type { JournalPost } from '../models'

export function useFilmstrip(posts: Readonly<Ref<JournalPost[]>>) {
  const chapter = inject(chapterKey, null)
  const track = ref<HTMLElement>(),
    index = ref(0),
    progress = ref(0),
    dragging = ref(false)
  const canScroll = ref(false)
  let frame = 0,
    resize: ResizeObserver | null = null,
    visibility: IntersectionObserver | null = null,
    visible = false,
    suppressUntil = 0
  let wheelHandler: ((event: WheelEvent) => void) | undefined
  let wheelEnd: ReturnType<typeof setTimeout> | undefined
  let viewport: ReturnType<typeof createFilmViewport> | undefined
  let pointer: { id: number; x: number; y: number; left: number } | undefined
  const cards = () => [...(track.value?.querySelectorAll<HTMLElement>('.film-frame') || [])]
  const behavior = (): ScrollBehavior =>
    document.body.dataset['motion'] === 'full' ? 'smooth' : 'instant'
  function measure() {
    frame = 0
    const element = track.value
    if (!element || document.hidden) return
    const width = element.clientWidth
    if (!width) return
    const left = element.scrollLeft
    const max = element.scrollWidth - width
    if (chapter) chapter.travel.value = Math.max(0, max)
    canScroll.value = max > 2
    progress.value = max > 0 ? Math.min(1, Math.max(0, left / max)) : 0
    let closest = Infinity
    const positions = cards().map((card) => ({
      card,
      offset: (card.offsetLeft + card.offsetWidth / 2 - left - width / 2) / width,
    }))
    positions.forEach(({ card, offset }, i) => {
      if (visible && document.body.dataset['motion'] === 'full') {
        card.style.setProperty('--film-offset', String(Math.max(-1.5, Math.min(1.5, offset))))
        card.style.setProperty('--film-distance', String(Math.min(1, Math.abs(offset))))
      } else {
        card.style.removeProperty('--film-offset')
        card.style.removeProperty('--film-distance')
      }
      if (Math.abs(offset) < closest) {
        closest = Math.abs(offset)
        index.value = i
      }
    })
  }
  function schedule() {
    if (document.body.dataset['motion'] !== 'full') {
      cancelAnimationFrame(frame)
      measure()
      return
    }
    if (!frame) frame = requestAnimationFrame(measure)
  }
  function resizeFilm() {
    viewport?.refresh()
    schedule()
  }
  function go(next: number, focus = false) {
    const element = track.value,
      items = cards()
    const i = Math.max(0, Math.min(items.length - 1, next)),
      card = items[i]
    if (!element || !card) return
    if (focus) card.querySelector<HTMLButtonElement>('.film-photo')?.focus({ preventScroll: true })
    const left = card.offsetLeft - (element.clientWidth - card.offsetWidth) / 2
    if (chapter?.enabled.value)
      chapter.seek(left / Math.max(1, element.scrollWidth - element.clientWidth), !focus)
    else element.scrollTo({ left, behavior: behavior() })
    schedule()
  }
  function step(direction: number) {
    go(index.value + direction)
  }
  function scrub(event: Event) {
    const element = track.value
    if (element) {
      if (chapter?.enabled.value) {
        chapter.seek(Number((event.target as HTMLInputElement).value) / 1000)
        return
      }
      element.scrollTo({
        left:
          (Number((event.target as HTMLInputElement).value) / 1000) *
          (element.scrollWidth - element.clientWidth),
        behavior: 'instant',
      })
      schedule()
    }
  }
  function keydown(event: KeyboardEvent) {
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
    )
      return
    event.preventDefault()
    const target = (event.target as Element).closest('.film-frame')
    const current = target ? cards().indexOf(target as HTMLElement) : index.value
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? posts.value.length - 1
          : current + (event.key === 'ArrowLeft' ? -1 : 1)
    go(next, true)
  }
  function pointerdown(event: PointerEvent) {
    if (event.pointerType === 'touch' || event.button !== 0 || !track.value) return
    pointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: track.value.scrollLeft,
    }
    suppressUntil = 0
  }
  function pointermove(event: PointerEvent) {
    const element = track.value
    if (!pointer || pointer.id !== event.pointerId || !element) return
    if (!event.buttons) {
      pointerend(event)
      return
    }
    const delta = event.clientX - pointer.x
    if (!dragging.value && Math.abs(delta) <= 7) return
    if (!dragging.value && Math.abs(event.clientY - pointer.y) > Math.abs(delta)) {
      pointer = undefined
      return
    }
    if (!dragging.value) {
      dragging.value = true
      element.classList.add('is-dragging')
      element.setPointerCapture(event.pointerId)
    }
    event.preventDefault()
    element.scrollLeft = pointer.left - delta
    if (chapter?.enabled.value)
      chapter.seek(element.scrollLeft / Math.max(1, element.scrollWidth - element.clientWidth))
    schedule()
  }
  function pointerend(event: PointerEvent) {
    if (!pointer || pointer.id !== event.pointerId) return
    pointer = undefined
    if (!dragging.value) return
    suppressUntil = performance.now() + 400
    dragging.value = false
    track.value?.classList.remove('is-dragging')
    if (track.value?.hasPointerCapture(event.pointerId))
      track.value.releasePointerCapture(event.pointerId)
    measure()
    go(index.value)
  }
  function click(event: MouseEvent) {
    if (performance.now() < suppressUntil && event.detail !== 0) {
      event.preventDefault()
      event.stopPropagation()
    }
  }
  watch(
    () => posts.value.map((post) => post.id).join(','),
    async () => {
      await nextTick()
      schedule()
    }
  )
  onMounted(() => {
    resize = createResizeObserver(resizeFilm)
    visibility = createVisibilityObserver(
      ([entry]) => {
        visible = Boolean(entry?.isIntersecting)
        if (visible) schedule()
      },
      { rootMargin: '300px 0px' }
    )
    if (track.value) {
      const element = track.value
      viewport = createFilmViewport(element)
      viewport.refresh()
      viewport.chrome.forEach((item) => resize?.observe(item))
      wheelHandler = createWheelRegion({
        element,
        position: () => element.scrollLeft,
        maximum: () => element.scrollWidth - element.clientWidth,
        enabled: (event) =>
          !chapter?.enabled.value && !dragging.value && viewport!.canBrowse(event),
        move: (left) => {
          if (viewport!.align()) return
          element.classList.add('is-wheel-scrolling')
          element.scrollTo({ left, behavior: 'instant' })
          schedule()
          clearTimeout(wheelEnd)
          wheelEnd = setTimeout(() => {
            element.classList.remove('is-wheel-scrolling')
            measure()
          }, 160)
        },
      })
      element.addEventListener('wheel', wheelHandler, { passive: false })
      resize?.observe(track.value)
      visibility.observe(track.value)
    }
    document.addEventListener('journalmotionchange', schedule)
    window.addEventListener('resize', resizeFilm)
    schedule()
  })
  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    clearTimeout(wheelEnd)
    if (wheelHandler) track.value?.removeEventListener('wheel', wheelHandler)
    resize?.disconnect()
    visibility?.disconnect()
    document.removeEventListener('journalmotionchange', schedule)
    window.removeEventListener('resize', resizeFilm)
  })
  function setTrack(element: unknown) {
    track.value = element instanceof HTMLElement ? element : undefined
  }
  if (chapter)
    watch([chapter.progress, chapter.enabled], ([value, active]) => {
      const element = track.value
      if (!element || !active) return
      element.scrollTo({
        left: value * Math.max(0, element.scrollWidth - element.clientWidth),
        behavior: 'instant',
      })
      schedule()
    })
  return {
    setTrack,
    index,
    progress,
    canScroll,
    dragging,
    schedule,
    step,
    scrub,
    keydown,
    pointerdown,
    pointermove,
    pointerend,
    click,
  }
}
