import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { HmrBrandSpriteState } from '@/hmr/components/HmrBrandSprite.vue'
import { usePreferencesStore } from '@/stores/preferences'

export function useHmrBrandPet() {
  const preferences = usePreferencesStore()
  const brandState = ref<HmrBrandSpriteState>('idle')
  const reducedMotion = ref(false)
  const staticMode = computed(() => !preferences.animationsAllowed || reducedMotion.value)
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
      setBrandState('review', 1800, 12000)
      scheduleIdleReview()
    }, delay)
  }

  function waveBrandPet(): void {
    setBrandState('waving', 900, 650)
  }

  function jumpBrandPet(): void {
    setBrandState('jumping', 760, 900)
  }

  function setupBrandPet(): void {
    preferences.initializePreferences()
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
