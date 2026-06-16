import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { scrollWithSmoothScroll } from '@/composables/useSmoothScroll'
import { createVisibilityObserver } from '@/utils/modernAPIs'

import { useHomeQuickNav } from '../useHomeQuickNav'

const modernApiMocks = vi.hoisted(() => {
  let callback: ((entries: IntersectionObserverEntry[]) => void) | null = null
  const disconnect = vi.fn()
  const observe = vi.fn()

  return {
    createVisibilityObserver: vi.fn(
      (nextCallback: (entries: IntersectionObserverEntry[]) => void) => {
        callback = nextCallback
        return {
          disconnect,
          observe,
        } as unknown as IntersectionObserver
      }
    ),
    disconnect,
    emit(entries: IntersectionObserverEntry[]) {
      callback?.(entries)
    },
    observe,
    reset() {
      callback = null
      disconnect.mockClear()
      observe.mockClear()
      this.createVisibilityObserver.mockClear()
    },
  }
})

vi.mock('@/utils/modernAPIs', () => ({
  createVisibilityObserver: modernApiMocks.createVisibilityObserver,
}))

vi.mock('@/composables/useSmoothScroll', () => ({
  scrollWithSmoothScroll: vi.fn(),
}))

function createSection(id: string, top: number) {
  const element = document.createElement('section')
  element.id = id
  element.dataset.scrollAnchorTop = String(top)
  document.body.appendChild(element)
  return element
}

describe('useHomeQuickNav', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.mocked(scrollWithSmoothScroll).mockClear()
    modernApiMocks.reset()
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('updates the persisted quick-nav side through the provided setter', () => {
    const setHomeQuickNavSide = vi.fn()
    const quickNav = useHomeQuickNav({
      setHomeQuickNavSide,
      shouldAnimate: ref(true),
    })

    quickNav.updateHomeQuickNavSide('left')

    expect(setHomeQuickNavSide).toHaveBeenCalledWith('left')
  })

  it('observes configured home sections and selects the most visible section', () => {
    const quickNav = useHomeQuickNav({
      setHomeQuickNavSide: vi.fn(),
      shouldAnimate: ref(true),
    })
    const fold = createSection('home-fold', 0)
    const rail = createSection('home-rail', 200)

    quickNav.observeHomeSections()

    expect(createVisibilityObserver).toHaveBeenCalledWith(expect.any(Function), {
      rootMargin: '-18% 0% -18% 0%',
      threshold: [0.2, 0.35, 0.55, 0.75],
    })
    expect(modernApiMocks.observe).toHaveBeenCalledWith(fold)
    expect(modernApiMocks.observe).toHaveBeenCalledWith(rail)

    modernApiMocks.emit([
      {
        intersectionRatio: 0.2,
        isIntersecting: true,
        target: fold,
      } as IntersectionObserverEntry,
      {
        intersectionRatio: 0.8,
        isIntersecting: true,
        target: rail,
      } as IntersectionObserverEntry,
    ])

    expect(quickNav.activeHomeSectionId.value).toBe('home-rail')
  })

  it('scrolls to a known section using the current animation preference', () => {
    const quickNav = useHomeQuickNav({
      setHomeQuickNavSide: vi.fn(),
      shouldAnimate: ref(false),
    })
    createSection('home-rail', 240)

    quickNav.scrollToHomeSection('home-rail')

    expect(quickNav.activeHomeSectionId.value).toBe('home-rail')
    expect(scrollWithSmoothScroll).toHaveBeenCalledWith(240, {
      immediate: true,
    })
  })

  it('disconnects the current observer before observing a fresh section set', () => {
    const quickNav = useHomeQuickNav({
      setHomeQuickNavSide: vi.fn(),
      shouldAnimate: ref(true),
    })
    createSection('home-fold', 0)

    quickNav.observeHomeSections()
    quickNav.observeHomeSections()

    expect(modernApiMocks.disconnect).toHaveBeenCalledTimes(1)
  })
})
