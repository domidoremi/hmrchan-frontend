import type { AppearancePreset, SceneRole } from '@/types'

const APPEARANCE_PRESETS = [
  'minimal-editorial',
  'fluent-soft',
  'material-calm',
  'organic-natural',
  'biophilic-serene',
  'clay-playful',
  'sketch-doodle',
  'gradient-narrative',
] as const satisfies readonly AppearancePreset[]

const ENHANCED_PRESETS = new Set<AppearancePreset>([
  'clay-playful',
  'sketch-doodle',
  'gradient-narrative',
])

const NARRATIVE_ROUTE_NAMES = new Set(['home', 'about', 'contact'])
const PRODUCTIVITY_ROUTE_NAMES = new Set(['schedule', 'schedule-detail'])
const DISCUSSION_ROUTE_NAMES = new Set(['community', 'discussion-detail'])
const EDITORIAL_ROUTE_NAMES = new Set([
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'verify-email',
  'auth-callback',
  'profile',
  'profile-notifications',
  'profile-settings',
  'profile-devices',
])
const IMMERSIVE_ROUTE_NAMES = new Set([
  'explore',
  'search',
  'post-detail',
  'authors',
  'author-detail',
  'user-public-profile',
  'favorites',
])

export const DEFAULT_APPEARANCE_PRESET: AppearancePreset = 'minimal-editorial'

export function isAppearancePreset(value: string | null | undefined): value is AppearancePreset {
  return typeof value === 'string' && APPEARANCE_PRESETS.includes(value as AppearancePreset)
}

export function normalizeAppearancePreset(value: string | null | undefined): AppearancePreset {
  return isAppearancePreset(value) ? value : DEFAULT_APPEARANCE_PRESET
}

export function getAppearancePresets(): readonly AppearancePreset[] {
  return APPEARANCE_PRESETS
}

export function presetUsesEnhancer(preset: AppearancePreset): boolean {
  return ENHANCED_PRESETS.has(preset)
}

export function resolveSceneRole(route: {
  name?: unknown
  path?: string | null | undefined
}): SceneRole {
  const routeName = typeof route.name === 'string' ? route.name : ''
  const routePath = route.path ?? ''

  if (EDITORIAL_ROUTE_NAMES.has(routeName)) return 'editorial'
  if (PRODUCTIVITY_ROUTE_NAMES.has(routeName)) return 'productivity'
  if (DISCUSSION_ROUTE_NAMES.has(routeName)) return 'discussion'
  if (NARRATIVE_ROUTE_NAMES.has(routeName)) return 'narrative'
  if (IMMERSIVE_ROUTE_NAMES.has(routeName)) return 'immersive'

  if (routePath.startsWith('/community') || routePath.startsWith('/discussion')) {
    return 'discussion'
  }

  if (routePath.startsWith('/schedule')) {
    return 'productivity'
  }

  if (
    routePath.startsWith('/login') ||
    routePath.startsWith('/register') ||
    routePath.startsWith('/forgot-password') ||
    routePath.startsWith('/reset-password') ||
    routePath.startsWith('/profile')
  ) {
    return 'editorial'
  }

  if (
    routePath.startsWith('/explore') ||
    routePath.startsWith('/search') ||
    routePath.startsWith('/post') ||
    routePath.startsWith('/author') ||
    routePath.startsWith('/users')
  ) {
    return 'immersive'
  }

  return 'editorial'
}
