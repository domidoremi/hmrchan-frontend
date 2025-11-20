/**
 * GSAP 动画工具函数
 *
 * 提供可复用的动画函数和组合，简化动画实现
 */

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  ANIMATION_DURATION,
  ANIMATION_EASE,
  STAGGER_CONFIG,
  prefersReducedMotion,
  getResponsiveAnimationConfig,
} from './config'

// 注册 GSAP 插件
gsap.registerPlugin(ScrollTrigger)

/**
 * GSAP 上下文类型
 */
export type GSAPContext = gsap.Context | null

/**
 * 动画配置接口
 */
export interface AnimationConfig {
  /** 动画持续时间 */
  duration?: number
  /** 缓动函数 */
  ease?: string
  /** 延迟时间 */
  delay?: number
  /** 交错配置 */
  stagger?: number | object
  /** 滚动触发器配置 */
  scrollTrigger?: ScrollTrigger.Vars
  /** 是否自动播放 */
  paused?: boolean
  /** 完成回调 */
  onComplete?: () => void
}

/**
 * 创建 GSAP 上下文
 * 用于管理组件内的所有动画，便于清理
 */
export function createAnimationContext(): GSAPContext {
  return gsap.context(() => {})
}

/**
 * 清理动画上下文
 */
export function cleanupAnimationContext(ctx: GSAPContext): void {
  ctx?.revert()
}

/**
 * 淡入动画
 */
export function fadeIn(
  target: gsap.TweenTarget,
  config: AnimationConfig = {},
): gsap.core.Tween | gsap.core.Timeline {
  if (prefersReducedMotion()) {
    gsap.set(target, { opacity: 1 })
    return gsap.timeline()
  }

  return gsap.fromTo(
    target,
    { opacity: 0 },
    {
      opacity: 1,
      duration: config.duration || ANIMATION_DURATION.normal,
      ease: config.ease || ANIMATION_EASE.fade,
      delay: config.delay || 0,
      stagger: config.stagger,
      scrollTrigger: config.scrollTrigger,
      onComplete: config.onComplete,
    },
  )
}

/**
 * 淡入并上移动画（从下往上）
 */
export function fadeInUp(
  target: gsap.TweenTarget,
  config: AnimationConfig = {},
): gsap.core.Tween | gsap.core.Timeline {
  if (prefersReducedMotion()) {
    gsap.set(target, { opacity: 1, y: 0 })
    return gsap.timeline()
  }

  return gsap.fromTo(
    target,
    {
      opacity: 0,
      y: 60,
    },
    {
      opacity: 1,
      y: 0,
      duration: config.duration || ANIMATION_DURATION.normal,
      ease: config.ease || ANIMATION_EASE.default,
      delay: config.delay || 0,
      stagger: config.stagger,
      scrollTrigger: config.scrollTrigger,
      onComplete: config.onComplete,
    },
  )
}

/**
 * 淡入并下移动画（从上往下）
 */
export function fadeInDown(
  target: gsap.TweenTarget,
  config: AnimationConfig = {},
): gsap.core.Tween | gsap.core.Timeline {
  if (prefersReducedMotion()) {
    gsap.set(target, { opacity: 1, y: 0 })
    return gsap.timeline()
  }

  return gsap.fromTo(
    target,
    {
      opacity: 0,
      y: -60,
    },
    {
      opacity: 1,
      y: 0,
      duration: config.duration || ANIMATION_DURATION.normal,
      ease: config.ease || ANIMATION_EASE.default,
      delay: config.delay || 0,
      stagger: config.stagger,
      scrollTrigger: config.scrollTrigger,
      onComplete: config.onComplete,
    },
  )
}

/**
 * 淡入并左移动画（从右往左）
 */
export function fadeInLeft(
  target: gsap.TweenTarget,
  config: AnimationConfig = {},
): gsap.core.Tween | gsap.core.Timeline {
  if (prefersReducedMotion()) {
    gsap.set(target, { opacity: 1, x: 0 })
    return gsap.timeline()
  }

  return gsap.fromTo(
    target,
    {
      opacity: 0,
      x: 60,
    },
    {
      opacity: 1,
      x: 0,
      duration: config.duration || ANIMATION_DURATION.normal,
      ease: config.ease || ANIMATION_EASE.default,
      delay: config.delay || 0,
      stagger: config.stagger,
      scrollTrigger: config.scrollTrigger,
      onComplete: config.onComplete,
    },
  )
}

/**
 * 淡入并右移动画（从左往右）
 */
export function fadeInRight(
  target: gsap.TweenTarget,
  config: AnimationConfig = {},
): gsap.core.Tween | gsap.core.Timeline {
  if (prefersReducedMotion()) {
    gsap.set(target, { opacity: 1, x: 0 })
    return gsap.timeline()
  }

  return gsap.fromTo(
    target,
    {
      opacity: 0,
      x: -60,
    },
    {
      opacity: 1,
      x: 0,
      duration: config.duration || ANIMATION_DURATION.normal,
      ease: config.ease || ANIMATION_EASE.default,
      delay: config.delay || 0,
      stagger: config.stagger,
      scrollTrigger: config.scrollTrigger,
      onComplete: config.onComplete,
    },
  )
}

/**
 * 缩放动画（放大进入）
 */
export function scaleIn(
  target: gsap.TweenTarget,
  config: AnimationConfig = {},
): gsap.core.Tween | gsap.core.Timeline {
  if (prefersReducedMotion()) {
    gsap.set(target, { opacity: 1, scale: 1 })
    return gsap.timeline()
  }

  return gsap.fromTo(
    target,
    {
      opacity: 0,
      scale: 0.8,
    },
    {
      opacity: 1,
      scale: 1,
      duration: config.duration || ANIMATION_DURATION.normal,
      ease: config.ease || ANIMATION_EASE.bounceLight,
      delay: config.delay || 0,
      stagger: config.stagger,
      scrollTrigger: config.scrollTrigger,
      onComplete: config.onComplete,
    },
  )
}

/**
 * 旋转进入动画
 */
export function rotateIn(
  target: gsap.TweenTarget,
  config: AnimationConfig = {},
): gsap.core.Tween | gsap.core.Timeline {
  if (prefersReducedMotion()) {
    gsap.set(target, { opacity: 1, rotation: 0, scale: 1 })
    return gsap.timeline()
  }

  return gsap.fromTo(
    target,
    {
      opacity: 0,
      rotation: -15,
      scale: 0.8,
    },
    {
      opacity: 1,
      rotation: 0,
      scale: 1,
      duration: config.duration || ANIMATION_DURATION.slow,
      ease: config.ease || ANIMATION_EASE.bounceLight,
      delay: config.delay || 0,
      stagger: config.stagger,
      scrollTrigger: config.scrollTrigger,
      onComplete: config.onComplete,
    },
  )
}

/**
 * 弹跳进入动画
 */
export function bounceIn(
  target: gsap.TweenTarget,
  config: AnimationConfig = {},
): gsap.core.Tween | gsap.core.Timeline {
  if (prefersReducedMotion()) {
    gsap.set(target, { opacity: 1, y: 0 })
    return gsap.timeline()
  }

  return gsap.fromTo(
    target,
    {
      opacity: 0,
      y: -100,
    },
    {
      opacity: 1,
      y: 0,
      duration: config.duration || ANIMATION_DURATION.slow,
      ease: config.ease || ANIMATION_EASE.bounce,
      delay: config.delay || 0,
      stagger: config.stagger,
      scrollTrigger: config.scrollTrigger,
      onComplete: config.onComplete,
    },
  )
}

/**
 * 创建交错动画时间线
 */
export function createStaggerTimeline(
  targets: gsap.TweenTarget[],
  animationFn: (target: gsap.TweenTarget, index: number) => gsap.core.Tween,
  stagger: number | object = STAGGER_CONFIG.normal,
): gsap.core.Timeline {
  const tl = gsap.timeline()

  if (prefersReducedMotion()) {
    targets.forEach((target) => {
      gsap.set(target, { opacity: 1 })
    })
    return tl
  }

  targets.forEach((target, index) => {
    const delay = typeof stagger === 'number' ? stagger * index : 0
    tl.add(animationFn(target, index), delay)
  })

  return tl
}

/**
 * 视差滚动效果
 */
export function createParallax(
  target: gsap.TweenTarget,
  speed: number = 0.5,
  config: AnimationConfig = {},
): gsap.core.Tween | gsap.core.Timeline {
  if (prefersReducedMotion()) {
    return gsap.timeline()
  }

  return gsap.to(target as Element, {
    yPercent: -50 * speed,
    ease: 'none',
    scrollTrigger: {
      trigger: target as Element,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
      ...config.scrollTrigger,
    },
  })
}

/**
 * 文字逐字显示动画
 */
export function typewriterEffect(
  target: HTMLElement,
  config: AnimationConfig = {},
): gsap.core.Timeline {
  if (prefersReducedMotion()) {
    return gsap.timeline()
  }

  const text = target.textContent || ''
  target.textContent = ''

  const tl = gsap.timeline({
    onComplete: config.onComplete,
  })

  text.split('').forEach((char, index) => {
    tl.to(
      target,
      {
        duration: config.duration || ANIMATION_DURATION.ultraFast,
        onStart: () => {
          target.textContent += char
        },
      },
      index * (config.duration || ANIMATION_DURATION.ultraFast),
    )
  })

  return tl
}

/**
 * 创建呼吸动画（循环缩放）
 */
export function createBreathingAnimation(
  target: gsap.TweenTarget,
  config: AnimationConfig = {},
): gsap.core.Tween | gsap.core.Timeline {
  if (prefersReducedMotion()) {
    return gsap.timeline()
  }

  return gsap.to(target, {
    scale: 1.05,
    duration: config.duration || ANIMATION_DURATION.slow,
    ease: 'power1.inOut',
    yoyo: true,
    repeat: -1,
  })
}

/**
 * 创建脉冲动画
 */
export function createPulseAnimation(
  target: gsap.TweenTarget,
  config: AnimationConfig = {},
): gsap.core.Tween | gsap.core.Timeline {
  if (prefersReducedMotion()) {
    return gsap.timeline()
  }

  return gsap.to(target, {
    scale: 1.1,
    opacity: 0.8,
    duration: config.duration || ANIMATION_DURATION.normal,
    ease: 'power2.inOut',
    yoyo: true,
    repeat: -1,
  })
}

/**
 * 创建摇摆动画
 */
export function createSwingAnimation(
  target: gsap.TweenTarget,
  config: AnimationConfig = {},
): gsap.core.Tween | gsap.core.Timeline {
  if (prefersReducedMotion()) {
    return gsap.timeline()
  }

  return gsap.to(target, {
    rotation: 3,
    duration: config.duration || ANIMATION_DURATION.normal,
    ease: 'power1.inOut',
    yoyo: true,
    repeat: -1,
  })
}

/**
 * 创建浮动动画
 */
export function createFloatingAnimation(
  target: gsap.TweenTarget,
  config: AnimationConfig = {},
): gsap.core.Tween | gsap.core.Timeline {
  if (prefersReducedMotion()) {
    return gsap.timeline()
  }

  return gsap.to(target, {
    y: -20,
    duration: config.duration || ANIMATION_DURATION.ultraSlow,
    ease: 'power1.inOut',
    yoyo: true,
    repeat: -1,
  })
}

/**
 * Kill所有动画和滚动触发器
 */
export function killAllAnimations(): void {
  gsap.killTweensOf('*')
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
}

/**
 * 刷新所有滚动触发器
 */
export function refreshScrollTriggers(): void {
  ScrollTrigger.refresh()
}

/**
 * 获取响应式动画配置
 */
export function getResponsiveConfig(): ReturnType<typeof getResponsiveAnimationConfig> {
  return getResponsiveAnimationConfig(window.innerWidth)
}
