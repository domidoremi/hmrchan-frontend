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
    labelKey: 'home.quickNav.items.fold',
    icon: Home,
  },
  {
    key: 'rail',
    id: 'home-rail',
    labelKey: 'home.quickNav.items.rail',
    icon: Sparkles,
  },
  {
    key: 'posts',
    id: 'home-posts',
    labelKey: 'home.quickNav.items.posts',
    icon: MessagesSquare,
  },
  {
    key: 'media',
    id: 'home-media',
    labelKey: 'home.quickNav.items.media',
    icon: Images,
  },
  {
    key: 'footer',
    id: 'home-footer',
    labelKey: 'home.quickNav.items.footer',
    icon: ChevronsDown,
  },
] as const
