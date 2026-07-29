import { computed } from 'vue'
import { useRoute, type RouteLocationRaw } from 'vue-router'
import {
  navigationItems,
  getDesktopNavigationItems,
  getMobileNavigationItems,
  getIconSize,
} from '@/config/navigation'
import type { NavigationItem, PrefetchFunction } from '@/config/navigation'
import { useAuthSurface } from '@/services/authSurface'

const prefetchFunctions: Partial<Record<PrefetchFunction, () => void>> = {}

const prefetchFlags: Record<string, boolean> = {}

export function registerPrefetchFunction(name: PrefetchFunction, fn: () => void) {
  prefetchFunctions[name] = fn
}

export function executePrefetch(fnName?: PrefetchFunction) {
  if (!fnName || prefetchFlags[fnName]) return

  const fn = prefetchFunctions[fnName]
  if (fn) {
    prefetchFlags[fnName] = true
    fn()
  }
}

export function useNavigation() {
  const route = useRoute()
  const { isAuthenticated } = useAuthSurface()

  const desktopNavItems = computed(() => getDesktopNavigationItems(isAuthenticated.value))

  const mobileNavItems = computed(() => getMobileNavigationItems())

  const allNavItems = computed(() => navigationItems)

  const activeDesktopIndex = computed(() => {
    const currentPath = route.path
    return desktopNavItems.value.findIndex((item) => {
      if (item.path === '/') return currentPath === '/'
      return currentPath === item.path || currentPath.startsWith(item.path + '/')
    })
  })

  const activeMobileIndex = computed(() => {
    const currentPath = route.path
    return mobileNavItems.value.findIndex((item) => {
      if (item.path === '/') return currentPath === '/'
      return currentPath === item.path || currentPath.startsWith(item.path + '/')
    })
  })

  function getNavigationLink(item: NavigationItem | string): string | RouteLocationRaw {
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

  const favoritesLink = computed<string | RouteLocationRaw>(() =>
    getNavigationLink({ path: '/profile/favorites', requiresAuth: true } as NavigationItem)
  )

  function handlePrefetch(item: NavigationItem) {
    if (item.prefetchFn) {
      executePrefetch(item.prefetchFn)
    }
  }

  return {
    desktopNavItems,
    mobileNavItems,
    allNavItems,

    activeDesktopIndex,
    activeMobileIndex,

    getNavigationLink,
    favoritesLink,
    getIconSize,
    handlePrefetch,
    executePrefetch,
  }
}
