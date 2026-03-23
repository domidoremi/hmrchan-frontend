import type { Component } from 'vue'
import { ChevronsDown, Home, Images, MessagesSquare, Sparkles } from 'lucide-vue-next'

export interface HomeSectionAnchor {
  key: 'fold' | 'rail' | 'posts' | 'media' | 'footer'
  id: 'home-fold' | 'home-rail' | 'home-posts' | 'home-media' | 'home-footer'
  labelKey: string
  icon: Component
}

export const homeSectionAnchors: readonly HomeSectionAnchor[] = [
  {
    key: 'fold',
    id: 'home-fold',
    labelKey: 'nav.home',
    icon: Home,
  },
  {
    key: 'rail',
    id: 'home-rail',
    labelKey: 'home.portal.title',
    icon: Sparkles,
  },
  {
    key: 'posts',
    id: 'home-posts',
    labelKey: 'home.latest',
    icon: MessagesSquare,
  },
  {
    key: 'media',
    id: 'home-media',
    labelKey: 'home.featured.title',
    icon: Images,
  },
  {
    key: 'footer',
    id: 'home-footer',
    labelKey: 'common.backToTop',
    icon: ChevronsDown,
  },
] as const
