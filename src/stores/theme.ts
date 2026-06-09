import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type HmrTheme = 'light' | 'dark' | 'system'
export type HmrResolvedTheme = 'light' | 'dark'
export type HmrAppearancePresetFamily = 'rounded' | 'sharp'
export type HmrAppearancePresetEnhancer = 'none' | 'clay' | 'sketch' | 'gradient'
export type HmrAppearancePresetSceneRole =
  | 'narrative'
  | 'immersive'
  | 'discussion'
  | 'productivity'
  | 'editorial'
  | 'playful'
  | 'utility'
export type HmrAppearancePreset =
  | 'minimal-editorial'
  | 'fluent-soft'
  | 'material-calm'
  | 'organic-natural'
  | 'biophilic-serene'
  | 'clay-playful'
  | 'sketch-doodle'
  | 'gradient-narrative'

export const hmrThemes: HmrTheme[] = ['light', 'dark', 'system']
export const defaultHmrAppearancePreset: HmrAppearancePreset = 'minimal-editorial'
export const hmrAppearancePresets: HmrAppearancePreset[] = [
  'minimal-editorial',
  'fluent-soft',
  'material-calm',
  'organic-natural',
  'biophilic-serene',
  'clay-playful',
  'sketch-doodle',
  'gradient-narrative',
]

export const hmrAppearancePresetThemeColors: Record<
  HmrResolvedTheme,
  Record<HmrAppearancePreset, string>
> = {
  light: {
    'minimal-editorial': '#fbf9ef',
    'fluent-soft': '#f4f7fb',
    'material-calm': '#f8faf8',
    'organic-natural': '#f6efe2',
    'biophilic-serene': '#eef7ef',
    'clay-playful': '#fff5e8',
    'sketch-doodle': '#fffdf4',
    'gradient-narrative': '#f4f0ff',
  },
  dark: {
    'minimal-editorial': '#11100f',
    'fluent-soft': '#0c111c',
    'material-calm': '#101711',
    'organic-natural': '#17110d',
    'biophilic-serene': '#0d1713',
    'clay-playful': '#18111c',
    'sketch-doodle': '#151311',
    'gradient-narrative': '#0e0a1d',
  },
}

export interface HmrAppearancePresetMeta {
  value: HmrAppearancePreset
  label: string
  summary: string
  family: HmrAppearancePresetFamily
  enhancer: HmrAppearancePresetEnhancer
  designIntent: string
  surfaceStyle: string
  motionStyle: string
  densityStyle: string
  heroStyle: string
  sceneRoles: HmrAppearancePresetSceneRole[]
}

export const hmrAppearancePresetMeta: Record<HmrAppearancePreset, HmrAppearancePresetMeta> = {
  'minimal-editorial': {
    value: 'minimal-editorial',
    label: '极简编辑',
    summary: '纸面阅读、低装饰和清晰层级。',
    family: 'rounded',
    enhancer: 'none',
    designIntent: 'Low-chrome editorial reading with crisp hierarchy and restrained panels.',
    surfaceStyle: 'Paper panels, thin borders, restrained highlights.',
    motionStyle: 'Minimal movement with precise, quick state changes.',
    densityStyle: 'Breathable spacing with strong reading rhythm.',
    heroStyle: 'Typography-led hero with subtle framing instead of spectacle.',
    sceneRoles: ['editorial', 'utility'],
  },
  'fluent-soft': {
    value: 'fluent-soft',
    label: '柔和流体',
    summary: '半透明面板、柔和深度和系统感聚焦。',
    family: 'rounded',
    enhancer: 'none',
    designIntent: 'System-like productivity surfaces with soft depth and polished panel hierarchy.',
    surfaceStyle: 'Layered translucent panels, soft chrome, and gentle focus rings.',
    motionStyle: 'Float-in transitions with smooth deceleration and polished hover lift.',
    densityStyle: 'Comfortable density with balanced panel spacing.',
    heroStyle: 'Glass-framed hero with calm highlights and system polish.',
    sceneRoles: ['productivity', 'immersive', 'utility'],
  },
  'material-calm': {
    value: 'material-calm',
    label: '沉静材质',
    summary: '明确容器、稳定状态和高对齐秩序。',
    family: 'sharp',
    enhancer: 'none',
    designIntent:
      'Role-driven component system with tonal containers and precise interaction states.',
    surfaceStyle: 'Opaque tonal containers with explicit elevation and clean outlines.',
    motionStyle: 'Short, grounded transitions that emphasize control states over flourish.',
    densityStyle: 'Orderly spacing with high component alignment.',
    heroStyle: 'Structured hero blocks with strong headings and container rhythm.',
    sceneRoles: ['productivity', 'discussion', 'utility'],
  },
  'organic-natural': {
    value: 'organic-natural',
    label: '自然有机',
    summary: '暖色纸石、柔和边界和低噪浏览。',
    family: 'rounded',
    enhancer: 'none',
    designIntent:
      'Warm natural browsing with soft materials, breathable spacing, and grounded surfaces.',
    surfaceStyle: 'Stone-and-paper surfaces with low-noise texture and warm borders.',
    motionStyle: 'Gentle easing and grounded hover responses.',
    densityStyle: 'Breathable sections with calm vertical flow.',
    heroStyle: 'Warm hero bands with earthy gradients and grounded callouts.',
    sceneRoles: ['editorial', 'immersive', 'utility'],
  },
  'biophilic-serene': {
    value: 'biophilic-serene',
    label: '亲生物',
    summary: '晨雾绿意、通透留白和恢复性节奏。',
    family: 'rounded',
    enhancer: 'none',
    designIntent:
      'Airy biophilic layout with restorative pacing, light-filled sections, and calm controls.',
    surfaceStyle: 'Soft greenhouse panels, botanical accents, and breathable separators.',
    motionStyle: 'Slow, restorative transitions with subtle opacity and rise.',
    densityStyle: 'Loose spacing with breathing room around key content.',
    heroStyle: 'Atmospheric hero with layered mist, light, and calm sectional framing.',
    sceneRoles: ['narrative', 'immersive', 'utility'],
  },
  'clay-playful': {
    value: 'clay-playful',
    label: '黏土触感',
    summary: '厚实圆角、按压反馈和友好体积感。',
    family: 'rounded',
    enhancer: 'clay',
    designIntent:
      'Soft volumetric controls with tactile press states and playful low-density browsing.',
    surfaceStyle: 'Chunky matte panels, pressed controls, and rounded sculpted cards.',
    motionStyle: 'Soft bounce and cushioned press feedback.',
    densityStyle: 'Relaxed density with room for tactile shapes.',
    heroStyle: 'Big friendly hero blocks with volumetric highlights.',
    sceneRoles: ['playful', 'immersive', 'discussion'],
  },
  'sketch-doodle': {
    value: 'sketch-doodle',
    label: '手绘笔记',
    summary: '纸张纹理、墨线边框和批注式组织。',
    family: 'sharp',
    enhancer: 'sketch',
    designIntent:
      'Organized notebook interface with paper structure, ink accents, and hand-drawn warmth.',
    surfaceStyle: 'Paper cards, drawn outlines, and marked separators.',
    motionStyle: 'Direct transitions with quirky but controlled micro-shifts.',
    densityStyle: 'Moderate density with annotation margins and visible dividers.',
    heroStyle: 'Notebook hero with captioned blocks and sketch accents.',
    sceneRoles: ['discussion', 'editorial', 'utility'],
  },
  'gradient-narrative': {
    value: 'gradient-narrative',
    label: '渐变叙事',
    summary: '章节化场景、明亮渐变和更强导览。',
    family: 'rounded',
    enhancer: 'gradient',
    designIntent:
      'Narrative-first browsing with scene anchors, cinematic surfaces, and guided progression.',
    surfaceStyle: 'Luminous panels, scene gradients, and brighter accent rails.',
    motionStyle: 'Progressive transitions that imply chapter movement and focus shift.',
    densityStyle: 'Hero-forward spacing with clear sectional chapters.',
    heroStyle: 'Cinematic hero with layered gradient depth and scene anchors.',
    sceneRoles: ['narrative', 'immersive', 'playful'],
  },
}

function normalizeTheme(value: string | null | undefined): HmrTheme | null {
  if (value === 'minimal-light') return 'light'
  if (value === 'minimal-dark') return 'dark'
  return hmrThemes.includes(value as HmrTheme) ? (value as HmrTheme) : null
}

function normalizeAppearancePreset(value: string | null | undefined): HmrAppearancePreset {
  if (value === 'minimal-light' || value === 'minimal-dark') return defaultHmrAppearancePreset
  return hmrAppearancePresets.includes(value as HmrAppearancePreset)
    ? (value as HmrAppearancePreset)
    : defaultHmrAppearancePreset
}

function resolveInitialTheme(): HmrTheme {
  if (typeof window === 'undefined') return 'system'
  const saved = window.localStorage.getItem('hmr.theme')
  return normalizeTheme(saved) ?? 'system'
}

function resolveInitialAppearancePreset(): HmrAppearancePreset {
  if (typeof window === 'undefined') return defaultHmrAppearancePreset
  const saved = window.localStorage.getItem('hmr.appearancePreset')
  return normalizeAppearancePreset(saved)
}

function resolveSystemTheme(): HmrResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(theme: HmrTheme): HmrResolvedTheme {
  return theme === 'system' ? resolveSystemTheme() : theme
}

function resolveThemeColor(
  resolvedTheme: HmrResolvedTheme,
  appearancePreset: HmrAppearancePreset
): string {
  return hmrAppearancePresetThemeColors[resolvedTheme][appearancePreset]
}

function resolveAppearancePresetMeta(
  appearancePreset: HmrAppearancePreset
): HmrAppearancePresetMeta {
  return hmrAppearancePresetMeta[appearancePreset]
}

function applyThemeToDocument(
  theme: HmrTheme,
  appearancePreset: HmrAppearancePreset,
  resolvedTheme = resolveTheme(theme)
): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = resolvedTheme
  document.documentElement.dataset.themeMode = theme
  document.documentElement.dataset.preset = appearancePreset
  document.documentElement.dataset.appearancePreset = appearancePreset
  const appearanceMeta = resolveAppearancePresetMeta(appearancePreset)
  document.documentElement.dataset.presetFamily = appearanceMeta.family
  document.documentElement.dataset.presetEnhancer = appearanceMeta.enhancer
  document.documentElement.style.colorScheme = resolvedTheme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', resolveThemeColor(resolvedTheme, appearancePreset))
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<HmrTheme>(resolveInitialTheme())
  const appearancePreset = ref<HmrAppearancePreset>(resolveInitialAppearancePreset())
  const resolvedTheme = ref<HmrResolvedTheme>(resolveTheme(theme.value))
  const isDark = computed(() => resolvedTheme.value === 'dark')
  const appearancePresetMeta = computed(() => hmrAppearancePresetMeta[appearancePreset.value])
  let systemThemeQuery: MediaQueryList | null = null
  let systemThemeListener: ((event: MediaQueryListEvent) => void) | null = null

  function syncDocumentTheme(): void {
    resolvedTheme.value = resolveTheme(theme.value)
    applyThemeToDocument(theme.value, appearancePreset.value, resolvedTheme.value)
  }

  function setTheme(nextTheme: HmrTheme): void {
    theme.value = normalizeTheme(nextTheme) ?? 'system'
    if (theme.value === 'system') {
      setupSystemThemeListener()
    }
    syncDocumentTheme()
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('hmr.theme', theme.value)
    }
  }

  function setAppearancePreset(nextPreset: HmrAppearancePreset): void {
    appearancePreset.value = normalizeAppearancePreset(nextPreset)
    syncDocumentTheme()
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('hmr.appearancePreset', appearancePreset.value)
    }
  }

  function toggleTheme(): void {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  function setupSystemThemeListener(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    if (!systemThemeQuery) {
      systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    }
    if (!systemThemeListener) {
      systemThemeListener = () => {
        if (theme.value === 'system') syncDocumentTheme()
      }
      systemThemeQuery.addEventListener('change', systemThemeListener)
    }
  }

  function initializeTheme(): void {
    syncDocumentTheme()
    setupSystemThemeListener()
  }

  return {
    theme,
    appearancePreset,
    appearancePresetMeta,
    resolvedTheme,
    isDark,
    setAppearancePreset,
    setTheme,
    toggleTheme,
    initializeTheme,
  }
})
