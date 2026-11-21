import { onBeforeUnmount, onMounted, onUpdated, type Ref } from 'vue'
import { createResizeObserver } from '@/utils/modernAPIs'

export function useReadingAside(aside: Ref<HTMLElement | undefined>) {
  let resize: ResizeObserver | null = null
  let queued = false
  const lifetime = new AbortController()

  function measure() {
    const element = aside.value
    if (!element) return
    const header = element.closest('.journal-shell')?.querySelector<HTMLElement>('.edition-header')
    const gutter = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) * 1.25
    const top =
      (header?.offsetHeight ?? 0) +
      (header ? Number.parseFloat(getComputedStyle(header).top) || 0 : 0) +
      gutter
    const fits = innerWidth > 800 && element.offsetHeight + top + gutter <= innerHeight
    element.style.setProperty('--reading-aside-top', `${top}px`)
    element.dataset['readingSticky'] = String(fits)
  }

  function schedule() {
    if (queued) return
    queued = true
    queueMicrotask(() => {
      queued = false
      if (!lifetime.signal.aborted) measure()
    })
  }

  onMounted(() => {
    if (!aside.value) return
    resize = createResizeObserver(schedule)
    resize?.observe(aside.value)
    const header = aside.value.closest('.journal-shell')?.querySelector('.edition-header')
    if (header) resize?.observe(header)
    window.addEventListener('resize', schedule, { passive: true, signal: lifetime.signal })
    measure()
  })
  onUpdated(schedule)
  onBeforeUnmount(() => {
    lifetime.abort()
    resize?.disconnect()
  })
}
