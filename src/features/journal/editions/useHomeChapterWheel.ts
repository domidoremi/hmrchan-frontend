import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import { scrollHomeTo } from './useHomeScroll'
import { verticalWheelDelta } from './wheelRegion'

function chapterDestination(chapter: HTMLElement, delta: number) {
  const bounds = chapter.getBoundingClientRect()
  const top = Number.parseFloat(chapter.style.getPropertyValue('--chapter-top'))
  const height = Number.parseFloat(chapter.style.getPropertyValue('--chapter-height'))
  if (height < 360 || !Number.isFinite(top + height)) return
  const forward = delta > 0
  const bottom = top + height
  const inset = Number.parseFloat(chapter.style.getPropertyValue('--chapter-bottom')) || 0
  const visibleBottom = (section: Element) =>
    section.getAttribute('data-chapter') === 'cover' ? bottom + inset : bottom
  const remaining = forward ? bounds.bottom - visibleBottom(chapter) : top - bounds.top
  if (remaining > Math.abs(delta)) return
  const sibling = forward ? chapter.nextElementSibling : chapter.previousElementSibling
  if (!sibling?.classList.contains('immersive-chapter')) return
  if (remaining > 2) return scrollY + Math.sign(delta) * remaining
  const next = sibling.getBoundingClientRect()
  const offset = forward
    ? next.top - top
    : Math.max(next.top - top, next.bottom - visibleBottom(sibling))
  return Math.max(0, scrollY + offset)
}

export function useHomeChapterWheel(home: Ref<HTMLElement | undefined>) {
  const lifetime = new AbortController()
  let lastAt = -Infinity
  let lastDirection = 0
  let accumulated = 0
  let handedOff = false
  let busyUntil = 0

  function wheel(event: WheelEvent) {
    const delta = verticalWheelDelta(event)
    if (!delta || !(event.target instanceof Element) || document.querySelector('dialog[open]'))
      return
    const chapter = event.target.closest<HTMLElement>('.immersive-chapter')
    if (!chapter || chapter.parentElement !== home.value) return
    const now = performance.now()
    const direction = Math.sign(delta)
    if (now - lastAt > 180 || direction !== lastDirection) {
      accumulated = 0
      handedOff = false
    }
    lastAt = now
    lastDirection = direction
    if (now < busyUntil || handedOff) {
      event.preventDefault()
      return
    }
    const destination = chapterDestination(chapter, delta)
    if (destination === undefined) {
      accumulated = 0
      return
    }
    event.preventDefault()
    accumulated += Math.abs(delta)
    if (accumulated < 36) return
    handedOff = true
    const smooth = document.body.dataset['motion'] === 'full'
    busyUntil = now + (smooth ? 420 : 0)
    scrollHomeTo(destination, smooth)
  }

  onMounted(() =>
    home.value?.addEventListener('wheel', wheel, { passive: false, signal: lifetime.signal })
  )
  onBeforeUnmount(() => lifetime.abort())
}
