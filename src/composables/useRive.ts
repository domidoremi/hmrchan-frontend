/**
 * useRive - Rive 状态机动画 composable
 *
 * 特性：
 * - 懒加载 @rive-app/canvas
 * - State Machine 交互支持
 * - 输入绑定
 * - 自动响应 prefers-reduced-motion
 */

import { ref, onMounted, onUnmounted, watch, type Ref, shallowRef } from 'vue'

// 懒加载 Rive
let riveModule: typeof import('@rive-app/canvas') | null = null
const loadRive = async () => {
  if (!riveModule) {
    riveModule = await import('@rive-app/canvas')
  }
  return riveModule
}

// 检测是否偏好减少动画
const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export interface RiveOptions {
  /** Rive 文件 URL */
  src: string
  /** State Machine 名称 */
  stateMachine?: string
  /** Artboard 名称 */
  artboard?: string
  /** 是否自动播放 */
  autoplay?: boolean
  /** 初始输入值 */
  inputs?: Record<string, boolean | number>
}

export interface RiveInstance {
  /** Rive 实例 */
  rive: Ref<import('@rive-app/canvas').Rive | null>
  /** 是否已加载 */
  isLoaded: Ref<boolean>
  /** 是否正在播放 */
  isPlaying: Ref<boolean>
  /** 设置输入值 */
  setInput: (name: string, value: boolean | number) => void
  /** 触发事件 */
  fire: (name: string) => void
  /** 播放 */
  play: () => void
  /** 暂停 */
  pause: () => void
  /** 重置 */
  reset: () => void
  /** 销毁 */
  destroy: () => void
}

export function useRive(
  canvasRef: Ref<HTMLCanvasElement | null>,
  options: RiveOptions
): RiveInstance {
  const { src, stateMachine, artboard, autoplay = true, inputs = {} } = options

  const riveInstance = shallowRef<import('@rive-app/canvas').Rive | null>(null)
  const isLoaded = ref(false)
  const isPlaying = ref(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stateMachineInputs = shallowRef<any[]>([])

  const initRive = async () => {
    const canvas = canvasRef.value
    if (!canvas) return

    // 如果用户偏好减少动画，跳过 Rive 加载
    if (prefersReducedMotion()) {
      isLoaded.value = true
      return
    }

    const { Rive } = await loadRive()

    // 销毁之前的实例
    if (riveInstance.value) {
      riveInstance.value.cleanup()
    }

    const rive = new Rive({
      src,
      canvas,
      artboard,
      stateMachines: stateMachine ? [stateMachine] : undefined,
      autoplay,
      onLoad: () => {
        isLoaded.value = true
        isPlaying.value = autoplay

        // 获取 State Machine 输入
        if (stateMachine) {
          const inputs = rive.stateMachineInputs(stateMachine)
          stateMachineInputs.value = inputs || []

          // 应用初始输入值
          applyInputs(options.inputs || {})
        }

        // 响应式调整大小
        rive.resizeDrawingSurfaceToCanvas()
      },
      onPlay: () => {
        isPlaying.value = true
      },
      onPause: () => {
        isPlaying.value = false
      },
      onStop: () => {
        isPlaying.value = false
      },
    })

    riveInstance.value = rive
  }

  const applyInputs = (inputValues: Record<string, boolean | number>) => {
    if (!stateMachineInputs.value.length) return

    for (const [name, value] of Object.entries(inputValues)) {
      const input = stateMachineInputs.value.find((i) => i.name === name)
      if (input) {
        input.value = value
      }
    }
  }

  const setInput = (name: string, value: boolean | number) => {
    if (prefersReducedMotion()) return

    const input = stateMachineInputs.value.find((i) => i.name === name)
    if (input) {
      input.value = value
    }
  }

  const fire = (name: string) => {
    if (prefersReducedMotion()) return

    const input = stateMachineInputs.value.find((i) => i.name === name)
    if (input && typeof input.fire === 'function') {
      input.fire()
    }
  }

  const play = () => {
    if (prefersReducedMotion()) return
    riveInstance.value?.play()
  }

  const pause = () => {
    riveInstance.value?.pause()
  }

  const reset = () => {
    riveInstance.value?.reset()
  }

  const destroy = () => {
    riveInstance.value?.cleanup()
    riveInstance.value = null
    isLoaded.value = false
    isPlaying.value = false
  }

  // 监听输入变化
  watch(
    () => inputs,
    (newInputs) => {
      if (newInputs && isLoaded.value) {
        applyInputs(newInputs)
      }
    },
    { deep: true }
  )

  // 监听 canvas 变化
  watch(canvasRef, (newCanvas) => {
    if (newCanvas) {
      initRive()
    }
  })

  onMounted(() => {
    if (canvasRef.value) {
      initRive()
    }
  })

  onUnmounted(() => {
    destroy()
  })

  return {
    rive: riveInstance,
    isLoaded,
    isPlaying,
    setInput,
    fire,
    play,
    pause,
    reset,
    destroy,
  }
}
