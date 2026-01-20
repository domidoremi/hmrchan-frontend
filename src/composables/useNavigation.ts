/**
 * 导航 Composable
 * 提供统一的导航逻辑和预加载功能
 */

import { computed } from 'vue'
import { useRoute, type RouteLocationRaw } from 'vue-router'
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
   * @param item - 导航项或路径字符串
   * @returns 路由位置（字符串或对象）
   */
  function getNavigationLink(item: NavigationItem | string) {
    // 支持直接传入路径字符串
    const path = typeof item === 'string' ? item : item.path
    const requiresAuth = typeof item === 'string' ? false : item.requiresAuth

    if (requiresAuth && !isAuthenticated.value) {
      return {
        path: '/login',
        query: { redirect: path },
      }
    }
    return path
  }

  /**
   * 获取收藏页链接（处理认证重定向）
   * 便捷方法，用于需要认证的收藏页
   */
  const favoritesLink = computed(() =>
    getNavigationLink({ path: '/favorites', requiresAuth: true } as NavigationItem)
  )

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
    favoritesLink,
    getIconSize,
    handlePrefetch,
    executePrefetch,
  }
}
