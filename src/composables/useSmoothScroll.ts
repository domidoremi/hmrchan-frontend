import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'
import Lenis from 'lenis'
import type { AnimationIntensity } from '@/stores/settings'
import { prefersReducedMotion } from '@/utils/performance'

type SmoothScrollMode = 'disabled' | 'reduced' | 'normal'

interface ScrollToOptions {
  offset?: number
  immediate?: boolean
  lock?: boolean
}

let lenis: Lenis | null = null
let rafHandle: number | null = null
let scrollTriggerCleanup: (() => void) | null = null
let activeMode: SmoothScrollMode = 'disabled'

function isMotionDisabled(
  enableAnimations: boolean,
  animationIntensity: AnimationIntensity
): boolean {
  return !enableAnimations || animationIntensity === 'none' || prefersReducedMotion()
}

function resolveMode(
  enableAnimations: boolean,
  animationIntensity: AnimationIntensity
): SmoothScrollMode {
  if (isMotionDisabled(enableAnimations, animationIntensity)) return 'disabled'
  return animationIntensity === 'reduced' ? 'reduced' : 'normal'
}

function nativeScrollTo(target: number | string | HTMLElement, options: ScrollToOptions = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const behavior: ScrollBehavior = options.immediate ? 'auto' : 'smooth'
  const offset = options.offset ?? 0

  if (typeof target === 'number') {
    window.scrollTo({ top: Math.max(target + offset, 0), behavior })
    return
  }

  const element = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target

  if (!element) return

  const top = element.getBoundingClientRect().top + window.scrollY + offset
  window.scrollTo({ top: Math.max(top, 0), behavior })
}

async function bindScrollTrigger(nextLenis: Lenis) {
  if (typeof window === 'undefined') return

  const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ])

  gsap.registerPlugin(ScrollTrigger)

  const onScroll = () => ScrollTrigger.update()
  const onTick = (time: number) => {
    nextLenis.raf(time * 1000)
  }

  cancelRafLoop()
  nextLenis.on('scroll', onScroll)
  gsap.ticker.add(onTick)
  gsap.ticker.lagSmoothing(0)

  scrollTriggerCleanup = () => {
    nextLenis.off('scroll', onScroll)
    gsap.ticker.remove(onTick)
    scrollTriggerCleanup = null
  }
}

function startFallbackRafLoop(nextLenis: Lenis) {
  if (typeof window === 'undefined') return

  cancelRafLoop()

  const raf = (time: number) => {
    nextLenis.raf(time)
    rafHandle = window.requestAnimationFrame(raf)
  }

  rafHandle = window.requestAnimationFrame(raf)
}

function cancelRafLoop() {
  if (typeof window === 'undefined' || rafHandle === null) return
  window.cancelAnimationFrame(rafHandle)
  rafHandle = null
}

function destroyLenis() {
  cancelRafLoop()
  scrollTriggerCleanup?.()
  scrollTriggerCleanup = null
  lenis?.destroy()
  lenis = null
  activeMode = 'disabled'
  if (typeof document !== 'undefined') {
    document.documentElement.removeAttribute('data-smooth-scroll')
  }
}

function startLenis(mode: Exclude<SmoothScrollMode, 'disabled'>) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  destroyLenis()

  const nextLenis = new Lenis({
    autoRaf: false,
    smoothWheel: true,
    syncTouch: false,
    lerp: mode === 'reduced' ? 0.14 : 0.1,
    duration: mode === 'reduced' ? 1 : 1.2,
    wheelMultiplier: mode === 'reduced' ? 0.92 : 1,
    touchMultiplier: 1,
    overscroll: true,
    prevent: (node) =>
      Boolean(
        node?.closest(
          '[data-lenis-prevent], [data-scrollable], .settings-dropdown, .user-dropdown, .settings-panel, .dialog-body, .modal-body, .dropdown-menu, .popover-content'
        )
      ),
  })

  lenis = nextLenis
  activeMode = mode
  document.documentElement.dataset.smoothScroll = mode
  startFallbackRafLoop(nextLenis)
  void bindScrollTrigger(nextLenis).catch(() => {
    startFallbackRafLoop(nextLenis)
  })
}

export function scrollWithSmoothScroll(
  target: number | string | HTMLElement,
  options: ScrollToOptions = {}
) {
  if (!lenis || activeMode === 'disabled') {
    nativeScrollTo(target, options)
    return
  }

  lenis.scrollTo(target, {
    offset: options.offset ?? 0,
    immediate: options.immediate ?? false,
    lock: options.lock ?? false,
  })
}

export function stopSmoothScroll() {
  lenis?.stop()
}

export function startSmoothScroll() {
  lenis?.start()
}

export function useSmoothScroll(
  enableAnimations: Ref<boolean>,
  animationIntensity: Ref<AnimationIntensity>
) {
  const sync = () => {
    const nextMode = resolveMode(enableAnimations.value, animationIntensity.value)
    if (nextMode === activeMode) return

    if (nextMode === 'disabled') {
      destroyLenis()
      return
    }

    startLenis(nextMode)
  }

  onMounted(sync)

  watch([enableAnimations, animationIntensity], sync, {
    immediate: true,
  })

  onBeforeUnmount(() => {
    destroyLenis()
  })

  return {
    scrollTo: scrollWithSmoothScroll,
    stop: stopSmoothScroll,
    start: startSmoothScroll,
  }
}
