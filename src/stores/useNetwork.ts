/**
 * 网络状态管理
 * Network Status Store
 *
 * 用于跟踪在线/离线状态，并在需要的地方统一使用
 * v2.0 - 规范化：统一Store结构，添加日志记录
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import logger from '@/utils/logger'

export const useNetworkStore = defineStore('network', () => {
  // 设置日志上下文
  const logContext = { category: 'NetworkStore' }

  // ==================== 状态 ====================
  const isOnline = ref<boolean>(typeof window === 'undefined' ? true : navigator.onLine)
  const lastChangeAt = ref<Date | null>(null)

  // ==================== 内部状态 ====================
  let initialized = false

  // ==================== Actions ====================

  /**
   * 初始化网络状态监听
   */
  function init() {
    if (initialized || typeof window === 'undefined') {
      logger.debug('Network store already initialized or running in SSR', logContext)
      return
    }

    try {
      initialized = true

      const updateNetworkStatus = () => {
        const previousStatus = isOnline.value
        isOnline.value = navigator.onLine
        lastChangeAt.value = new Date()

        if (previousStatus !== isOnline.value) {
          logger.info(`Network status changed: ${isOnline.value ? 'online' : 'offline'}`, {
            ...logContext,
            isOnline: isOnline.value,
            timestamp: lastChangeAt.value,
          })
        }
      }

      // 初始更新
      updateNetworkStatus()

      // 监听网络状态变化
      window.addEventListener('online', updateNetworkStatus)
      window.addEventListener('offline', updateNetworkStatus)

      logger.info('Network store initialized successfully', {
        ...logContext,
        initialStatus: isOnline.value,
      })
    } catch (error) {
      logger.error('Failed to initialize network store', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * 手动更新网络状态（用于测试）
   */
  function updateStatus(status: boolean) {
    isOnline.value = status
    lastChangeAt.value = new Date()
    logger.debug('Network status manually updated', { ...logContext, isOnline: status })
  }

  return {
    // 状态
    isOnline,
    lastChangeAt,

    // 方法
    init,
    updateStatus,
  }
})
