import { ref, type Ref } from 'vue'

import {
  computeScrollAnchorTop,
  readNavbarVisibleOffset,
  resolveDocumentAnchorTop,
} from '@/components/ui/scrollAnchorTargets'
import { scrollWithSmoothScroll } from '@/composables/useSmoothScroll'
import { homeSectionAnchors, type HomeSectionAnchor } from '@/config/homeSections'
import { createVisibilityObserver } from '@/utils/modernAPIs'

import { resolveHomeActiveSectionId } from './homeScenePolicy'

type HomeQuickNavSide = 'left' | 'right'

type UseHomeQuickNavOptions = {
  setHomeQuickNavSide: (side: HomeQuickNavSide) => void
  shouldAnimate: Readonly<Ref<boolean>>
}

export function useHomeQuickNav({ setHomeQuickNavSide, shouldAnimate }: UseHomeQuickNavOptions) {
  const homeQuickNavAnchors = homeSectionAnchors
  const activeHomeSectionId = ref<HomeSectionAnchor['id']>(homeSectionAnchors[0]?.id ?? 'home-fold')
  let homeSectionObserver: IntersectionObserver | null = null

  function updateHomeQuickNavSide(side: HomeQuickNavSide) {
    setHomeQuickNavSide(side)
  }

  function getHomeSectionElement(id: HomeSectionAnchor['id']): HTMLElement | null {
    if (typeof document === 'undefined') return null
    return document.getElementById(id)
  }

  function disconnectHomeSectionObserver() {
    homeSectionObserver?.disconnect()
    homeSectionObserver = null
  }

  function observeHomeSections() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    disconnectHomeSectionObserver()
    if (typeof window.IntersectionObserver !== 'function') return
    const visibility = new Map<HomeSectionAnchor['id'], number>()
    homeSectionObserver = createVisibilityObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute('id') as HomeSectionAnchor['id'] | null
          if (!id) continue
          visibility.set(id, entry.isIntersecting ? entry.intersectionRatio : 0)
        }
        activeHomeSectionId.value = resolveHomeActiveSectionId({
          anchors: homeQuickNavAnchors,
          currentId: activeHomeSectionId.value,
          visibilityRatios: visibility,
        })
      },
      {
        threshold: [0.2, 0.35, 0.55, 0.75],
        rootMargin: '-18% 0% -18% 0%',
      }
    )
    for (const anchor of homeQuickNavAnchors) {
      const element = getHomeSectionElement(anchor.id)
      if (element) {
        homeSectionObserver.observe(element)
      }
    }
  }

  function scrollToHomeSection(id: HomeSectionAnchor['id']) {
    if (typeof document === 'undefined') return
    const target = getHomeSectionElement(id)
    if (!target) return
    activeHomeSectionId.value = id
    const targetTop = resolveDocumentAnchorTop(target, document)
    const top = computeScrollAnchorTop(targetTop, readNavbarVisibleOffset(document))
    scrollWithSmoothScroll(top, {
      immediate: !shouldAnimate.value,
    })
  }

  return {
    activeHomeSectionId,
    disconnectHomeSectionObserver,
    homeQuickNavAnchors,
    observeHomeSections,
    scrollToHomeSection,
    updateHomeQuickNavSide,
  }
}
