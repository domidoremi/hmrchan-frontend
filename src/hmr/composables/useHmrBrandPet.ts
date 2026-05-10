import { onBeforeUnmount, onMounted, type Ref } from 'vue'

type BrandPetPointer = {
  x: number
  y: number
}

export function useHmrBrandPet(petRefs: Array<Ref<HTMLElement | null>>) {
  let animationFrame: number | undefined
  let resetTimer: number | undefined
  let pounceTimer: number | undefined
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

  function resetElement(element: HTMLElement): void {
    element.style.setProperty('--hmr-pet-x', '0rem')
    element.style.setProperty('--hmr-pet-y', '0rem')
    element.style.setProperty('--hmr-pet-rotate-x', '0deg')
    element.style.setProperty('--hmr-pet-rotate-y', '0deg')
    element.style.setProperty('--hmr-pet-rotate-z', '0deg')
    element.style.setProperty('--hmr-pet-scale', '1')
    element.style.setProperty('--hmr-pet-look-x', '0rem')
    element.style.setProperty('--hmr-pet-look-y', '0rem')
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
    if (!pointer || motionQuery?.matches) return

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

      element.style.setProperty('--hmr-pet-x', `${(normalizedX * 0.34 * attention).toFixed(3)}rem`)
      element.style.setProperty('--hmr-pet-y', `${(normalizedY * 0.24 * attention).toFixed(3)}rem`)
      element.style.setProperty(
        '--hmr-pet-rotate-x',
        `${(-normalizedY * 10 * attention).toFixed(2)}deg`
      )
      element.style.setProperty(
        '--hmr-pet-rotate-y',
        `${(normalizedX * 14 * attention).toFixed(2)}deg`
      )
      element.style.setProperty(
        '--hmr-pet-rotate-z',
        `${(-normalizedX * 3.5 * attention).toFixed(2)}deg`
      )
      element.style.setProperty('--hmr-pet-scale', `${(1 + attention * 0.014).toFixed(3)}`)
      element.style.setProperty(
        '--hmr-pet-look-x',
        `${(normalizedX * 0.16 * attention).toFixed(3)}rem`
      )
      element.style.setProperty(
        '--hmr-pet-look-y',
        `${(normalizedY * 0.12 * attention).toFixed(3)}rem`
      )
      element.classList.add('is-tracking')
    })
  }

  function handlePointerMove(event: PointerEvent): void {
    if (motionQuery?.matches) return

    pointer = { x: event.clientX, y: event.clientY }
    scheduleReset()
    if (animationFrame !== undefined) return

    animationFrame = window.requestAnimationFrame(applyFollow)
  }

  function pounceBrandPet(): void {
    if (motionQuery?.matches) return

    const visibleElements = getVisibleElements()
    visibleElements.forEach((element) => {
      element.classList.remove('is-pouncing')
      void element.offsetWidth
      element.classList.add('is-pouncing')
    })

    if (pounceTimer !== undefined) {
      window.clearTimeout(pounceTimer)
    }
    pounceTimer = window.setTimeout(() => {
      getElements().forEach((element) => {
        element.classList.remove('is-pouncing')
      })
    }, 680)
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
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    motionQueryListener = (event) => {
      if (event.matches) {
        removeListeners()
        resetBrandPet()
        return
      }
      addListeners()
    }
    motionQuery.addEventListener('change', motionQueryListener)

    if (!motionQuery.matches) {
      addListeners()
    }
  }

  function teardownBrandPet(): void {
    removeListeners()
    if (motionQuery && motionQueryListener) {
      motionQuery.removeEventListener('change', motionQueryListener)
    }
    if (pounceTimer !== undefined) {
      window.clearTimeout(pounceTimer)
      pounceTimer = undefined
    }
    resetBrandPet()
  }

  onMounted(setupBrandPet)
  onBeforeUnmount(teardownBrandPet)

  return {
    pounceBrandPet,
  }
}
