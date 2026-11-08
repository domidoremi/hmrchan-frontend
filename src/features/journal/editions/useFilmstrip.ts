import { nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { createResizeObserver } from '@/utils/modernAPIs'
import type { JournalPost } from '../models'

export function useFilmstrip(posts: Readonly<Ref<JournalPost[]>>) {
  const track = ref<HTMLElement>(),
    index = ref(0),
    progress = ref(0),
    dragging = ref(false)
  const canScroll = ref(false)
  let frame = 0,
    resize: ResizeObserver | null = null,
    suppressUntil = 0
  let pointer: { id: number; x: number; y: number; left: number } | undefined
  const cards = () => [...(track.value?.querySelectorAll<HTMLElement>('.film-frame') || [])]
  const behavior = (): ScrollBehavior =>
    document.body.dataset['motion'] === 'full' ? 'smooth' : 'instant'
  function measure() {
    frame = 0
    const element = track.value
    if (!element) return
    const max = element.scrollWidth - element.clientWidth
    canScroll.value = max > 2
    progress.value = max > 0 ? Math.min(1, Math.max(0, element.scrollLeft / max)) : 0
    let closest = Infinity
    cards().forEach((card, i) => {
      const offset =
        (card.offsetLeft + card.offsetWidth / 2 - element.scrollLeft - element.clientWidth / 2) /
        element.clientWidth
      card.style.setProperty('--film-offset', String(Math.max(-1.5, Math.min(1.5, offset))))
      card.style.setProperty('--film-distance', String(Math.min(1, Math.abs(offset))))
      if (Math.abs(offset) < closest) {
        closest = Math.abs(offset)
        index.value = i
      }
    })
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(measure)
  }
  function go(next: number, focus = false) {
    const element = track.value,
      items = cards()
    const i = Math.max(0, Math.min(items.length - 1, next)),
      card = items[i]
    if (!element || !card) return
    if (focus) card.focus({ preventScroll: true })
    element.scrollTo({
      left: card.offsetLeft - (element.clientWidth - card.offsetWidth) / 2,
      behavior: behavior(),
    })
  }
  function step(direction: number) {
    go(index.value + direction)
  }
  function scrub(event: Event) {
    const element = track.value
    if (element)
      element.scrollTo({
        left:
          (Number((event.target as HTMLInputElement).value) / 1000) *
          (element.scrollWidth - element.clientWidth),
        behavior: 'instant',
      })
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
    resize = createResizeObserver(schedule)
    if (track.value) resize?.observe(track.value)
    schedule()
  })
  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    resize?.disconnect()
  })
  function setTrack(element: unknown) {
    track.value = element instanceof HTMLElement ? element : undefined
  }
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
