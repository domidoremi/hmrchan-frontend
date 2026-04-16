import type { AppearancePreset, SceneRole } from '@/types'

export type AppearancePresetFamily = 'rounded' | 'sharp'
export type AppearancePresetEnhancer = 'none' | 'clay' | 'sketch' | 'gradient'

export interface AppearancePresetSpec {
  preset: AppearancePreset
  sourceDoc: string
  influences: readonly string[]
  family: AppearancePresetFamily
  enhancer: AppearancePresetEnhancer
  designIntent: string
  galleryTitle: string
  gallerySummary: string
  signatureKeywords: readonly string[]
  surfaceStyle: string
  motionStyle: string
  densityStyle: string
  heroStyle: string
  lightMood: string
  darkMood: string
  mobileMood: string
  sceneRoles: readonly SceneRole[]
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
    influences: ['docs/极简主义.txt'],
    family: 'rounded',
    enhancer: 'none',
    designIntent: 'Low-chrome editorial reading with crisp hierarchy and restrained panels.',
    galleryTitle: 'Editorial Quiet',
    gallerySummary: 'Wide margins, sharper hierarchy, and paper-first reading surfaces.',
    signatureKeywords: ['editorial', 'quiet', 'paper', 'hierarchy'],
    surfaceStyle: 'Paper panels, thin borders, restrained highlights.',
    motionStyle: 'Minimal movement with precise, quick state changes.',
    densityStyle: 'Breathable spacing with strong reading rhythm.',
    heroStyle: 'Typography-led hero with subtle framing instead of spectacle.',
    lightMood: 'Warm paper editorial canvas with quiet contrast and minimal decoration.',
    darkMood: 'Charcoal paper reading mode with clear type and understated surfaces.',
    mobileMood:
      'Compressed editorial cards keep generous whitespace and crisp type on small screens.',
    sceneRoles: ['editorial', 'utility'],
  },
  'fluent-soft': {
    preset: 'fluent-soft',
    sourceDoc: 'docs/Fluent 2.txt',
    influences: ['docs/Fluent 2.txt', 'docs/可爱极简.txt'],
    family: 'rounded',
    enhancer: 'none',
    designIntent: 'System-like productivity surfaces with soft depth and polished panel hierarchy.',
    galleryTitle: 'Soft Acrylic',
    gallerySummary: 'Mica-like shells, polished depth, and calm productivity polish.',
    signatureKeywords: ['acrylic', 'soft depth', 'productivity', 'lift'],
    surfaceStyle: 'Layered translucent panels, soft chrome, and gentle focus rings.',
    motionStyle: 'Float-in transitions with smooth deceleration and polished hover lift.',
    densityStyle: 'Comfortable density with balanced panel spacing.',
    heroStyle: 'Glass-framed hero with calm highlights and system polish.',
    lightMood: 'Cool neutral mica surfaces with gentle acrylic lift.',
    darkMood: 'Mica charcoal workspace with calm blue highlights and soft depth.',
    mobileMood:
      'Compact acrylic cards preserve depth through border glow instead of blur-heavy stacks.',
    sceneRoles: ['productivity', 'immersive', 'utility'],
  },
  'material-calm': {
    preset: 'material-calm',
    sourceDoc: 'docs/Material Design.txt',
    influences: ['docs/Material Design.txt'],
    family: 'sharp',
    enhancer: 'none',
    designIntent:
      'Role-driven component system with tonal containers and precise interaction states.',
    galleryTitle: 'Tonal Structure',
    gallerySummary: 'Disciplined component layers, tonal surfaces, and direct interaction clarity.',
    signatureKeywords: ['tonal', 'structured', 'elevation', 'stateful'],
    surfaceStyle: 'Opaque tonal containers with explicit elevation and clean outlines.',
    motionStyle: 'Short, grounded transitions that emphasize control states over flourish.',
    densityStyle: 'Orderly spacing with high component alignment.',
    heroStyle: 'Structured hero blocks with strong headings and container rhythm.',
    lightMood: 'Bright tonal surfaces with clear role colors and structured layers.',
    darkMood: 'Calm tonal dark surfaces with explicit state layers and no glass treatment.',
    mobileMood: 'Dense but readable mobile layouts prioritize component order and tonal grouping.',
    sceneRoles: ['productivity', 'discussion', 'utility'],
  },
  'organic-natural': {
    preset: 'organic-natural',
    sourceDoc: 'docs/Natural 自然风格.txt',
    influences: ['docs/Natural 自然风格.txt', 'docs/织物纹理.txt'],
    family: 'rounded',
    enhancer: 'none',
    designIntent:
      'Warm natural browsing with soft materials, breathable spacing, and grounded surfaces.',
    galleryTitle: 'Earth Warmth',
    gallerySummary: 'Soft curves, tactile neutrals, and organic section pacing.',
    signatureKeywords: ['natural', 'warm', 'tactile', 'grounded'],
    surfaceStyle: 'Stone-and-paper surfaces with low-noise texture and warm borders.',
    motionStyle: 'Gentle easing and grounded hover responses.',
    densityStyle: 'Breathable sections with calm vertical flow.',
    heroStyle: 'Warm hero bands with earthy gradients and grounded callouts.',
    lightMood: 'Sand, stone, and moss daylight with warm tactile panels.',
    darkMood: 'Dusk soil and forest surfaces with grounded contrast and low-noise depth.',
    mobileMood:
      'Small-screen cards retain warm spacing and tactile contrast without visual clutter.',
    sceneRoles: ['editorial', 'immersive', 'utility'],
  },
  'biophilic-serene': {
    preset: 'biophilic-serene',
    sourceDoc: 'docs/亲生物设计.txt',
    influences: ['docs/亲生物设计.txt', 'docs/织物纹理.txt'],
    family: 'rounded',
    enhancer: 'none',
    designIntent:
      'Airy biophilic layout with restorative pacing, light-filled sections, and calm controls.',
    galleryTitle: 'Restorative Air',
    gallerySummary: 'Mist, daylight greens, and restorative spacing across the entire site.',
    signatureKeywords: ['biophilic', 'restorative', 'airy', 'mist'],
    surfaceStyle: 'Soft greenhouse panels, botanical accents, and breathable separators.',
    motionStyle: 'Slow, restorative transitions with subtle opacity and rise.',
    densityStyle: 'Loose spacing with breathing room around key content.',
    heroStyle: 'Atmospheric hero with layered mist, light, and calm sectional framing.',
    lightMood: 'Morning mist and daylight greens with spacious, breathable surfaces.',
    darkMood: 'Greenhouse dusk with soft glow, cool air, and relaxed hierarchy.',
    mobileMood:
      'Mobile presentation keeps airy spacing and soft separators instead of flattening to generic stacks.',
    sceneRoles: ['narrative', 'immersive', 'utility'],
  },
  'clay-playful': {
    preset: 'clay-playful',
    sourceDoc: 'docs/黏土质感.txt',
    influences: ['docs/黏土质感.txt', 'docs/可爱极简.txt'],
    family: 'rounded',
    enhancer: 'clay',
    designIntent:
      'Soft volumetric controls with tactile press states and playful low-density browsing.',
    galleryTitle: 'Playful Clay',
    gallerySummary:
      'Soft volume, chunky controls, and friendly tactile depth without childish noise.',
    signatureKeywords: ['clay', 'tactile', 'playful', 'volume'],
    surfaceStyle: 'Chunky matte panels, pressed controls, and rounded sculpted cards.',
    motionStyle: 'Soft bounce and cushioned press feedback.',
    densityStyle: 'Relaxed density with room for tactile shapes.',
    heroStyle: 'Big friendly hero blocks with volumetric highlights.',
    lightMood: 'Pastel clay playground with matte highlights and friendly depth.',
    darkMood: 'Matte pastel night with cushioned surfaces and readable soft contrast.',
    mobileMood: 'Mobile controls stay chunky and touch-friendly while preserving clear hierarchy.',
    sceneRoles: ['playful', 'immersive', 'discussion'],
  },
  'sketch-doodle': {
    preset: 'sketch-doodle',
    sourceDoc: 'docs/手绘涂鸦.txt',
    influences: ['docs/手绘涂鸦.txt'],
    family: 'sharp',
    enhancer: 'sketch',
    designIntent:
      'Organized notebook interface with paper structure, ink accents, and hand-drawn warmth.',
    galleryTitle: 'Notebook Ink',
    gallerySummary: 'Paper texture, lively outlines, and a composed annotation aesthetic.',
    signatureKeywords: ['ink', 'notebook', 'annotated', 'hand-drawn'],
    surfaceStyle: 'Paper cards, drawn outlines, and marked separators.',
    motionStyle: 'Direct transitions with quirky but controlled micro-shifts.',
    densityStyle: 'Moderate density with annotation margins and visible dividers.',
    heroStyle: 'Notebook hero with captioned blocks and sketch accents.',
    lightMood: 'Notebook paper with ink outlines and tidy annotation energy.',
    darkMood: 'Warm chalk-ink notebook with paper depth and controlled irregularity.',
    mobileMood: 'Mobile keeps the notebook framing through visible strokes and caption chips.',
    sceneRoles: ['discussion', 'editorial', 'utility'],
  },
  'gradient-narrative': {
    preset: 'gradient-narrative',
    sourceDoc: 'docs/滚动叙事.txt',
    influences: ['docs/滚动叙事.txt'],
    family: 'rounded',
    enhancer: 'gradient',
    designIntent:
      'Narrative-first browsing with scene anchors, cinematic surfaces, and guided progression.',
    galleryTitle: 'Story Arc',
    gallerySummary: 'Cinematic gradients, scene-driven heroes, and stronger sectional progression.',
    signatureKeywords: ['cinematic', 'gradient', 'story', 'chaptered'],
    surfaceStyle: 'Luminous panels, scene gradients, and brighter accent rails.',
    motionStyle: 'Progressive transitions that imply chapter movement and focus shift.',
    densityStyle: 'Hero-forward spacing with clear sectional chapters.',
    heroStyle: 'Cinematic hero with layered gradient depth and scene anchors.',
    lightMood: 'Clear blue-violet story canvas with luminous section anchors.',
    darkMood: 'Midnight cinematic gradient with layered story depth and focused accents.',
    mobileMood:
      'Story sections stay vivid on mobile through compact gradient framing instead of flat cards.',
    sceneRoles: ['narrative', 'immersive', 'playful'],
  },
}

const ENHANCED_PRESETS = new Set<AppearancePreset>([
  'clay-playful',
  'sketch-doodle',
  'gradient-narrative',
])

const NARRATIVE_ROUTE_NAMES = new Set(['home', 'about', 'contact', 'style-gallery'])
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
    routePath.startsWith('/style-gallery') ||
    routePath.startsWith('/about') ||
    routePath.startsWith('/contact')
  ) {
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
