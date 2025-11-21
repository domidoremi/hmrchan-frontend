/**
 * 动画系统全局配置
 *
 * 提供统一的动画时长、缓动函数、交错配置等
 * 支持响应式和无障碍特性
 */

/**
 * 动画时长配置（秒）
 */
export const ANIMATION_DURATION = {
  /** 超快速 - 用于微交互 (0.15s) */
  ultraFast: 0.15,
  /** 快速 - 用于反馈和小元素 (0.3s) */
  fast: 0.3,
  /** 标准 - 默认动画时长 (0.5s) */
  normal: 0.5,
  /** 慢速 - 用于重要元素出场 (0.8s) */
  slow: 0.8,
  /** 超慢速 - 用于复杂场景 (1.2s) */
  ultraSlow: 1.2,
} as const

/**
 * 缓动函数配置
 */
export const ANIMATION_EASE = {
  /** 默认缓动 - 平滑出场 */
  default: 'power2.out',
  /** 强力缓动 - 快速开始，慢速结束 */
  power: 'power3.out',
  /** 弹性效果 - 带回弹 */
  bounce: 'back.out(1.7)',
  /** 轻微弹性 */
  bounceLight: 'back.out(1.2)',
  /** 强弹性 */
  bounceStrong: 'back.out(2.5)',
  /** 弹力效果 */
  elastic: 'elastic.out(1, 0.5)',
  /** 平滑进出 */
  smooth: 'power1.inOut',
  /** 快进慢出 */
  easeOut: 'power2.out',
  /** 慢进快出 */
  easeIn: 'power2.in',
  /** 缓慢进出 */
  easeInOut: 'power2.inOut',
  /** 线性 - 无缓动 */
  linear: 'none',
} as const

/**
 * 交错动画配置
 */
export const STAGGER_CONFIG = {
  /** 快速交错 (0.05s) */
  fast: 0.05,
  /** 标准交错 (0.1s) */
  normal: 0.1,
  /** 慢速交错 (0.15s) */
  slow: 0.15,
  /** 波浪效果 */
  wave: {
    each: 0.1,
    from: 'start',
    ease: 'power2.inOut',
  },
  /** 中心扩散 */
  center: {
    each: 0.08,
    from: 'center',
    ease: 'power2.out',
  },
  /** 随机 */
  random: {
    each: 0.1,
    from: 'random',
    ease: 'power2.out',
  },
} as const

/**
 * 动画延迟配置（秒）
 */
export const ANIMATION_DELAY = {
  /** 无延迟 */
  none: 0,
  /** 短延迟 (0.1s) */
  short: 0.1,
  /** 标准延迟 (0.2s) */
  normal: 0.2,
  /** 长延迟 (0.3s) */
  long: 0.3,
} as const

/**
 * 视差效果配置
 */
export const PARALLAX_CONFIG = {
  /** 慢速视差 */
  slow: 0.3,
  /** 标准视差 */
  normal: 0.5,
  /** 快速视差 */
  fast: 0.7,
} as const

/**
 * 响应式断点
 */
export const BREAKPOINTS = {
  /** 移动设备 */
  mobile: 480,
  /** 平板设备 */
  tablet: 768,
  /** 笔记本 */
  laptop: 1024,
  /** 桌面 */
  desktop: 1440,
} as const

/**
 * 默认动画配置
 */
export const DEFAULT_ANIMATION_CONFIG = {
  duration: ANIMATION_DURATION.normal,
  ease: ANIMATION_EASE.default,
} as const

/**
 * 检查用户是否偏好减少动画
 * @returns 如果用户设置了 prefers-reduced-motion，返回 true
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 获取响应式动画配置
 * 根据屏幕尺寸返回适配的动画配置
 * @returns 响应式动画配置
 */
export function getResponsiveConfig() {
  if (typeof window === 'undefined') {
    return DEFAULT_ANIMATION_CONFIG
  }

  const width = window.innerWidth

  // 移动端 - 更快的动画
  if (width <= BREAKPOINTS.mobile) {
    return {
      duration: ANIMATION_DURATION.fast,
      ease: ANIMATION_EASE.easeOut,
    }
  }

  // 平板端 - 平衡配置
  if (width <= BREAKPOINTS.tablet) {
    return {
      duration: ANIMATION_DURATION.normal,
      ease: ANIMATION_EASE.default,
    }
  }

  // 桌面端 - 完整体验
  return DEFAULT_ANIMATION_CONFIG
}

/**
 * 动画配置类型
 */
export interface AnimationConfig {
  /** 动画时长（秒） */
  duration?: number
  /** 缓动函数 */
  ease?: string
  /** 延迟（秒） */
  delay?: number
  /** 交错配置 */
  stagger?: number | object
  /** 是否立即播放 */
  paused?: boolean
  /** 重复次数 (-1 为无限循环) */
  repeat?: number
  /** 重复延迟 */
  repeatDelay?: number
  /** 是否反向重复 */
  yoyo?: boolean
}
