import { onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue'

type HomeScrollPerformanceOptions = {
  onScrollStart: () => void
  onScrollIdle: () => void
  idleDelayMs?: number
}

export function useHomeScrollPerformance(options: HomeScrollPerformanceOptions) {
  const active = ref(false)
  const idleDelayMs = options.idleDelayMs ?? 120
  let idleTimer: number | null = null
  let bound = false

  const clearIdleTimer = () => {
    if (typeof window === 'undefined' || idleTimer === null) return
    window.clearTimeout(idleTimer)
    idleTimer = null
  }

  const handleScroll = () => {
    if (typeof window === 'undefined') return
    if (!active.value) {
      active.value = true
      options.onScrollStart()
    }
    clearIdleTimer()
    idleTimer = window.setTimeout(() => {
      idleTimer = null
      active.value = false
      options.onScrollIdle()
    }, idleDelayMs)
  }

  const bind = () => {
    if (typeof window === 'undefined' || bound) return
    bound = true
    window.addEventListener('scroll', handleScroll, { passive: true })
  }

  const unbind = () => {
    if (typeof window === 'undefined' || !bound) return
    bound = false
    window.removeEventListener('scroll', handleScroll)
    clearIdleTimer()
    active.value = false
  }

  onMounted(bind)
  onActivated(bind)
  onBeforeUnmount(unbind)
  onDeactivated(unbind)

  return { active }
}
