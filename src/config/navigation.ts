import type { Component } from 'vue'
import { Home, Compass, Heart, Users, MessageSquare, CalendarDays, Info } from '@lucide/vue'

export type PrefetchFunction =
  | 'prefetchExplorePage'
  | 'prefetchFavoritesPage'
  | 'prefetchAuthorsPage'
  | 'prefetchCommunityPage'

export const DEFAULT_ICON_SIZES = {
  desktop: 18,
  mobile: 20,
} as const

export interface NavigationItem {
  path: string

  i18nKey: string

  icon: Component

  requiresAuth?: boolean

  prefetchFn?: PrefetchFunction

  desktopIconSize?: number

  mobileIconSize?: number

  showBadge?: boolean

  showOnMobile?: boolean

  showOnDesktop?: boolean
}

export const navigationItems: NavigationItem[] = [
  {
    path: '/',
    i18nKey: 'nav.home',
    icon: Home,
  },
  {
    path: '/explore',
    i18nKey: 'nav.explore',
    icon: Compass,
    prefetchFn: 'prefetchExplorePage',
  },
  {
    path: '/profile/favorites',
    i18nKey: 'nav.favorites',
    icon: Heart,
    requiresAuth: true,
    prefetchFn: 'prefetchFavoritesPage',
    showOnMobile: false,
  },
  {
    path: '/authors',
    i18nKey: 'nav.authors',
    icon: Users,
    prefetchFn: 'prefetchAuthorsPage',
  },
  {
    path: '/community',
    i18nKey: 'nav.community',
    icon: MessageSquare,
    prefetchFn: 'prefetchCommunityPage',
  },
  {
    path: '/schedule',
    i18nKey: 'nav.schedule',
    icon: CalendarDays,
    showBadge: true,
  },
  {
    path: '/about',
    i18nKey: 'nav.about',
    icon: Info,
  },
]

export function getDesktopNavigationItems(isAuthenticated: boolean): NavigationItem[] {
  return navigationItems.filter((item) => {
    if (item.showOnDesktop === false) return false
    if (item.requiresAuth && !isAuthenticated) return false
    return true
  })
}

export function getMobileNavigationItems(): NavigationItem[] {
  return navigationItems.filter((item) => item.showOnMobile !== false)
}

export function getIconSize(item: NavigationItem, platform: 'desktop' | 'mobile'): number {
  return platform === 'desktop'
    ? (item.desktopIconSize ?? DEFAULT_ICON_SIZES.desktop)
    : (item.mobileIconSize ?? DEFAULT_ICON_SIZES.mobile)
}
