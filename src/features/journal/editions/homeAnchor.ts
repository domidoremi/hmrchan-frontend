import { onBeforeUnmount } from 'vue'
import { createResizeObserver } from '@/utils/modernAPIs'
import { scrollHomeTo } from './useHomeScroll'

/** Keep a requested chapter aligned while preceding images finish their layout. */
export function followHomeAnchor(target: HTMLElement, offset: number, smooth: boolean) {
  const lifetime = new AbortController()
  let position = Number.NaN
  let resize: ResizeObserver | null = null
  let settle: ReturnType<typeof setTimeout> | undefined

  function stop() {
    lifetime.abort()
    resize?.disconnect()
    clearTimeout(settle)
    clearTimeout(limit)
  }

  function align() {
    if (lifetime.signal.aborted || !target.isConnected) return
    const next = Math.max(0, scrollY + target.getBoundingClientRect().top - offset)
    if (Math.abs(position - next) <= 1) return
    clearTimeout(settle)
    position = next
    scrollHomeTo(next, smooth)
  }

  const limit = setTimeout(stop, 4000)
  const options = { passive: true, signal: lifetime.signal }
  for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown'])
    window.addEventListener(event, stop, options)
  window.addEventListener(
    'scrollend',
    () => {
      clearTimeout(settle)
      settle = setTimeout(stop, 450)
    },
    options
  )
  resize = createResizeObserver(align)
  const home = target.closest('.immersive-home')
  if (home) resize?.observe(home)
  home?.querySelectorAll('.chapter-content').forEach((content) => resize?.observe(content))
  align()
  return stop
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
    const header = target.closest('.journal-shell')?.querySelector('.edition-header')
    const headerOffset = header
      ? header.getBoundingClientRect().height +
        (Number.parseFloat(getComputedStyle(header).top) || 0)
      : 0
    onNavigate?.()
    target.focus({ preventScroll: true })
    stopFollowing?.()
    stopFollowing = followHomeAnchor(
      target,
      headerOffset,
      document.body.dataset['motion'] === 'full'
    )
  }
}
