/**
 * 导航配置
 * 统一管理桌面端和移动端的导航菜单结构
 */

import type { Component } from 'vue'
import { Home, Compass, Heart, Users, MessageSquare, CalendarDays, Info } from '@lucide/vue'

/** 预加载函数类型 */
export type PrefetchFunction =
  | 'prefetchExplorePage'
  | 'prefetchFavoritesPage'
  | 'prefetchAuthorsPage'
  | 'prefetchCommunityPage'

/** 默认图标尺寸 */
export const DEFAULT_ICON_SIZES = {
  desktop: 18,
  mobile: 20,
} as const

export interface NavigationItem {
  /** 路由路径 */
  path: string
  /** 国际化键名 */
  i18nKey: string
  /** 图标组件 */
  icon: Component
  /** 是否需要认证 */
  requiresAuth?: boolean
  /** 预加载函数名称 */
  prefetchFn?: PrefetchFunction
  /** 桌面端图标大小 @default 18 */
  desktopIconSize?: number
  /** 移动端图标大小 @default 20 */
  mobileIconSize?: number
  /** 是否显示未读标识 */
  showBadge?: boolean
  /** 是否在移动端显示 @default true */
  showOnMobile?: boolean
  /** 是否在桌面端显示 @default true */
  showOnDesktop?: boolean
}

/**
 * 主导航菜单配置
 * 桌面端和移动端共享此配置
 */
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
    path: '/favorites',
    i18nKey: 'nav.favorites',
    icon: Heart,
    requiresAuth: true,
    prefetchFn: 'prefetchFavoritesPage',
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
    showOnMobile: false, // 移动端不显示关于页面
  },
]

/**
 * 获取桌面端导航项
 * 桌面端会隐藏未认证用户的受保护路由
 */
export function getDesktopNavigationItems(isAuthenticated: boolean): NavigationItem[] {
  return navigationItems.filter((item) => {
    if (item.showOnDesktop === false) return false
    if (item.requiresAuth && !isAuthenticated) return false
    return true
  })
}

/**
 * 获取移动端导航项
 * 移动端显示所有项目，受保护路由会在点击时重定向到登录页
 */
export function getMobileNavigationItems(): NavigationItem[] {
  return navigationItems.filter((item) => item.showOnMobile !== false)
}

/**
 * 获取导航项的图标尺寸
 */
export function getIconSize(item: NavigationItem, platform: 'desktop' | 'mobile'): number {
  return platform === 'desktop'
    ? (item.desktopIconSize ?? DEFAULT_ICON_SIZES.desktop)
    : (item.mobileIconSize ?? DEFAULT_ICON_SIZES.mobile)
}
