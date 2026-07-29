import type { SupportedLocale } from '@/i18n'

export interface LocaleColorScheme {
  accent: string

  accentRgb: string

  accentLight: string

  accentDark: string

  secondary: string

  secondaryRgb: string
}

export interface LocaleLayoutConfig {
  density: 'compact' | 'normal' | 'spacious'

  cardGapMultiplier: number

  contentMaxCh: number

  paragraphIndent: number

  headingWeight: number

  masonryColumns: number
}

export interface LocaleInteractionConfig {
  animationStyle: 'spring' | 'smooth' | 'snappy'

  hoverIntensity: number

  clickFeedback: 'scale' | 'ripple' | 'glow'

  scrollBehavior: 'smooth' | 'auto'

  toastPosition: 'bottom-center'
}

export interface LocaleContentConfig {
  dateStyle: 'relative' | 'absolute' | 'mixed'

  compactNumberThreshold: number

  emptyStateStyle: 'minimal' | 'illustrated'

  ellipsis: string
}

export interface LocaleTypographyConfig {
  fontFamily: string
  readingLineHeight: number
  uiLineHeight: number
  labelLetterSpacing: string
}

export interface LocaleAccessibilityConfig {
  minimumControlHeight: string
  inlineLabelMax: string
}

export interface LocaleAlignmentConfig {
  iconTextOffset: string
  controlPaddingNudge: string
  baselineShift: string
}

export interface LocaleConfig {
  colors: LocaleColorScheme
  layout: LocaleLayoutConfig
  interaction: LocaleInteractionConfig
  content: LocaleContentConfig
  typography: LocaleTypographyConfig
  accessibility: LocaleAccessibilityConfig
  alignment: LocaleAlignmentConfig
}

const zhCNConfig: LocaleConfig = {
  colors: {
    accent: '#e53e3e',
    accentRgb: '229, 62, 62',
    accentLight: '#fc8181',
    accentDark: '#c53030',
    secondary: '#ed8936',
    secondaryRgb: '237, 137, 54',
  },
  layout: {
    density: 'compact',
    cardGapMultiplier: 0.85,
    contentMaxCh: 60,
    paragraphIndent: 2,
    headingWeight: 700,
    masonryColumns: 5,
  },
  interaction: {
    animationStyle: 'smooth',
    hoverIntensity: 0.6,
    clickFeedback: 'ripple',
    scrollBehavior: 'smooth',
    toastPosition: 'bottom-center',
  },
  content: {
    dateStyle: 'relative',
    compactNumberThreshold: 10000,
    emptyStateStyle: 'illustrated',
    ellipsis: '……',
  },
  typography: {
    fontFamily: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
    readingLineHeight: 1.7,
    uiLineHeight: 1.45,
    labelLetterSpacing: '0',
  },
  accessibility: {
    minimumControlHeight: '2.875rem',
    inlineLabelMax: '18ch',
  },
  alignment: {
    iconTextOffset: '0.05em',
    controlPaddingNudge: '0.08rem',
    baselineShift: '0.02em',
  },
}

const zhTWConfig: LocaleConfig = {
  colors: {
    accent: '#d69e2e',
    accentRgb: '214, 158, 46',
    accentLight: '#ecc94b',
    accentDark: '#b7791f',
    secondary: '#38a169',
    secondaryRgb: '56, 161, 105',
  },
  layout: {
    density: 'compact',
    cardGapMultiplier: 0.9,
    contentMaxCh: 60,
    paragraphIndent: 2,
    headingWeight: 700,
    masonryColumns: 5,
  },
  interaction: {
    animationStyle: 'smooth',
    hoverIntensity: 0.65,
    clickFeedback: 'ripple',
    scrollBehavior: 'smooth',
    toastPosition: 'bottom-center',
  },
  content: {
    dateStyle: 'relative',
    compactNumberThreshold: 10000,
    emptyStateStyle: 'illustrated',
    ellipsis: '……',
  },
  typography: {
    fontFamily: '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
    readingLineHeight: 1.7,
    uiLineHeight: 1.45,
    labelLetterSpacing: '0',
  },
  accessibility: {
    minimumControlHeight: '2.875rem',
    inlineLabelMax: '18ch',
  },
  alignment: {
    iconTextOffset: '0.05em',
    controlPaddingNudge: '0.08rem',
    baselineShift: '0.02em',
  },
}

const jaConfig: LocaleConfig = {
  colors: {
    accent: '#e891b2',
    accentRgb: '232, 145, 178',
    accentLight: '#f9a8d4',
    accentDark: '#db2777',
    secondary: '#22c55e',
    secondaryRgb: '34, 197, 94',
  },
  layout: {
    density: 'compact',
    cardGapMultiplier: 0.85,
    contentMaxCh: 56,
    paragraphIndent: 1,
    headingWeight: 600,
    masonryColumns: 5,
  },
  interaction: {
    animationStyle: 'spring',
    hoverIntensity: 0.5,
    clickFeedback: 'glow',
    scrollBehavior: 'smooth',
    toastPosition: 'bottom-center',
  },
  content: {
    dateStyle: 'relative',
    compactNumberThreshold: 10000,
    emptyStateStyle: 'illustrated',
    ellipsis: '…',
  },
  typography: {
    fontFamily: '"Noto Sans JP", "Hiragino Sans", "Yu Gothic UI", sans-serif',
    readingLineHeight: 1.72,
    uiLineHeight: 1.5,
    labelLetterSpacing: '0.01em',
  },
  accessibility: {
    minimumControlHeight: '2.875rem',
    inlineLabelMax: '17ch',
  },
  alignment: {
    iconTextOffset: '0.04em',
    controlPaddingNudge: '0.06rem',
    baselineShift: '0.01em',
  },
}

const enConfig: LocaleConfig = {
  colors: {
    accent: '#3b82f6',
    accentRgb: '59, 130, 246',
    accentLight: '#60a5fa',
    accentDark: '#2563eb',
    secondary: '#0ea5e9',
    secondaryRgb: '14, 165, 233',
  },
  layout: {
    density: 'spacious',
    cardGapMultiplier: 1,
    contentMaxCh: 70,
    paragraphIndent: 0,
    headingWeight: 600,
    masonryColumns: 4,
  },
  interaction: {
    animationStyle: 'snappy',
    hoverIntensity: 0.8,
    clickFeedback: 'scale',
    scrollBehavior: 'smooth',
    toastPosition: 'bottom-center',
  },
  content: {
    dateStyle: 'mixed',
    compactNumberThreshold: 1000,
    emptyStateStyle: 'minimal',
    ellipsis: '…',
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    readingLineHeight: 1.62,
    uiLineHeight: 1.4,
    labelLetterSpacing: '0.01em',
  },
  accessibility: {
    minimumControlHeight: '2.75rem',
    inlineLabelMax: '20ch',
  },
  alignment: {
    iconTextOffset: '0',
    controlPaddingNudge: '0',
    baselineShift: '0',
  },
}

export const localeConfigs: Record<SupportedLocale, LocaleConfig> = {
  'zh-CN': zhCNConfig,
  'zh-TW': zhTWConfig,
  ja: jaConfig,
  en: enConfig,
}

export function getLocaleConfig(locale: string): LocaleConfig {
  return localeConfigs[locale as SupportedLocale] ?? enConfig
}

export function isCJKLocale(locale: string): boolean {
  return locale.startsWith('zh') || locale.startsWith('ja')
}
