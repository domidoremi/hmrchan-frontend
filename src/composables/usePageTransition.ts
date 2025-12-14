/**
 * usePageTransition - 统一页面过渡动画组合式函数
 *
 * 提供高性能的页面进入/离开动画：
 * - 基于 GSAP 的 GPU 加速动画
 * - 自动处理 reduced-motion 偏好
 * - 支持交错动画和自定义时序
 * - 与 Vue 生命周期无缝集成
 *
 * @example
 * ```vue
 * <script setup>
 * const { onPageEnter, onPageLeave, animateElements } = usePageTransition()
 *
 * onMounted(() => {
 *   onPageEnter()
 * })
 * </script>
 * ```
 */

import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import gsap from 'gsap'
import { useSettingsStore } from '@/stores'
import { prefersReducedMotion, ANIMATION_DURATION, ANIMATION_EASE, STAGGER_CONFIG } from '@/utils/animation'

export interface PageTransitionOptions {
  /** 动画持续时间（秒） */
  duration?: number
  /** 缓动函数 */
  ease?: string
  /** 延迟时间（秒） */
  delay?: number
  /** 交错延迟（秒） */
  stagger?: number
  /** 动画方向 */
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade'
  /** 动画距离（px） */
  distance?: number
  /** 完成回调 */
  onComplete?: () => void
}

export interface AnimateElementsOptions extends PageTransitionOptions {
  /** 元素选择器或 ref 数组 */
  selector?: string
  /** 是否清除之前的动画 */
  clearProps?: boolean
}

/**
 * 页面过渡动画组合式函数
 */
export function usePageTransition(defaultOptions: PageTransitionOptions = {}) {
  const settings = useSettingsStore()
  const isAnimating = ref(false)
  const timeline = ref<gsap.core.Timeline | null>(null)

  /** 检查是否应该执行动画 */
  const shouldAnimate = () => {
    if (!settings.settings.enableAnimations) return false
    return !prefersReducedMotion()
  }

  /** 获取动画初始状态 */
  const getFromState = (direction: string, distance: number) => {
    const base = { opacity: 0 }
    switch (direction) {
      case 'up':
        return { ...base, y: distance }
      case 'down':
        return { ...base, y: -distance }
      case 'left':
        return { ...base, x: distance }
      case 'right':
        return { ...base, x: -distance }
      case 'scale':
        return { ...base, scale: 0.95 }
      case 'fade':
      default:
        return base
    }
  }

  /** 获取动画结束状态 */
  const getToState = (direction: string) => {
    const base = { opacity: 1, clearProps: 'transform' }
    switch (direction) {
      case 'up':
      case 'down':
        return { ...base, y: 0 }
      case 'left':
      case 'right':
        return { ...base, x: 0 }
      case 'scale':
        return { ...base, scale: 1 }
      case 'fade':
      default:
        return base
    }
  }

  /**
   * 页面进入动画
   * @param container - 页面容器元素或选择器
   * @param options - 动画配置
   */
  async function onPageEnter(
    container?: HTMLElement | string,
    options: PageTransitionOptions = {},
  ): Promise<void> {
    if (!shouldAnimate()) {
      options.onComplete?.()
      return
    }

    await nextTick()

    const {
      duration = defaultOptions.duration ?? ANIMATION_DURATION.normal,
      ease = defaultOptions.ease ?? ANIMATION_EASE.default,
      delay = defaultOptions.delay ?? 0,
      direction = defaultOptions.direction ?? 'up',
      distance = defaultOptions.distance ?? 20,
      onComplete,
    } = options

    const target = typeof container === 'string' ? document.querySelector(container) : container

    if (!target) {
      onComplete?.()
      return
    }

    isAnimating.value = true

    // 启用 GPU 加速
    gsap.set(target, {
      willChange: 'transform, opacity',
      backfaceVisibility: 'hidden',
    })

    timeline.value = gsap.timeline({
      onComplete: () => {
        isAnimating.value = false
        // 清理 will-change 以释放资源
        gsap.set(target, { willChange: 'auto' })
        onComplete?.()
      },
    })

    timeline.value.fromTo(
      target,
      getFromState(direction, distance),
      {
        ...getToState(direction),
        duration,
        ease,
        delay,
      },
    )
  }

  /**
   * 页面离开动画
   * @param container - 页面容器元素或选择器
   * @param options - 动画配置
   */
  async function onPageLeave(
    container?: HTMLElement | string,
    options: PageTransitionOptions = {},
  ): Promise<void> {
    if (!shouldAnimate()) {
      options.onComplete?.()
      return
    }

    const {
      duration = defaultOptions.duration ?? ANIMATION_DURATION.fast,
      ease = defaultOptions.ease ?? 'power2.in',
      delay = defaultOptions.delay ?? 0,
      direction = defaultOptions.direction ?? 'up',
      distance = defaultOptions.distance ?? 10,
      onComplete,
    } = options

    const target = typeof container === 'string' ? document.querySelector(container) : container

    if (!target) {
      onComplete?.()
      return
    }

    isAnimating.value = true

    gsap.set(target, {
      willChange: 'transform, opacity',
    })

    return new Promise((resolve) => {
      gsap.to(target, {
        ...getFromState(direction, -distance),
        duration,
        ease,
        delay,
        onComplete: () => {
          isAnimating.value = false
          onComplete?.()
          resolve()
        },
      })
    })
  }

  /**
   * 交错动画多个元素
   * @param elements - 元素数组或选择器
   * @param options - 动画配置
   */
  async function animateElements(
    elements: HTMLElement[] | NodeListOf<HTMLElement> | string,
    options: AnimateElementsOptions = {},
  ): Promise<void> {
    if (!shouldAnimate()) {
      options.onComplete?.()
      return
    }

    await nextTick()

    const {
      duration = defaultOptions.duration ?? ANIMATION_DURATION.normal,
      ease = defaultOptions.ease ?? ANIMATION_EASE.default,
      delay = defaultOptions.delay ?? 0,
      stagger = defaultOptions.stagger ?? STAGGER_CONFIG.fast,
      direction = defaultOptions.direction ?? 'up',
      distance = defaultOptions.distance ?? 20,
      clearProps = true,
      onComplete,
    } = options

    const targets =
      typeof elements === 'string'
        ? document.querySelectorAll(elements)
        : elements

    if (!targets || (targets as NodeListOf<HTMLElement>).length === 0) {
      onComplete?.()
      return
    }

    isAnimating.value = true

    // 批量设置 GPU 加速
    gsap.set(targets, {
      willChange: 'transform, opacity',
      backfaceVisibility: 'hidden',
    })

    timeline.value = gsap.timeline({
      onComplete: () => {
        isAnimating.value = false
        if (clearProps) {
          gsap.set(targets, { willChange: 'auto', clearProps: 'all' })
        }
        onComplete?.()
      },
    })

    timeline.value.fromTo(
      targets,
      getFromState(direction, distance),
      {
        ...getToState(direction),
        duration,
        ease,
        delay,
        stagger,
      },
    )
  }

  /**
   * 立即显示元素（无动画）
   */
  function showImmediately(elements: HTMLElement[] | NodeListOf<HTMLElement> | string): void {
    const targets =
      typeof elements === 'string'
        ? document.querySelectorAll(elements)
        : elements

    if (targets) {
      gsap.set(targets, { opacity: 1, x: 0, y: 0, scale: 1 })
    }
  }

  /**
   * 停止当前动画
   */
  function stopAnimation(): void {
    if (timeline.value) {
      timeline.value.kill()
      timeline.value = null
    }
    isAnimating.value = false
  }

  // 组件卸载时清理
  onBeforeUnmount(() => {
    stopAnimation()
  })

  return {
    isAnimating,
    shouldAnimate,
    onPageEnter,
    onPageLeave,
    animateElements,
    showImmediately,
    stopAnimation,
  }
}

/**
 * 创建可复用的进入动画 Hook
 * 用于自动在 mounted 时执行动画
 */
export function useEnterAnimation(
  containerRef: { value: HTMLElement | null },
  options: PageTransitionOptions = {},
) {
  const { onPageEnter, isAnimating } = usePageTransition(options)

  onMounted(() => {
    if (containerRef.value) {
      onPageEnter(containerRef.value, options)
    }
  })

  return { isAnimating }
}
