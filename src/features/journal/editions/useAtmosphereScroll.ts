import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import { createResizeObserver, createVisibilityObserver } from '@/utils/modernAPIs'

export function useAtmosphereScroll(host: Ref<HTMLElement | null>) {
  const lifetime = new AbortController()
  let size: ResizeObserver | null = null
  let visibility: IntersectionObserver | undefined
  let frame = 0
  let start = 0
  let range = 1
  let last = -1
  let visible = true

  function update() {
    frame = 0
    if (!host.value || !visible || document.hidden || document.body.dataset['motion'] !== 'full')
      return
    const progress = Math.round(Math.min(1, Math.max(0, (scrollY - start) / range)) * 1000) / 1000
    if (progress === last) return
    last = progress
    host.value.style.setProperty('--scene-progress', String(progress))
  }

  function schedule() {
    if (!frame && visible && !document.hidden && document.body.dataset['motion'] === 'full')
      frame = requestAnimationFrame(update)
  }

  function measure() {
    if (!host.value) return
    const rect = host.value.getBoundingClientRect()
    start = rect.top + scrollY
    range = Math.max(1, rect.height - innerHeight)
    schedule()
  }

  onMounted(() => {
    if (!host.value) return
    const target = host.value
    const options = { passive: true, signal: lifetime.signal }
    if (typeof IntersectionObserver !== 'undefined') {
      visibility = createVisibilityObserver(([entry]) => {
        visible = Boolean(entry?.isIntersecting)
        target.toggleAttribute('data-scene-away', !visible)
        schedule()
      })
      visibility.observe(target)
    }
    // The CSS timeline needs no scroll listener or layout measurements.
    if (
      window.CSS?.supports('animation-timeline: view()') &&
      CSS.supports('animation-range: contain')
    )
      return
    target.dataset['sceneFallback'] = ''
    size = createResizeObserver(measure)
    size?.observe(target)
    if (target.parentElement) size?.observe(target.parentElement)
    measure()
    window.addEventListener('scroll', schedule, options)
    window.addEventListener('resize', measure, options)
    document.addEventListener('journalmotionchange', schedule, options)
    document.addEventListener('visibilitychange', schedule, options)
  })

  onBeforeUnmount(() => {
    lifetime.abort()
    size?.disconnect()
    visibility?.disconnect()
    cancelAnimationFrame(frame)
  })
}
