import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import { followHomeChapter } from './homeAnchor'
import { verticalWheelDelta } from './wheelRegion'
import { useHomeChapterSettle } from './useHomeChapterSettle'

function chapterDestination(chapter: HTMLElement, delta: number) {
  const bounds = chapter.getBoundingClientRect()
  const top = Number.parseFloat(chapter.style.getPropertyValue('--chapter-top'))
  const height = Number.parseFloat(
    chapter.style.getPropertyValue('--chapter-viewport') ||
      chapter.style.getPropertyValue('--chapter-height')
  )
  if (height < 360 || !Number.isFinite(top + height)) return
  const forward = delta > 0
  const bottom = top + height
  const inset = Number.parseFloat(chapter.style.getPropertyValue('--chapter-bottom')) || 0
  const visibleBottom = (section: Element) =>
    section.getAttribute('data-chapter') === 'cover' ? bottom + inset : bottom
  if (forward && bounds.top > top + 2 && bounds.top < top + height * 0.6)
    return { target: chapter, end: false }
  const remaining = forward ? bounds.bottom - visibleBottom(chapter) : top - bounds.top
  if (remaining > Math.abs(delta)) return
  const sibling = forward ? chapter.nextElementSibling : chapter.previousElementSibling
  if (!sibling?.classList.contains('immersive-chapter')) return
  return { target: sibling as HTMLElement, end: !forward }
}

export function useHomeChapterWheel(home: Ref<HTMLElement | undefined>) {
  const lifetime = new AbortController()
  const nativeInput = useHomeChapterSettle(home)
  let stopFollowing: (() => void) | undefined
  let lastAt = -Infinity
  let lastDirection = 0
  let accumulated = 0
  let handedOff = false
  let busyUntil = 0

  function wheel(event: WheelEvent) {
    const delta = verticalWheelDelta(event)
    if (
      !delta ||
      !(event.target instanceof Element) ||
      document.querySelector('dialog[open]') ||
      window.getSelection()?.isCollapsed === false
    )
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
      nativeInput()
      return
    }
    event.preventDefault()
    accumulated += Math.abs(delta)
    if (accumulated < 36) return
    handedOff = true
    const smooth = document.body.dataset['motion'] === 'full'
    busyUntil = now + (smooth ? 420 : 0)
    stopFollowing?.()
    stopFollowing = followHomeChapter(destination.target, destination.end, event)
  }

  onMounted(() =>
    home.value?.addEventListener('wheel', wheel, { passive: false, signal: lifetime.signal })
  )
  onBeforeUnmount(() => {
    lifetime.abort()
    stopFollowing?.()
  })
}
