import type { AppearancePreset, SceneRole } from '@/types'
import { designEdition } from './designEdition'

export interface AppearancePresetSpec {
  preset: AppearancePreset
  sourceDoc: string
  galleryTitle: string
}

const APPEARANCE_PRESETS = [
  'minimal-editorial',
  'fluent-soft',
  'organic-natural',
  'gradient-narrative',
] as const satisfies readonly AppearancePreset[]

const titles: Record<AppearancePreset, string> = {
  'minimal-editorial': 'Paper',
  'fluent-soft': 'Glass',
  'organic-natural': 'Nature',
  'gradient-narrative': 'Spectrum',
}

// Keep stored preferences useful when retiring an older theme.
const LEGACY_PRESETS: Readonly<Record<string, AppearancePreset>> = {
  'material-calm': 'fluent-soft',
  'biophilic-serene': 'organic-natural',
  'clay-playful': 'fluent-soft',
  'sketch-doodle': 'minimal-editorial',
}

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
  'profile-security',
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

export const DEFAULT_APPEARANCE_PRESET: AppearancePreset =
  designEdition === 'archive' ? 'gradient-narrative' : 'minimal-editorial'

export function isAppearancePreset(value: string | null | undefined): value is AppearancePreset {
  return typeof value === 'string' && APPEARANCE_PRESETS.includes(value as AppearancePreset)
}

export function normalizeAppearancePreset(value: string | null | undefined): AppearancePreset {
  if (isAppearancePreset(value)) return value
  return (
    (value && Object.hasOwn(LEGACY_PRESETS, value) ? LEGACY_PRESETS[value] : undefined) ??
    DEFAULT_APPEARANCE_PRESET
  )
}

export function getAppearancePresets(): readonly AppearancePreset[] {
  return APPEARANCE_PRESETS
}

export function getAppearancePresetSpec(preset: AppearancePreset): AppearancePresetSpec {
  return { preset, sourceDoc: 'docs/en/appearance-presets.md', galleryTitle: titles[preset] }
}

export function getAppearancePresetSpecs(): readonly AppearancePresetSpec[] {
  return APPEARANCE_PRESETS.map(getAppearancePresetSpec)
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

  if (routePath.startsWith('/about') || routePath.startsWith('/contact')) {
    return 'narrative'
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
