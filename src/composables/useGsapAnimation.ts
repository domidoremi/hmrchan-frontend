/**
 * useGsapAnimation - 统一的 GSAP 动效 API
 *
 * 特性：
 * - 预设常用动画
 * - ScrollTrigger 集成
 * - 自动清理 context
 * - 响应 prefers-reduced-motion
 */

import { onMounted, onUnmounted, type Ref, ref } from 'vue'

// 懒加载 GSAP
let gsap: typeof import('gsap').default | null = null
let ScrollTrigger: typeof import('gsap/ScrollTrigger').default | null = null

const loadGsap = async () => {
  if (!gsap) {
    const module = await import('gsap')
    gsap = module.default
  }
  return gsap
}

const loadScrollTrigger = async () => {
  if (!ScrollTrigger) {
    const gsapLib = await loadGsap()
    const stModule = await import('gsap/ScrollTrigger')
    ScrollTrigger = stModule.default
    gsapLib.registerPlugin(ScrollTrigger)
  }
  return ScrollTrigger
}

// 检测是否偏好减少动画
const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// 预设缓动曲线
export const easings = {
  smooth: 'power2.out',
  spring: 'elastic.out(1, 0.5)',
  springLight: 'elastic.out(1, 0.75)',
  bounce: 'bounce.out',
  back: 'back.out(1.7)',
  expo: 'expo.out',
} as const

// 预设动画配置
export interface AnimationPreset {
  duration?: number
  ease?: string
  delay?: number
}

export interface ScrollTriggerOptions {
  trigger?: string | Element
  start?: string
  end?: string
  scrub?: boolean | number
  markers?: boolean
  toggleActions?: string
}

export interface GsapAnimationInstance {
  /** 淡入动画 */
  fadeIn: (
    target: Element | Element[] | string,
    options?: AnimationPreset
  ) => gsap.core.Tween | null
  /** 淡出动画 */
  fadeOut: (
    target: Element | Element[] | string,
    options?: AnimationPreset
  ) => gsap.core.Tween | null
  /** 向上滑入 */
  slideUp: (
    target: Element | Element[] | string,
    options?: AnimationPreset & { distance?: number }
  ) => gsap.core.Tween | null
  /** 向下滑入 */
  slideDown: (
    target: Element | Element[] | string,
    options?: AnimationPreset & { distance?: number }
  ) => gsap.core.Tween | null
  /** 缩放弹入 */
  scaleIn: (
    target: Element | Element[] | string,
    options?: AnimationPreset & { from?: number }
  ) => gsap.core.Tween | null
  /** 弹簧效果 */
  spring: (target: Element | Element[] | string, props: gsap.TweenVars) => gsap.core.Tween | null
  /** 交错动画 */
  stagger: (
    targets: Element[] | string,
    options?: AnimationPreset & { staggerDelay?: number }
  ) => gsap.core.Tween | null
  /** 滚动触发动画 */
  scrollReveal: (
    target: Element | string,
    options?: AnimationPreset & { scrollTrigger?: ScrollTriggerOptions }
  ) => Promise<gsap.core.Omit<gsap.core.Tween, 'then'> | null>
  /** 按钮按压效果 */
  buttonPress: (target: Element | string) => void
  /** Ripple 波纹效果 */
  ripple: (event: MouseEvent, container: Element) => void
  /** 自定义动画 */
  to: (target: Element | Element[] | string, vars: gsap.TweenVars) => gsap.core.Tween | null
  /** 设置属性 */
  set: (target: Element | Element[] | string, vars: gsap.TweenVars) => void
  /** 是否已加载 */
  isLoaded: Ref<boolean>
}

export function useGsapAnimation(containerRef?: Ref<HTMLElement | null>): GsapAnimationInstance {
  const isLoaded = ref(false)
  let ctx: gsap.Context | null = null

  const init = async () => {
    await loadGsap()
    isLoaded.value = true

    if (containerRef?.value && gsap) {
      ctx = gsap.context(() => {}, containerRef.value)
    }
  }

  onMounted(() => {
    init()
  })

  onUnmounted(() => {
    ctx?.revert()
  })

  // 基础动画方法
  const fadeIn = (target: Element | Element[] | string, options: AnimationPreset = {}) => {
    if (prefersReducedMotion() || !gsap) return null
    const { duration = 0.4, ease = easings.smooth, delay = 0 } = options
    return gsap.fromTo(target, { opacity: 0 }, { opacity: 1, duration, ease, delay })
  }

  const fadeOut = (target: Element | Element[] | string, options: AnimationPreset = {}) => {
    if (prefersReducedMotion() || !gsap) return null
    const { duration = 0.3, ease = easings.smooth, delay = 0 } = options
    return gsap.to(target, { opacity: 0, duration, ease, delay })
  }

  const slideUp = (
    target: Element | Element[] | string,
    options: AnimationPreset & { distance?: number } = {}
  ) => {
    if (prefersReducedMotion() || !gsap) return null
    const { duration = 0.5, ease = easings.smooth, delay = 0, distance = 30 } = options
    return gsap.fromTo(
      target,
      { opacity: 0, y: distance },
      { opacity: 1, y: 0, duration, ease, delay }
    )
  }

  const slideDown = (
    target: Element | Element[] | string,
    options: AnimationPreset & { distance?: number } = {}
  ) => {
    if (prefersReducedMotion() || !gsap) return null
    const { duration = 0.5, ease = easings.smooth, delay = 0, distance = 30 } = options
    return gsap.fromTo(
      target,
      { opacity: 0, y: -distance },
      { opacity: 1, y: 0, duration, ease, delay }
    )
  }

  const scaleIn = (
    target: Element | Element[] | string,
    options: AnimationPreset & { from?: number } = {}
  ) => {
    if (prefersReducedMotion() || !gsap) return null
    const { duration = 0.4, ease = easings.back, delay = 0, from = 0.8 } = options
    return gsap.fromTo(
      target,
      { opacity: 0, scale: from },
      { opacity: 1, scale: 1, duration, ease, delay }
    )
  }

  const spring = (target: Element | Element[] | string, props: gsap.TweenVars) => {
    if (prefersReducedMotion() || !gsap) return null
    return gsap.to(target, {
      ...props,
      ease: easings.springLight,
      duration: props.duration ?? 0.6,
    })
  }

  const stagger = (
    targets: Element[] | string,
    options: AnimationPreset & { staggerDelay?: number } = {}
  ) => {
    if (prefersReducedMotion() || !gsap) return null
    const { duration = 0.4, ease = easings.smooth, delay = 0, staggerDelay = 0.08 } = options
    return gsap.fromTo(
      targets,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration, ease, delay, stagger: staggerDelay }
    )
  }

  const scrollReveal = async (
    target: Element | string,
    options: AnimationPreset & { scrollTrigger?: ScrollTriggerOptions } = {}
  ) => {
    if (prefersReducedMotion() || !gsap) return null
    await loadScrollTrigger()

    const { duration = 0.6, ease = easings.smooth, scrollTrigger = {} } = options
    const {
      start = 'top 85%',
      end = 'bottom 15%',
      toggleActions = 'play none none reverse',
    } = scrollTrigger

    return gsap.fromTo(
      target,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration,
        ease,
        scrollTrigger: {
          trigger: target,
          start,
          end,
          toggleActions,
        },
      }
    )
  }

  const buttonPress = (target: Element | string) => {
    if (prefersReducedMotion() || !gsap) return
    gsap.to(target, {
      scale: 0.95,
      duration: 0.1,
      ease: easings.smooth,
      onComplete: () => {
        gsap?.to(target, {
          scale: 1,
          duration: 0.4,
          ease: easings.springLight,
        })
      },
    })
  }

  const ripple = (event: MouseEvent, container: Element) => {
    if (prefersReducedMotion() || !gsap) return

    const rect = container.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const rippleEl = document.createElement('span')
    rippleEl.className = 'gsap-ripple'
    rippleEl.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(var(--color-primary-rgb), 0.3);
      transform: translate(-50%, -50%);
      pointer-events: none;
    `

    container.appendChild(rippleEl)

    gsap.to(rippleEl, {
      width: Math.max(rect.width, rect.height) * 2.5,
      height: Math.max(rect.width, rect.height) * 2.5,
      opacity: 0,
      duration: 0.6,
      ease: easings.smooth,
      onComplete: () => {
        rippleEl.remove()
      },
    })
  }

  const to = (target: Element | Element[] | string, vars: gsap.TweenVars) => {
    if (prefersReducedMotion() || !gsap) return null
    return gsap.to(target, vars)
  }

  const set = (target: Element | Element[] | string, vars: gsap.TweenVars) => {
    if (!gsap) return
    gsap.set(target, vars)
  }

  return {
    fadeIn,
    fadeOut,
    slideUp,
    slideDown,
    scaleIn,
    spring,
    stagger,
    scrollReveal,
    buttonPress,
    ripple,
    to,
    set,
    isLoaded,
  }
}
