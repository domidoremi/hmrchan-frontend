/**
 * useThrottle - 请求节流 Composable
 *
 * 防止用户短时间内重复触发相同操作，减少服务器压力
 * 同时提供本地限流保护，配合后端 429 响应
 */

import { ref, readonly } from 'vue'

interface ThrottleOptions {
  /** 节流间隔（毫秒），默认 1000ms */
  interval?: number
  /** 最大连续请求次数，超过后触发冷却，默认 5 */
  maxBurst?: number
  /** 冷却时间（毫秒），默认 30000ms */
  cooldownTime?: number
}

interface ThrottleState {
  /** 是否处于节流状态 */
  isThrottled: boolean
  /** 剩余冷却时间（秒） */
  cooldownRemaining: number
  /** 当前时间窗口内的请求次数 */
  requestCount: number
}

/**
 * 创建节流控制器
 */
export function useThrottle(options: ThrottleOptions = {}) {
  const { interval = 1000, maxBurst = 5, cooldownTime = 30000 } = options

  const isThrottled = ref(false)
  const cooldownRemaining = ref(0)
  const requestCount = ref(0)

  let lastRequestTime = 0
  let cooldownTimer: ReturnType<typeof setInterval> | null = null
  let resetTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * 检查是否可以执行操作
   */
  function canProceed(): boolean {
    if (isThrottled.value) return false

    const now = Date.now()

    // 检查基础节流间隔
    if (now - lastRequestTime < interval) {
      return false
    }

    return true
  }

  /**
   * 记录一次请求
   */
  function recordRequest(): void {
    const now = Date.now()
    lastRequestTime = now
    requestCount.value++

    // 重置计数器的定时器
    if (resetTimer) clearTimeout(resetTimer)
    resetTimer = setTimeout(() => {
      requestCount.value = 0
    }, interval * 2)

    // 检查是否超过突发限制
    if (requestCount.value >= maxBurst) {
      startCooldown()
    }
  }

  /**
   * 启动冷却期
   */
  function startCooldown(): void {
    isThrottled.value = true
    cooldownRemaining.value = Math.ceil(cooldownTime / 1000)

    cooldownTimer = setInterval(() => {
      cooldownRemaining.value--
      if (cooldownRemaining.value <= 0) {
        endCooldown()
      }
    }, 1000)
  }

  /**
   * 结束冷却期
   */
  function endCooldown(): void {
    isThrottled.value = false
    cooldownRemaining.value = 0
    requestCount.value = 0

    if (cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }

  /**
   * 执行带节流的操作
   */
  async function throttledAction<T>(action: () => Promise<T>): Promise<T | null> {
    if (!canProceed()) {
      return null
    }

    recordRequest()
    return action()
  }

  /**
   * 手动触发冷却（用于响应 429 错误）
   */
  function triggerCooldown(seconds?: number): void {
    if (seconds) {
      cooldownRemaining.value = seconds
      isThrottled.value = true

      if (cooldownTimer) clearInterval(cooldownTimer)
      cooldownTimer = setInterval(() => {
        cooldownRemaining.value--
        if (cooldownRemaining.value <= 0) {
          endCooldown()
        }
      }, 1000)
    } else {
      startCooldown()
    }
  }

  /**
   * 重置节流状态
   */
  function reset(): void {
    endCooldown()
    lastRequestTime = 0
    if (resetTimer) {
      clearTimeout(resetTimer)
      resetTimer = null
    }
  }

  /**
   * 获取当前状态
   */
  function getState(): ThrottleState {
    return {
      isThrottled: isThrottled.value,
      cooldownRemaining: cooldownRemaining.value,
      requestCount: requestCount.value,
    }
  }

  return {
    isThrottled: readonly(isThrottled),
    cooldownRemaining: readonly(cooldownRemaining),
    requestCount: readonly(requestCount),
    canProceed,
    recordRequest,
    throttledAction,
    triggerCooldown,
    reset,
    getState,
  }
}

/**
 * 全局请求节流器（单例）
 * 用于 API 客户端级别的限流
 */
let globalThrottle: ReturnType<typeof useThrottle> | null = null

export function useGlobalThrottle(): ReturnType<typeof useThrottle> {
  if (!globalThrottle) {
    globalThrottle = useThrottle({
      interval: 100, // API 请求间隔较短
      maxBurst: 20, // 允许更多突发请求
      cooldownTime: 60000, // 1 分钟冷却
    })
  }
  return globalThrottle
}

export default useThrottle
