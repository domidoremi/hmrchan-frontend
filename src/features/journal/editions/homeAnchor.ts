import { onBeforeUnmount } from 'vue'
import { createResizeObserver } from '@/utils/modernAPIs'
import { scrollHomeTo } from './useHomeScroll'
import { headerInset } from './homeChrome'

/** Keep a requested chapter aligned while preceding images finish their layout. */
export function followHomeAnchor(
  target: HTMLElement,
  offset: number | (() => number),
  smooth: boolean,
  initiatingEvent?: Event
) {
  const lifetime = new AbortController()
  let position = Number.NaN
  let resize: ResizeObserver | null = null

  function stop(event?: Event) {
    if (event && event === initiatingEvent) return
    lifetime.abort()
    resize?.disconnect()
    clearTimeout(limit)
  }

  function align() {
    if (lifetime.signal.aborted || !target.isConnected) return
    const inset = typeof offset === 'function' ? offset() : offset
    const next = Math.max(0, scrollY + target.getBoundingClientRect().top - inset)
    if (Math.abs(position - next) <= 1) return
    position = next
    scrollHomeTo(next, smooth)
  }

  const limit = setTimeout(stop, 4000)
  const options = { passive: true, signal: lifetime.signal }
  for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown'])
    window.addEventListener(event, stop, options)
  document.addEventListener('journalchromechange', align, options)
  resize = createResizeObserver(align)
  const home = target.closest('.immersive-home')
  if (home) resize?.observe(home)
  home?.querySelectorAll('.chapter-content').forEach((content) => resize?.observe(content))
  align()
  return stop
}

export function followHomeChapter(target: HTMLElement, end: boolean, event?: Event) {
  return followHomeAnchor(
    target,
    () => {
      const top = Number.parseFloat(target.style.getPropertyValue('--chapter-top')) || 0
      const height =
        Number.parseFloat(
          target.style.getPropertyValue('--chapter-viewport') ||
            target.style.getPropertyValue('--chapter-height')
        ) || innerHeight
      const inset =
        target.dataset['chapter'] === 'cover'
          ? Number.parseFloat(target.style.getPropertyValue('--chapter-bottom')) || 0
          : 0
      const bounds = target.getBoundingClientRect()
      return end ? Math.min(top, top + height + inset - (bounds.bottom - bounds.top)) : top
    },
    document.body.dataset['motion'] === 'full',
    event
  )
}

export function useHomeSectionJump() {
  let stopFollowing: (() => void) | undefined
  onBeforeUnmount(() => stopFollowing?.())

  return (event: MouseEvent, id: string, onNavigate?: () => void) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return
    const target = document.getElementById(id)
    if (!target) return
    event.preventDefault()
    const header = target.closest('.journal-shell')?.querySelector<HTMLElement>('.edition-header')
    onNavigate?.()
    target.focus({ preventScroll: true })
    stopFollowing?.()
    stopFollowing = followHomeAnchor(
      target,
      () => headerInset(header),
      document.body.dataset['motion'] === 'full'
    )
  }
}
