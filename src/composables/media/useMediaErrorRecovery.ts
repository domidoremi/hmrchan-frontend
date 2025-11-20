/**
 * 媒体错误恢复Composable
 * 实现自动重试和降级机制
 */
import { ref, computed } from 'vue'
import logger from '@/utils/logger'

interface RetryOptions {
  /**
   * 最大重试次数
   */
  maxRetries?: number

  /**
   * 重试延迟（毫秒）
   */
  retryDelay?: number

  /**
   * 延迟倍数（指数退避）
   */
  backoffMultiplier?: number

  /**
   * 最大延迟时间
   */
  maxDelay?: number

  /**
   * 是否启用降级
   */
  enableFallback?: boolean
}

interface MediaSource {
  url: string
  type: 'primary' | 'fallback' | 'cdn'
  quality?: 'high' | 'medium' | 'low'
}

interface ErrorState {
  url: string
  retryCount: number
  lastError: Error | null
  failedAt: number
}

export function useMediaErrorRecovery(options: RetryOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoffMultiplier = 2,
    maxDelay = 10000,
    enableFallback = true,
  } = options

  const errorStates = ref<Map<string, ErrorState>>(new Map())
  const isRetrying = ref(false)
  const currentRetryCount = ref(0)

  /**
   * 加载媒体（带重试）
   */
  const loadWithRetry = async (
    url: string,
    loadFn: (url: string) => Promise<unknown>,
    fallbackUrls: string[] = [],
  ): Promise<unknown> => {
    const sources: MediaSource[] = [
      { url, type: 'primary' },
      ...fallbackUrls.map((fb) => ({ url: fb, type: 'fallback' as const })),
    ]

    let lastError: Error | null = null

    // 尝试所有源
    for (const source of sources) {
      try {
        logger.debug(`[ErrorRecovery] 尝试加载: ${source.url} (${source.type})`)
        const result = await retryWithBackoff(source.url, loadFn)

        // 成功后清除错误状态
        errorStates.value.delete(source.url)
        return result
      } catch (error) {
        lastError = error as Error
        logger.warn('[ErrorRecovery] 源加载失败', {
          type: source.type,
          url: source.url,
          error,
        })

        // 记录错误状态
        recordError(source.url, error as Error)

        // 如果不是最后一个源，继续尝试下一个
        if (source !== sources[sources.length - 1] && enableFallback) {
          logger.info('[ErrorRecovery] 尝试降级到下一个源', {
            currentUrl: source.url,
          })
          continue
        }
      }
    }

    // 所有源都失败
    throw lastError || new Error('All media sources failed')
  }

  /**
   * 带指数退避的重试
   */
  const retryWithBackoff = async (
    url: string,
    loadFn: (url: string) => Promise<unknown>,
  ): Promise<unknown> => {
    let attempt = 0
    let delay = retryDelay

    while (attempt <= maxRetries) {
      try {
        isRetrying.value = attempt > 0
        currentRetryCount.value = attempt

        if (attempt > 0) {
          logger.debug('[ErrorRecovery] 重试', {
            attempt,
            maxRetries,
            delay,
          })
          await sleep(delay)
        }

        const result = await loadFn(url)

        // 成功
        isRetrying.value = false
        currentRetryCount.value = 0
        return result
      } catch (error) {
        attempt++

        if (attempt > maxRetries) {
          throw error
        }

        // 指数退避
        delay = Math.min(delay * backoffMultiplier, maxDelay)

        logger.warn('[ErrorRecovery] 重试失败', {
          attempt,
          error,
        })
      }
    }

    throw new Error('Max retries exceeded')
  }

  /**
   * 记录错误状态
   */
  const recordError = (url: string, error: Error): void => {
    const existing = errorStates.value.get(url)

    errorStates.value.set(url, {
      url,
      retryCount: (existing?.retryCount || 0) + 1,
      lastError: error,
      failedAt: Date.now(),
    })
  }

  /**
   * 获取错误状态
   */
  const getErrorState = (url: string): ErrorState | null => {
    return errorStates.value.get(url) || null
  }

  /**
   * 清除错误状态
   */
  const clearErrorState = (url?: string): void => {
    if (url) {
      errorStates.value.delete(url)
    } else {
      errorStates.value.clear()
    }
  }

  /**
   * 检查是否应该跳过重试（失败次数过多）
   */
  const shouldSkipRetry = (url: string): boolean => {
    const state = errorStates.value.get(url)
    if (!state) return false

    // 如果短时间内失败次数过多，暂时跳过
    const timeSinceFailure = Date.now() - state.failedAt
    const cooldownPeriod = 60000 // 1分钟冷却期

    return state.retryCount > maxRetries && timeSinceFailure < cooldownPeriod
  }

  /**
   * 生成降级URL（例如降低质量）
   */
  const generateFallbackUrls = (originalUrl: string): string[] => {
    const fallbacks: string[] = []

    // 策略1: 尝试不同的CDN节点（如果URL包含CDN标识）
    if (originalUrl.includes('cdn')) {
      fallbacks.push(originalUrl.replace('cdn', 'cdn-backup'))
    }

    // 策略2: 降低质量（如果URL包含质量参数）
    if (originalUrl.includes('quality=high')) {
      fallbacks.push(originalUrl.replace('quality=high', 'quality=medium'))
      fallbacks.push(originalUrl.replace('quality=high', 'quality=low'))
    }

    // 策略3: 使用原始服务器（移除CDN前缀）
    if (originalUrl.includes('//cdn.')) {
      fallbacks.push(originalUrl.replace('//cdn.', '//api.'))
    }

    return fallbacks
  }

  /**
   * 睡眠函数
   */
  const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 获取错误统计
   */
  const errorStats = computed(() => {
    const errors = Array.from(errorStates.value.values())
    return {
      totalErrors: errors.length,
      totalRetries: errors.reduce((sum, e) => sum + e.retryCount, 0),
      recentErrors: errors.filter((e) => Date.now() - e.failedAt < 300000).length, // 5分钟内
    }
  })

  /**
   * 诊断错误类型
   */
  const diagnoseError = (
    error: Error,
  ): {
    type: 'network' | 'cors' | 'timeout' | 'not-found' | 'server' | 'unknown'
    message: string
    recoverable: boolean
  } => {
    const errorMessage = error.message.toLowerCase()

    // 网络错误
    if (errorMessage.includes('network') || errorMessage.includes('failed to fetch')) {
      return {
        type: 'network',
        message: '网络连接失败，请检查网络连接',
        recoverable: true,
      }
    }

    // CORS错误
    if (errorMessage.includes('cors') || errorMessage.includes('cross-origin')) {
      return {
        type: 'cors',
        message: '跨域请求被阻止',
        recoverable: false,
      }
    }

    // 超时错误
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return {
        type: 'timeout',
        message: '请求超时，请稍后重试',
        recoverable: true,
      }
    }

    // 404错误
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return {
        type: 'not-found',
        message: '媒体文件不存在',
        recoverable: false,
      }
    }

    // 服务器错误
    if (
      errorMessage.includes('500') ||
      errorMessage.includes('502') ||
      errorMessage.includes('503')
    ) {
      return {
        type: 'server',
        message: '服务器错误，请稍后重试',
        recoverable: true,
      }
    }

    return {
      type: 'unknown',
      message: error.message || '未知错误',
      recoverable: true,
    }
  }

  return {
    // 状态
    isRetrying: computed(() => isRetrying.value),
    currentRetryCount: computed(() => currentRetryCount.value),
    errorStates: computed(() => errorStates.value),
    errorStats,

    // 方法
    loadWithRetry,
    retryWithBackoff,
    getErrorState,
    clearErrorState,
    shouldSkipRetry,
    generateFallbackUrls,
    diagnoseError,
  }
}
