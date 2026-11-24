import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import { createResizeObserver, createVisibilityObserver } from '@/utils/modernAPIs'
import { cancelHomeFrame, queueHomeFrame } from './homeFrame'

export function useAtmosphereScroll(host: Ref<HTMLElement | null>) {
  const lifetime = new AbortController()
  let size: ResizeObserver | null = null
  let visibility: IntersectionObserver | undefined
  let pending = false
  let start = 0
  let range = 1
  let last = -1
  let visible = true

  function update() {
    pending = false
    if (!host.value || !visible || document.hidden || document.body.dataset['motion'] !== 'full')
      return
    const progress = Math.round(Math.min(1, Math.max(0, (scrollY - start) / range)) * 1000) / 1000
    if (progress === last) return
    const target = host.value
    return () => {
      last = progress
      target.style.setProperty('--scene-progress', String(progress))
    }
  }

  function schedule() {
    if (!pending && visible && !document.hidden && document.body.dataset['motion'] === 'full') {
      pending = true
      queueHomeFrame(update)
    }
  }

  function cancel() {
    cancelHomeFrame(update)
    pending = false
  }

  function syncEnvironment() {
    if (document.hidden || document.body.dataset['motion'] !== 'full') {
      cancel()
      if (document.body.dataset['motion'] !== 'full') {
        host.value?.style.removeProperty('--scene-progress')
        last = -1
      }
    } else schedule()
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
        if (visible) schedule()
        else cancel()
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
    document.addEventListener('journalmotionchange', syncEnvironment, options)
    document.addEventListener('visibilitychange', syncEnvironment, options)
  })

  onBeforeUnmount(() => {
    lifetime.abort()
    size?.disconnect()
    visibility?.disconnect()
    cancel()
  })
}
