import type { AppearancePreset, SceneRole } from '@/types'

export type AppearancePresetFamily = 'rounded' | 'sharp'
export type AppearancePresetEnhancer = 'none' | 'clay' | 'sketch' | 'gradient'

export interface AppearancePresetSpec {
  preset: AppearancePreset
  sourceDoc: string
  family: AppearancePresetFamily
  enhancer: AppearancePresetEnhancer
  designIntent: string
  lightMood: string
  darkMood: string
}

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

const APPEARANCE_PRESET_SPECS: Record<AppearancePreset, AppearancePresetSpec> = {
  'minimal-editorial': {
    preset: 'minimal-editorial',
    sourceDoc: 'docs/极简主义.txt',
    family: 'rounded',
    enhancer: 'none',
    designIntent: 'Low-chrome editorial reading with crisp hierarchy and restrained panels.',
    lightMood: 'Warm paper editorial canvas with quiet contrast and minimal decoration.',
    darkMood: 'Charcoal paper reading mode with clear type and understated surfaces.',
  },
  'fluent-soft': {
    preset: 'fluent-soft',
    sourceDoc: 'docs/Fluent 2.txt',
    family: 'rounded',
    enhancer: 'none',
    designIntent: 'System-like productivity surfaces with soft depth and polished panel hierarchy.',
    lightMood: 'Cool neutral mica surfaces with gentle acrylic lift.',
    darkMood: 'Mica charcoal workspace with calm blue highlights and soft depth.',
  },
  'material-calm': {
    preset: 'material-calm',
    sourceDoc: 'docs/Material Design.txt',
    family: 'sharp',
    enhancer: 'none',
    designIntent:
      'Role-driven component system with tonal containers and precise interaction states.',
    lightMood: 'Bright tonal surfaces with clear role colors and structured layers.',
    darkMood: 'Calm tonal dark surfaces with explicit state layers and no glass treatment.',
  },
  'organic-natural': {
    preset: 'organic-natural',
    sourceDoc: 'docs/Natural 自然风格.txt',
    family: 'rounded',
    enhancer: 'none',
    designIntent:
      'Warm natural browsing with soft materials, breathable spacing, and grounded surfaces.',
    lightMood: 'Sand, stone, and moss daylight with warm tactile panels.',
    darkMood: 'Dusk soil and forest surfaces with grounded contrast and low-noise depth.',
  },
  'biophilic-serene': {
    preset: 'biophilic-serene',
    sourceDoc: 'docs/亲生物设计.txt',
    family: 'rounded',
    enhancer: 'none',
    designIntent:
      'Airy biophilic layout with restorative pacing, light-filled sections, and calm controls.',
    lightMood: 'Morning mist and daylight greens with spacious, breathable surfaces.',
    darkMood: 'Greenhouse dusk with soft glow, cool air, and relaxed hierarchy.',
  },
  'clay-playful': {
    preset: 'clay-playful',
    sourceDoc: 'docs/黏土质感.txt',
    family: 'rounded',
    enhancer: 'clay',
    designIntent:
      'Soft volumetric controls with tactile press states and playful low-density browsing.',
    lightMood: 'Pastel clay playground with matte highlights and friendly depth.',
    darkMood: 'Matte pastel night with cushioned surfaces and readable soft contrast.',
  },
  'sketch-doodle': {
    preset: 'sketch-doodle',
    sourceDoc: 'docs/手绘涂鸦.txt',
    family: 'sharp',
    enhancer: 'sketch',
    designIntent:
      'Organized notebook interface with paper structure, ink accents, and hand-drawn warmth.',
    lightMood: 'Notebook paper with ink outlines and tidy annotation energy.',
    darkMood: 'Warm chalk-ink notebook with paper depth and controlled irregularity.',
  },
  'gradient-narrative': {
    preset: 'gradient-narrative',
    sourceDoc: 'docs/滚动叙事.txt',
    family: 'rounded',
    enhancer: 'gradient',
    designIntent:
      'Narrative-first browsing with scene anchors, cinematic surfaces, and guided progression.',
    lightMood: 'Clear blue-violet story canvas with luminous section anchors.',
    darkMood: 'Midnight cinematic gradient with layered story depth and focused accents.',
  },
}

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

export function getAppearancePresetSpec(preset: AppearancePreset): AppearancePresetSpec {
  return APPEARANCE_PRESET_SPECS[preset]
}

export function getAppearancePresetSpecs(): readonly AppearancePresetSpec[] {
  return APPEARANCE_PRESETS.map((preset) => APPEARANCE_PRESET_SPECS[preset])
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
