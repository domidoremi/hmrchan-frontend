import { ref, computed, watch, onMounted, onBeforeUnmount, type Ref } from 'vue'
import { prefersReducedMotion } from '@/utils/performance'

export type PlatformMorphState = 'all' | 'instagram' | 'tiktok' | 'youtube' | 'twitter'

export interface MorphConfig {
  /** 形态名称 */
  name: string
  /** 主色调 */
  color: string
  /** 形态类名 */
  className: string
  /** 动画持续时间（秒） */
  duration: number
}

const MORPH_CONFIGS: Record<PlatformMorphState, MorphConfig> = {
  all: {
    name: 'Liquid Sphere',
    color: '#4169E1', // Royal Blue
    className: 'morph-sphere',
    duration: 0.8,
  },
  instagram: {
    name: 'Crystal Gallery',
    color: '#4169E1',
    className: 'morph-crystal',
    duration: 0.7,
  },
  tiktok: {
    name: 'Rhythm Wave',
    color: '#00D4FF', // Cyan Blue
    className: 'morph-wave',
    duration: 0.6,
  },
  youtube: {
    name: 'Play Prism',
    color: '#191970', // Midnight Blue
    className: 'morph-prism',
    duration: 0.7,
  },
  twitter: {
    name: 'Particle Network',
    color: '#4169E1',
    className: 'morph-particles',
    duration: 0.8,
  },
}

export interface UseBluePolymorphOptions {
  /** 是否启用动画 */
  enabled?: Ref<boolean>
  /** 动画完成回调 */
  onMorphComplete?: (state: PlatformMorphState) => void
}

/**
 * Blue Polymorph 动画系统
 *
 * 管理探索页背景的 3D 形态变换动画
 */
export function useBluePolymorph(
  currentPlatform: Ref<PlatformMorphState>,
  options: UseBluePolymorphOptions = {}
) {
  const { enabled = ref(true), onMorphComplete } = options

  const currentMorph = ref<PlatformMorphState>('all')
  const isTransitioning = ref(false)
  const morphProgress = ref(0)

  const currentConfig = computed(() => MORPH_CONFIGS[currentMorph.value])
  const shouldAnimate = computed(() => enabled.value && !prefersReducedMotion())

  let animationFrameId: number | null = null

  /**
   * 清理动画资源
   */
  function cleanupAnimation() {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  /**
   * 执行形态变换
   */
  function morphTo(newState: PlatformMorphState) {
    if (currentMorph.value === newState || isTransitioning.value) return

    // 清理之前的动画
    cleanupAnimation()

    isTransitioning.value = true
    morphProgress.value = 0
    currentMorph.value = newState

    const config = MORPH_CONFIGS[newState]
    const duration = config.duration * 1000

    if (!shouldAnimate.value) {
      // 无动画模式：立即完成
      morphProgress.value = 1
      isTransitioning.value = false
      onMorphComplete?.(newState)
      return
    }

    // 动画进度更新
    const startTime = Date.now()
    const updateProgress = () => {
      const elapsed = Date.now() - startTime
      morphProgress.value = Math.min(elapsed / duration, 1)

      if (morphProgress.value < 1) {
        animationFrameId = requestAnimationFrame(updateProgress)
      } else {
        isTransitioning.value = false
        animationFrameId = null
        onMorphComplete?.(newState)
      }
    }

    animationFrameId = requestAnimationFrame(updateProgress)
  }

  /**
   * 获取当前形态的 CSS 变量
   */
  const morphCSSVars = computed<Record<string, string>>(() => ({
    '--morph-color': currentConfig.value.color,
    '--morph-duration': `${currentConfig.value.duration}s`,
    '--morph-progress': String(morphProgress.value),
  }))

  /**
   * 获取形态类名
   */
  const morphClassName = computed(() => {
    const classes = ['blue-polymorph', currentConfig.value.className]
    if (isTransitioning.value) {
      classes.push('is-transitioning')
    }
    if (!shouldAnimate.value) {
      classes.push('no-animation')
    }
    return classes.join(' ')
  })

  // 监听平台切换
  watch(currentPlatform, (newPlatform) => {
    morphTo(newPlatform)
  })

  onMounted(() => {
    // 初始化为当前平台状态
    currentMorph.value = currentPlatform.value
  })

  onBeforeUnmount(() => {
    cleanupAnimation()
  })

  return {
    currentMorph,
    currentConfig,
    isTransitioning,
    morphProgress,
    morphCSSVars,
    morphClassName,
    morphTo,
  }
}
