/**
 * Locale Configuration
 *
 * 为不同语言/地区定义差异化的配色、布局密度、交互偏好。
 * 组件通过 useLocaleConfig() 或 CSS 变量 [data-locale="xx"] 消费。
 */

import type { SupportedLocale } from '@/i18n'

/* ---------- 类型定义 ---------- */

/** 地区配色方案 */
export interface LocaleColorScheme {
  /** 强调色 (hex) */
  accent: string
  /** 强调色 RGB (用于 alpha 合成) */
  accentRgb: string
  /** 强调色亮色变体 */
  accentLight: string
  /** 强调色暗色变体 */
  accentDark: string
  /** 辅助强调色 */
  secondary: string
  /** 辅助强调色 RGB */
  secondaryRgb: string
}

/** 布局密度偏好 */
export interface LocaleLayoutConfig {
  /** 内容密度: compact=紧凑(CJK), normal=标准, spacious=宽松 */
  density: 'compact' | 'normal' | 'spacious'
  /** 卡片间距倍率 (1 = 基准) */
  cardGapMultiplier: number
  /** 内容区最大宽度 (ch 单位) */
  contentMaxCh: number
  /** 段落首行缩进 (em 单位, 0 = 不缩进) */
  paragraphIndent: number
  /** 标题字重偏好 */
  headingWeight: number
  /** 列表页每行推荐列数 (桌面端) */
  masonryColumns: number
}

/** 交互偏好 */
export interface LocaleInteractionConfig {
  /** 动效风格: spring=弹性(日系), smooth=平滑(中文), snappy=干脆(英文) */
  animationStyle: 'spring' | 'smooth' | 'snappy'
  /** 悬停反馈强度 (0-1) */
  hoverIntensity: number
  /** 点击反馈类型 */
  clickFeedback: 'scale' | 'ripple' | 'glow'
  /** 滚动行为: smooth / auto */
  scrollBehavior: 'smooth' | 'auto'
  /** Toast 位置偏好 */
  toastPosition: 'top-center' | 'top-right' | 'bottom-center'
}

/** 内容格式化偏好 */
export interface LocaleContentConfig {
  /** 日期显示风格 */
  dateStyle: 'relative' | 'absolute' | 'mixed'
  /** 数字缩写阈值 (超过此值使用 compact 格式) */
  compactNumberThreshold: number
  /** 空状态插画风格 */
  emptyStateStyle: 'minimal' | 'illustrated'
  /** 文本截断省略号 */
  ellipsis: string
}

export interface LocaleConfig {
  colors: LocaleColorScheme
  layout: LocaleLayoutConfig
  interaction: LocaleInteractionConfig
  content: LocaleContentConfig
}

/* ---------- 各地区配置 ---------- */

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
    toastPosition: 'top-center',
  },
  content: {
    dateStyle: 'relative',
    compactNumberThreshold: 10000,
    emptyStateStyle: 'illustrated',
    ellipsis: '……',
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
    toastPosition: 'top-center',
  },
  content: {
    dateStyle: 'relative',
    compactNumberThreshold: 10000,
    emptyStateStyle: 'illustrated',
    ellipsis: '……',
  },
}

const jaConfig: LocaleConfig = {
  colors: {
    accent: '#e891b2',
    accentRgb: '232, 145, 178',
    accentLight: '#f9a8d4',
    accentDark: '#db2777',
    secondary: '#8b5cf6',
    secondaryRgb: '139, 92, 246',
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
    toastPosition: 'top-center',
  },
  content: {
    dateStyle: 'relative',
    compactNumberThreshold: 10000,
    emptyStateStyle: 'illustrated',
    ellipsis: '…',
  },
}

const enConfig: LocaleConfig = {
  colors: {
    accent: '#3b82f6',
    accentRgb: '59, 130, 246',
    accentLight: '#60a5fa',
    accentDark: '#2563eb',
    secondary: '#8b5cf6',
    secondaryRgb: '139, 92, 246',
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
    toastPosition: 'top-right',
  },
  content: {
    dateStyle: 'mixed',
    compactNumberThreshold: 1000,
    emptyStateStyle: 'minimal',
    ellipsis: '…',
  },
}

/* ---------- 导出 ---------- */

export const localeConfigs: Record<SupportedLocale, LocaleConfig> = {
  'zh-CN': zhCNConfig,
  'zh-TW': zhTWConfig,
  ja: jaConfig,
  en: enConfig,
}

/** 获取指定 locale 的配置（带 fallback） */
export function getLocaleConfig(locale: string): LocaleConfig {
  return localeConfigs[locale as SupportedLocale] ?? enConfig
}

/** 判断是否为 CJK 语言 */
export function isCJKLocale(locale: string): boolean {
  return locale.startsWith('zh') || locale.startsWith('ja')
}
