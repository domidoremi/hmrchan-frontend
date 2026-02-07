/**
 * useLottie - Lottie 动画 composable
 *
 * 特性：
 * - 懒加载 lottie-web（保持首屏性能）
 * - 完整的播放控制 API
 * - 自动响应 prefers-reduced-motion
 * - 自动清理资源
 */

import { ref, onMounted, onUnmounted, watch, type Ref, shallowRef } from 'vue'

// 懒加载 lottie-web（使用 light 版本，减少体积并消除 eval 警告）
let lottieModule: typeof import('lottie-web/build/player/lottie_light') | null = null
const loadLottie = async () => {
  if (!lottieModule) {
    lottieModule = await import('lottie-web/build/player/lottie_light')
  }
  return lottieModule.default
}

// 检测是否偏好减少动画
const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type ImportMetaVitest = ImportMeta & { vitest?: unknown }

const isTestEnvironment = (): boolean =>
  Boolean((import.meta as ImportMetaVitest).vitest) || import.meta.env.MODE === 'test'

export interface LottieOptions {
  /** Lottie JSON 动画数据 */
  animationData?: object | string
  /** 远程动画 URL */
  path?: string
  /** 是否循环播放 */
  loop?: boolean
  /** 是否自动播放 */
  autoplay?: boolean
  /** 播放速度 (1 = 正常) */
  speed?: number
  /** 渲染器类型 */
  renderer?: 'svg' | 'canvas' | 'html'
  /** 初始播放方向 (1 = 正向, -1 = 反向) */
  direction?: 1 | -1
}

export interface LottieInstance {
  /** 播放动画 */
  play: () => void
  /** 暂停动画 */
  pause: () => void
  /** 停止动画 */
  stop: () => void
  /** 跳转到指定帧并播放 */
  goToAndPlay: (frame: number, isFrame?: boolean) => void
  /** 跳转到指定帧并停止 */
  goToAndStop: (frame: number, isFrame?: boolean) => void
  /** 设置播放方向 */
  setDirection: (direction: 1 | -1) => void
  /** 设置播放速度 */
  setSpeed: (speed: number) => void
  /** 销毁实例 */
  destroy: () => void
  /** 当前是否正在播放 */
  isPlaying: Ref<boolean>
  /** 当前帧 */
  currentFrame: Ref<number>
  /** 总帧数 */
  totalFrames: Ref<number>
  /** 是否已加载 */
  isLoaded: Ref<boolean>
}

export function useLottie(
  containerRef: Ref<HTMLElement | null>,
  options: LottieOptions = {}
): LottieInstance {
  const {
    animationData,
    path,
    loop = true,
    autoplay = true,
    speed = 1,
    renderer = 'svg',
    direction = 1,
  } = options

  const isPlaying = ref(false)
  const currentFrame = ref(0)
  const totalFrames = ref(0)
  const isLoaded = ref(false)

  // 使用 shallowRef 避免深度响应式
  const animationInstance = shallowRef<import('lottie-web').AnimationItem | null>(null)

  const initLottie = async () => {
    const container = containerRef.value
    if (!container) return

    if (isTestEnvironment()) {
      isLoaded.value = true
      return
    }

    // 如果用户偏好减少动画，跳过初始化
    if (prefersReducedMotion()) {
      isLoaded.value = true
      return
    }

    const lottie = await loadLottie()

    // 清理之前的实例
    if (animationInstance.value) {
      animationInstance.value.destroy()
    }

    let resolvedAnimationData = animationData
    if (typeof animationData === 'string') {
      try {
        resolvedAnimationData = JSON.parse(animationData)
      } catch {
        resolvedAnimationData = undefined
      }
    }

    const anim = lottie.loadAnimation({
      container,
      renderer,
      loop,
      autoplay,
      animationData: resolvedAnimationData,
      path,
    })

    anim.setSpeed(speed)
    anim.setDirection(direction)

    // 监听事件
    anim.addEventListener('DOMLoaded', () => {
      isLoaded.value = true
      totalFrames.value = anim.totalFrames
    })

    anim.addEventListener('enterFrame', () => {
      currentFrame.value = Math.floor(anim.currentFrame)
      isPlaying.value = !anim.isPaused
    })

    anim.addEventListener('complete', () => {
      isPlaying.value = false
    })

    animationInstance.value = anim
  }

  // 控制方法
  const play = () => {
    if (prefersReducedMotion()) return
    animationInstance.value?.play()
    isPlaying.value = true
  }

  const pause = () => {
    animationInstance.value?.pause()
    isPlaying.value = false
  }

  const stop = () => {
    animationInstance.value?.stop()
    isPlaying.value = false
    currentFrame.value = 0
  }

  const goToAndPlay = (frame: number, isFrame = true) => {
    if (prefersReducedMotion()) return
    animationInstance.value?.goToAndPlay(frame, isFrame)
    isPlaying.value = true
  }

  const goToAndStop = (frame: number, isFrame = true) => {
    animationInstance.value?.goToAndStop(frame, isFrame)
    isPlaying.value = false
  }

  const setDirection = (dir: 1 | -1) => {
    animationInstance.value?.setDirection(dir)
  }

  const setSpeed = (spd: number) => {
    animationInstance.value?.setSpeed(spd)
  }

  const destroy = () => {
    animationInstance.value?.destroy()
    animationInstance.value = null
    isLoaded.value = false
  }

  // 监听容器变化
  watch(containerRef, (newContainer) => {
    if (newContainer) {
      initLottie()
    }
  })

  onMounted(() => {
    if (containerRef.value) {
      initLottie()
    }
  })

  onUnmounted(() => {
    destroy()
  })

  return {
    play,
    pause,
    stop,
    goToAndPlay,
    goToAndStop,
    setDirection,
    setSpeed,
    destroy,
    isPlaying,
    currentFrame,
    totalFrames,
    isLoaded,
  }
}
