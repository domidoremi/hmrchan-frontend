/**
 * 导航 Composable
 * 提供统一的导航逻辑和预加载功能
 */

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores'
import {
  navigationItems,
  getDesktopNavigationItems,
  getMobileNavigationItems,
  getIconSize,
} from '@/config/navigation'
import type { NavigationItem, PrefetchFunction } from '@/config/navigation'

// 预加载函数映射
const prefetchFunctions: Partial<Record<PrefetchFunction, () => void>> = {}

// 预加载标志
const prefetchFlags: Record<string, boolean> = {}

/**
 * 注册预加载函数
 */
export function registerPrefetchFunction(name: PrefetchFunction, fn: () => void) {
  prefetchFunctions[name] = fn
}

/**
 * 执行预加载
 */
export function executePrefetch(fnName?: PrefetchFunction) {
  if (!fnName || prefetchFlags[fnName]) return

  const fn = prefetchFunctions[fnName]
  if (fn) {
    prefetchFlags[fnName] = true
    fn()
  }
}

/**
 * 导航 Hook
 */
export function useNavigation() {
  const route = useRoute()
  const authStore = useAuthStore()
  const { isAuthenticated } = storeToRefs(authStore)

  // 桌面端导航项
  const desktopNavItems = computed(() => getDesktopNavigationItems(isAuthenticated.value))

  // 移动端导航项
  const mobileNavItems = computed(() => getMobileNavigationItems())

  // 所有导航项
  const allNavItems = computed(() => navigationItems)

  // 当前活跃的导航索引（桌面端）
  const activeDesktopIndex = computed(() => {
    const currentPath = route.path
    return desktopNavItems.value.findIndex((item) => {
      if (item.path === '/') return currentPath === '/'
      return currentPath === item.path || currentPath.startsWith(item.path + '/')
    })
  })

  // 当前活跃的导航索引（移动端）
  const activeMobileIndex = computed(() => {
    const currentPath = route.path
    return mobileNavItems.value.findIndex((item) => {
      if (item.path === '/') return currentPath === '/'
      return currentPath === item.path || currentPath.startsWith(item.path + '/')
    })
  })

  /**
   * 获取导航链接（处理认证重定向）
   */
  function getNavigationLink(item: NavigationItem) {
    if (item.requiresAuth && !isAuthenticated.value) {
      return {
        path: '/login',
        query: { redirect: item.path },
      }
    }
    return item.path
  }

  /**
   * 获取移动端收藏页链接（处理认证重定向）
   */
  const getMobileFavoritesLink = computed(() => {
    if (!isAuthenticated.value) {
      return {
        path: '/login',
        query: { redirect: '/favorites' },
      }
    }
    return '/favorites'
  })

  /**
   * 处理导航项的预加载
   */
  function handlePrefetch(item: NavigationItem) {
    if (item.prefetchFn) {
      executePrefetch(item.prefetchFn)
    }
  }

  return {
    // 导航项
    desktopNavItems,
    mobileNavItems,
    allNavItems,

    // 活跃索引
    activeDesktopIndex,
    activeMobileIndex,

    // 辅助函数
    getNavigationLink,
    getMobileFavoritesLink,
    getIconSize,
    handlePrefetch,
    executePrefetch,
  }
}
