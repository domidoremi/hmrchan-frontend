import { computed, type ComputedRef } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

import type { HmrPublicPageKey } from '@/hmr/types'
import type { HmrAppearancePresetSceneRole } from '@/stores/theme'

export type HmrSceneRole = 'narrative' | 'immersive' | 'discussion' | 'productivity' | 'editorial'
export type HmrPresetSceneFit = 'native' | 'adaptive'

const narrativePageKeys = new Set<HmrPublicPageKey>(['home', 'about', 'contact', 'join', 'thanks'])
const immersivePageKeys = new Set<HmrPublicPageKey>(['explore', 'post'])
const discussionPageKeys = new Set<HmrPublicPageKey>(['community'])
const productivityPageKeys = new Set<HmrPublicPageKey>(['schedule', 'settings'])
const editorialPageKeys = new Set<HmrPublicPageKey>([
  'login',
  'register',
  'auth-callback',
  'passkey-recovery',
  'profile',
  'not-found',
])

function resolveSceneRoleByPageKey(pageKey: HmrPublicPageKey | undefined): HmrSceneRole | null {
  if (!pageKey) return null
  if (narrativePageKeys.has(pageKey)) return 'narrative'
  if (immersivePageKeys.has(pageKey)) return 'immersive'
  if (discussionPageKeys.has(pageKey)) return 'discussion'
  if (productivityPageKeys.has(pageKey)) return 'productivity'
  if (editorialPageKeys.has(pageKey)) return 'editorial'
  return null
}

export function resolveHmrSceneRole(route: {
  name?: unknown
  path?: string | null | undefined
  meta?: {
    pageKey?: HmrPublicPageKey
  }
}): HmrSceneRole {
  const roleByPageKey = resolveSceneRoleByPageKey(route.meta?.pageKey)
  if (roleByPageKey) return roleByPageKey

  const routeName = typeof route.name === 'string' ? route.name : ''
  const routePath = route.path ?? ''

  if (routeName.includes('community') || routePath.startsWith('/community')) return 'discussion'
  if (routeName.includes('schedule') || routePath.startsWith('/schedule')) return 'productivity'
  if (
    routeName.includes('explore') ||
    routeName.includes('post') ||
    routePath.startsWith('/explore') ||
    routePath.startsWith('/posts')
  ) {
    return 'immersive'
  }
  if (
    routeName.includes('login') ||
    routeName.includes('register') ||
    routeName.includes('auth') ||
    routeName.includes('profile') ||
    routePath.startsWith('/login') ||
    routePath.startsWith('/register') ||
    routePath.startsWith('/auth') ||
    routePath.startsWith('/profile')
  ) {
    return 'editorial'
  }

  return 'narrative'
}

export function useHmrSceneRole(route: RouteLocationNormalizedLoaded): ComputedRef<HmrSceneRole> {
  return computed(() => resolveHmrSceneRole(route))
}

export function resolveHmrPresetSceneFit(
  sceneRole: HmrSceneRole,
  presetSceneRoles: readonly HmrAppearancePresetSceneRole[]
): HmrPresetSceneFit {
  return presetSceneRoles.includes(sceneRole) ? 'native' : 'adaptive'
}
