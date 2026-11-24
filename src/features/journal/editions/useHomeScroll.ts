import { onBeforeUnmount, onMounted } from 'vue'
import type Lenis from 'lenis'

let active: Lenis | undefined

export function scrollHomeTo(top: number, smooth = false) {
  if (active) active.scrollTo(top, { immediate: !smooth })
  else window.scrollTo({ top, behavior: smooth ? 'smooth' : 'instant' })
}

export function useHomeScroll() {
  const lifetime = new AbortController()
  let request = 0
  let instance: Lenis | undefined
  let observer: MutationObserver | undefined
  let mounted = false
  function destroy() {
    if (active === instance) active = undefined
    instance?.destroy()
    instance = undefined
  }
  function lock() {
    if (document.hidden || document.querySelector('dialog[open]')) instance?.stop()
    else instance?.start()
  }
  async function sync() {
    const id = ++request
    if (document.body.dataset['motion'] !== 'full' || innerHeight < 500) {
      destroy()
      return
    }
    if (instance || typeof ResizeObserver === 'undefined') return
    try {
      const { default: SmoothScroll } = await import('lenis')
      if (!mounted || id !== request) return
      instance = new SmoothScroll({
        autoRaf: true,
        lerp: 0.13,
        syncTouch: false,
        respectReducedMotion: false,
        prevent: (node) =>
          Boolean(node.closest('dialog, input, textarea, select, [data-lenis-prevent]')),
        virtualScroll: ({ event, deltaX, deltaY }) =>
          !event.defaultPrevented &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey &&
          !event.metaKey &&
          Math.abs(deltaY) >= Math.abs(deltaX),
      })
      active = instance
      lock()
    } catch {
      // Native document scroll remains available if the optional smoothing chunk fails.
    }
  }
  onMounted(() => {
    mounted = true
    const options = { passive: true, signal: lifetime.signal }
    document.addEventListener('journalmotionchange', sync, options)
    document.addEventListener('visibilitychange', lock, options)
    window.addEventListener('resize', sync, options)
    observer = new MutationObserver(lock)
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] })
    void sync()
  })
  onBeforeUnmount(() => {
    mounted = false
    request++
    lifetime.abort()
    observer?.disconnect()
    destroy()
  })
}
