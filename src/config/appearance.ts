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
    sourceDoc: 'docs/en/appearance-presets.md',
    influences: ['docs/en/appearance-presets.md'],
    family: 'rounded',
    enhancer: 'none',
    designIntent:
      'A flower-letter collection with wide margins, graceful hierarchy, and calm paper surfaces.',
    galleryTitle: 'Blossom Letter',
    gallerySummary: 'Plum ink, generous margins, and keepsake paper for unhurried fan reading.',
    signatureKeywords: ['flower letter', 'keepsake', 'paper', 'plum ink'],
    surfaceStyle: 'Blush paper, fine dividers, and lightly lifted photo edges.',
    motionStyle: 'Quiet fades and short, graceful state changes.',
    densityStyle: 'Open spacing with a relaxed reading rhythm.',
    heroStyle: 'Large editorial type paired with a simple photo-album arrangement.',
    lightMood: 'Blush stationery with plum ink and berry accents.',
    darkMood: 'Warm plum paper with soft cream type and rose accents.',
    mobileMood: 'A compact letter page with clear type, breathing room, and easy thumb reach.',
    sceneRoles: ['editorial', 'utility'],
  },
  'fluent-soft': {
    preset: 'fluent-soft',
    sourceDoc: 'docs/en/appearance-presets.md',
    influences: ['docs/en/appearance-presets.md'],
    family: 'rounded',
    enhancer: 'none',
    designIntent:
      'A soft photo album with rounded frames, powdery color, and a welcoming page rhythm.',
    galleryTitle: 'Soft Album',
    gallerySummary: 'Powder pink, mist blue, and gently rounded frames for favorite moments.',
    signatureKeywords: ['photo album', 'powder pink', 'soft blue', 'gentle'],
    surfaceStyle: 'Matte album pages, rounded photo mounts, and delicate outlines.',
    motionStyle: 'Smooth page reveals and a small lift for interactive photos.',
    densityStyle: 'Comfortable spacing with balanced photo and text areas.',
    heroStyle: 'A generous album spread with softly layered snapshots.',
    lightMood: 'Powder pink and pale blue on warm white album paper.',
    darkMood: 'Berry dusk pages with muted blue and blush details.',
    mobileMood: 'A single-column album with large photos and comfortable touch targets.',
    sceneRoles: ['productivity', 'immersive', 'utility'],
  },
  'material-calm': {
    preset: 'material-calm',
    sourceDoc: 'docs/en/appearance-presets.md',
    influences: ['docs/en/appearance-presets.md'],
    family: 'sharp',
    enhancer: 'none',
    designIntent:
      'A stage-day notebook with tidy sections, clear schedules, and small color-coded memories.',
    galleryTitle: 'Stage Notebook',
    gallerySummary: 'Orderly pages, butter-yellow notes, and clear sections for every appearance.',
    signatureKeywords: ['stage notes', 'schedule', 'butter yellow', 'orderly'],
    surfaceStyle: 'Clean notebook sheets, fine rules, and small colored note blocks.',
    motionStyle: 'Short page changes with clear pressed and selected states.',
    densityStyle: 'Orderly spacing that keeps dates, lists, and controls easy to scan.',
    heroStyle: 'A composed stage diary with strong headings and aligned details.',
    lightMood: 'Warm white pages with berry, butter, and sky-blue notes.',
    darkMood: 'Deep plum notebook pages with muted pastel notes.',
    mobileMood: 'A readable pocket notebook that keeps the next action close at hand.',
    sceneRoles: ['productivity', 'discussion', 'utility'],
  },
  'organic-natural': {
    preset: 'organic-natural',
    sourceDoc: 'docs/en/appearance-presets.md',
    influences: ['docs/en/appearance-presets.md'],
    family: 'rounded',
    enhancer: 'none',
    designIntent:
      'A letter from the forest with natural paper, mossy details, and gentle breathing room.',
    galleryTitle: 'Forest Letter',
    gallerySummary: 'Leaf green, linen paper, and warm wood tones for a quiet fan collection.',
    signatureKeywords: ['forest letter', 'linen', 'leaf green', 'warm wood'],
    surfaceStyle: 'Linen-like paper, leaf-toned dividers, and warm photo borders.',
    motionStyle: 'Gentle easing with softly grounded hover responses.',
    densityStyle: 'Breathable sections with a calm vertical flow.',
    heroStyle: 'A letter-and-photo arrangement with light botanical accents.',
    lightMood: 'Linen, sand, and leaf green in soft daylight.',
    darkMood: 'Forest dusk with warm cream lettering and muted rose details.',
    mobileMood: 'A small folded letter with warm spacing and clear reading contrast.',
    sceneRoles: ['editorial', 'immersive', 'utility'],
  },
  'biophilic-serene': {
    preset: 'biophilic-serene',
    sourceDoc: 'docs/en/appearance-presets.md',
    influences: ['docs/en/appearance-presets.md'],
    family: 'rounded',
    enhancer: 'none',
    designIntent:
      'A sunny garden album with pale greens, clear air, and room for every favorite photo.',
    galleryTitle: 'Sunny Garden',
    gallerySummary: 'Fresh green, clear blue, and open spacing for bright everyday memories.',
    signatureKeywords: ['sunny garden', 'fresh green', 'clear blue', 'airy'],
    surfaceStyle: 'Light garden pages, botanical marks, and soft separators.',
    motionStyle: 'Slow, airy transitions with subtle opacity and rise.',
    densityStyle: 'Loose spacing with breathing room around key content.',
    heroStyle: 'A light-filled photo arrangement with small garden accents.',
    lightMood: 'Morning light, pale green, and clear blue on warm paper.',
    darkMood: 'Garden evening with sage, lavender, and cream lettering.',
    mobileMood: 'An airy garden journal with soft separators and spacious touch targets.',
    sceneRoles: ['narrative', 'immersive', 'utility'],
  },
  'clay-playful': {
    preset: 'clay-playful',
    sourceDoc: 'docs/en/appearance-presets.md',
    influences: ['docs/en/appearance-presets.md'],
    family: 'rounded',
    enhancer: 'clay',
    designIntent:
      'A sweet little cottage with round labels, dessert colors, and cheerful keepsake shelves.',
    galleryTitle: 'Sweet Cottage',
    gallerySummary: 'Strawberry pink, custard yellow, and friendly rounded keepsakes.',
    signatureKeywords: ['sweet cottage', 'strawberry', 'custard', 'cheerful'],
    surfaceStyle: 'Soft matte pages, round labels, and gently raised keepsakes.',
    motionStyle: 'A small cushioned bounce and friendly press feedback.',
    densityStyle: 'Relaxed spacing with room for playful shapes.',
    heroStyle: 'A cheerful scrapbook spread with round photo frames.',
    lightMood: 'Strawberry, custard, and cream with soft berry ink.',
    darkMood: 'Plum dessert-box pages with warm pastel details.',
    mobileMood: 'Large friendly controls, clear type, and an easy single-column flow.',
    sceneRoles: ['playful', 'immersive', 'discussion'],
  },
  'sketch-doodle': {
    preset: 'sketch-doodle',
    sourceDoc: 'docs/en/appearance-presets.md',
    influences: ['docs/en/appearance-presets.md'],
    family: 'sharp',
    enhancer: 'sketch',
    designIntent:
      'An organized support scrapbook with handwritten notes, ticket stubs, and washi-tape warmth.',
    galleryTitle: 'Support Scrapbook',
    gallerySummary: 'Ink notes, ticket-like labels, and washi-tape details for fan memories.',
    signatureKeywords: ['support scrapbook', 'ink notes', 'tickets', 'washi tape'],
    surfaceStyle: 'Paper sheets, hand-drawn outlines, and marked separators.',
    motionStyle: 'Direct page changes with small handwritten shifts.',
    densityStyle: 'Moderate spacing with annotation margins and visible dividers.',
    heroStyle: 'A captioned scrapbook spread with taped photo corners.',
    lightMood: 'Notebook paper, plum ink, and tidy hand-drawn details.',
    darkMood: 'Warm plum scrapbook pages with chalky cream notes.',
    mobileMood: 'A pocket support journal with visible strokes and compact captions.',
    sceneRoles: ['discussion', 'editorial', 'utility'],
  },
  'gradient-narrative': {
    preset: 'gradient-narrative',
    sourceDoc: 'docs/en/appearance-presets.md',
    influences: ['docs/en/appearance-presets.md'],
    family: 'rounded',
    enhancer: 'gradient',
    designIntent:
      'A night-tour keepsake with evening color washes, stage-light accents, and chapter-like stops.',
    galleryTitle: 'Night Tour',
    gallerySummary: 'Berry night, lavender light, and a gentle journey through stage memories.',
    signatureKeywords: ['night tour', 'berry night', 'lavender light', 'stage memories'],
    surfaceStyle: 'Deep paper panels, evening color washes, and slim accent rails.',
    motionStyle: 'Progressive transitions that feel like turning through tour memories.',
    densityStyle: 'Spacious chapters with clear pauses between sections.',
    heroStyle: 'A moonlit album spread with layered stage-light color.',
    lightMood: 'Soft twilight violet with berry and pale-blue accents.',
    darkMood: 'Warm berry night with lavender, blush, and cream highlights.',
    mobileMood: 'Compact tour chapters with vivid photo framing and clear reading order.',
    sceneRoles: ['narrative', 'immersive', 'playful'],
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
