import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

import type { HmrBrandSpriteState } from '@/hmr/components/HmrBrandSprite.vue'
import { usePreferencesStore } from '@/stores/preferences'

type BrandPetPointer = {
  x: number
  y: number
}

export function useHmrBrandPet(petRefs: Array<Ref<HTMLElement | null>>) {
  const preferences = usePreferencesStore()
  const brandState = ref<HmrBrandSpriteState>('idle')
  const reducedMotion = ref(false)
  const staticMode = computed(() => !preferences.animationsAllowed || reducedMotion.value)
  const cooldowns = new Map<HmrBrandSpriteState, number>()
  let animationFrame: number | undefined
  let resetTimer: number | undefined
  let stateTimer: number | undefined
  let idleTimer: number | undefined
  let motionQuery: MediaQueryList | undefined
  let motionQueryListener: ((event: MediaQueryListEvent) => void) | undefined
  let listenersActive = false
  let pointer: BrandPetPointer | undefined

  function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
  }

  function getElements(): HTMLElement[] {
    return petRefs
      .map((petRef) => petRef.value)
      .filter((element): element is HTMLElement => Boolean(element))
  }

  function getVisibleElements(): HTMLElement[] {
    return getElements().filter((element) => {
      const rect = element.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    })
  }

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

  function resetElement(element: HTMLElement): void {
    element.style.setProperty('--hmr-brand-x', '0rem')
    element.style.setProperty('--hmr-brand-y', '0rem')
    element.style.setProperty('--hmr-brand-rotate-x', '0deg')
    element.style.setProperty('--hmr-brand-rotate-y', '0deg')
    element.style.setProperty('--hmr-brand-rotate-z', '0deg')
    element.style.setProperty('--hmr-brand-scale', '1')
    element.style.setProperty('--hmr-brand-look-x', '0rem')
    element.style.setProperty('--hmr-brand-look-y', '0rem')
    element.classList.remove('is-tracking')
  }

  function resetBrandPet(): void {
    pointer = undefined
    if (animationFrame !== undefined) {
      window.cancelAnimationFrame(animationFrame)
      animationFrame = undefined
    }
    if (resetTimer !== undefined) {
      window.clearTimeout(resetTimer)
      resetTimer = undefined
    }
    getElements().forEach(resetElement)
  }

  function scheduleReset(): void {
    if (resetTimer !== undefined) {
      window.clearTimeout(resetTimer)
    }
    resetTimer = window.setTimeout(() => {
      resetBrandPet()
    }, 1200)
  }

  function applyFollow(): void {
    animationFrame = undefined
    if (!pointer || staticMode.value) return

    const visibleElements = getVisibleElements()
    if (visibleElements.length === 0) return

    const viewportX = Math.max(window.innerWidth * 0.42, 1)
    const viewportY = Math.max(window.innerHeight * 0.42, 1)

    visibleElements.forEach((element) => {
      const rect = element.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const normalizedX = clamp((pointer.x - centerX) / viewportX, -1, 1)
      const normalizedY = clamp((pointer.y - centerY) / viewportY, -1, 1)
      const distance = Math.hypot(normalizedX, normalizedY)
      const attention = clamp(1.14 - distance * 0.52, 0.28, 1)

      element.style.setProperty(
        '--hmr-brand-x',
        `${(normalizedX * 0.34 * attention).toFixed(3)}rem`
      )
      element.style.setProperty(
        '--hmr-brand-y',
        `${(normalizedY * 0.24 * attention).toFixed(3)}rem`
      )
      element.style.setProperty(
        '--hmr-brand-rotate-x',
        `${(-normalizedY * 10 * attention).toFixed(2)}deg`
      )
      element.style.setProperty(
        '--hmr-brand-rotate-y',
        `${(normalizedX * 14 * attention).toFixed(2)}deg`
      )
      element.style.setProperty(
        '--hmr-brand-rotate-z',
        `${(-normalizedX * 3.5 * attention).toFixed(2)}deg`
      )
      element.style.setProperty('--hmr-brand-scale', `${(1 + attention * 0.014).toFixed(3)}`)
      element.style.setProperty(
        '--hmr-brand-look-x',
        `${(normalizedX * 0.16 * attention).toFixed(3)}rem`
      )
      element.style.setProperty(
        '--hmr-brand-look-y',
        `${(normalizedY * 0.12 * attention).toFixed(3)}rem`
      )
      element.classList.add('is-tracking')
    })
  }

  function handlePointerMove(event: PointerEvent): void {
    if (staticMode.value) return

    pointer = { x: event.clientX, y: event.clientY }
    scheduleReset()
    if (animationFrame !== undefined) return

    animationFrame = window.requestAnimationFrame(applyFollow)
  }

  function waveBrandPet(): void {
    setBrandState('waving', 900, 650)
  }

  function jumpBrandPet(): void {
    setBrandState('jumping', 760, 900)
  }

  function addListeners(): void {
    if (listenersActive) return

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('blur', resetBrandPet)
    document.addEventListener('pointerleave', resetBrandPet, { passive: true })
    listenersActive = true
  }

  function removeListeners(): void {
    if (!listenersActive) return

    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('blur', resetBrandPet)
    document.removeEventListener('pointerleave', resetBrandPet)
    listenersActive = false
  }

  function setupBrandPet(): void {
    preferences.initializePreferences()
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion.value = motionQuery.matches
    motionQueryListener = (event) => {
      reducedMotion.value = event.matches
      if (event.matches) {
        removeListeners()
        resetBrandPet()
        return
      }
      addListeners()
      scheduleIdleReview()
    }
    motionQuery.addEventListener('change', motionQueryListener)

    if (!motionQuery.matches) {
      addListeners()
    }
    scheduleIdleReview()
  }

  function teardownBrandPet(): void {
    removeListeners()
    if (motionQuery && motionQueryListener) {
      motionQuery.removeEventListener('change', motionQueryListener)
    }
    stopStateTimer()
    stopIdleTimer()
    resetBrandPet()
  }

  watch(staticMode, (isStatic) => {
    if (isStatic) {
      brandState.value = 'idle'
      removeListeners()
      resetBrandPet()
      stopStateTimer()
      stopIdleTimer()
      return
    }

    addListeners()
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
