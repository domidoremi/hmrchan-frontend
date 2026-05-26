import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { HmrBrandSpriteState } from '@/hmr/components/HmrBrandSprite.vue'

const idleShowcaseStates: Array<{
  state: HmrBrandSpriteState
  duration: number
  cooldown: number
}> = [
  { state: 'review', duration: 1900, cooldown: 12000 },
  { state: 'waiting', duration: 1700, cooldown: 10000 },
  { state: 'running', duration: 1500, cooldown: 12000 },
  { state: 'waving', duration: 1100, cooldown: 9000 },
]

export function useHmrBrandPet() {
  const brandState = ref<HmrBrandSpriteState>('idle')
  const reducedMotion = ref(false)
  const staticMode = computed(() => reducedMotion.value)
  const cooldowns = new Map<HmrBrandSpriteState, number>()
  let stateTimer: number | undefined
  let idleTimer: number | undefined
  let motionQuery: MediaQueryList | undefined
  let motionQueryListener: ((event: MediaQueryListEvent) => void) | undefined

  function stopStateTimer(): void {
    if (stateTimer === undefined) return
    window.clearTimeout(stateTimer)
    stateTimer = undefined
  }

  function stopIdleTimer(): void {
    if (idleTimer === undefined) return
    window.clearTimeout(idleTimer)
    idleTimer = undefined
  }

  function setBrandState(
    state: HmrBrandSpriteState,
    duration = 900,
    cooldown = 700,
    fallback: HmrBrandSpriteState = 'idle'
  ): void {
    if (staticMode.value) {
      brandState.value = 'idle'
      return
    }

    const now = Date.now()
    const nextAllowedAt = cooldowns.get(state) ?? 0
    if (now < nextAllowedAt && brandState.value === state) return
    cooldowns.set(state, now + cooldown)
    stopStateTimer()
    brandState.value = state
    stateTimer = window.setTimeout(() => {
      brandState.value = fallback
      stateTimer = undefined
    }, duration)
  }

  function scheduleIdleReview(): void {
    stopIdleTimer()
    if (staticMode.value) return

    const delay = 26000 + Math.floor(Math.random() * 12000)
    idleTimer = window.setTimeout(() => {
      const showcaseState =
        idleShowcaseStates[Math.floor(Math.random() * idleShowcaseStates.length)] ??
        idleShowcaseStates[0]
      setBrandState(showcaseState.state, showcaseState.duration, showcaseState.cooldown)
      scheduleIdleReview()
    }, delay)
  }

  function waveBrandPet(): void {
    setBrandState('waving', 1100, 650)
  }

  function jumpBrandPet(): void {
    setBrandState('jumping', 900, 900)
  }

  function setupBrandPet(): void {
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion.value = motionQuery.matches
    motionQueryListener = (event) => {
      reducedMotion.value = event.matches
      if (!event.matches) scheduleIdleReview()
    }
    motionQuery.addEventListener('change', motionQueryListener)

    scheduleIdleReview()
  }

  function teardownBrandPet(): void {
    if (motionQuery && motionQueryListener) {
      motionQuery.removeEventListener('change', motionQueryListener)
    }
    stopStateTimer()
    stopIdleTimer()
  }

  watch(staticMode, (isStatic) => {
    if (isStatic) {
      brandState.value = 'idle'
      stopStateTimer()
      stopIdleTimer()
      return
    }

    scheduleIdleReview()
  })

  onMounted(setupBrandPet)
  onBeforeUnmount(teardownBrandPet)

  return {
    brandState,
    jumpBrandPet,
    staticMode,
    waveBrandPet,
  }
}
