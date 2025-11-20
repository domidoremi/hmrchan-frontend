/**
 * 网络状态管理
 *
 * 功能说明：
 * - 监听浏览器在线/离线状态
 * - 记录网络状态变化时间
 * - 提供网络状态查询接口
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import logger from '@/utils/logger'

export const useNetworkStore = defineStore('network', () => {
  /** 日志上下文 */
  const logContext = { category: 'NetworkStore' }

  /** 是否在线 */
  const isOnline = ref<boolean>(typeof window === 'undefined' ? true : navigator.onLine)

  /** 最后一次状态变化时间 */
  const lastChangeAt = ref<Date | null>(null)

  /** 是否已初始化 */
  let initialized = false

  /**
   * 初始化网络状态监听
   *
   * 设置浏览器在线/离线事件监听器
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

      updateNetworkStatus()

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
   * 手动更新网络状态
   *
   * @param status - 网络状态（true 为在线，false 为离线）
   */
  function updateStatus(status: boolean) {
    isOnline.value = status
    lastChangeAt.value = new Date()
    logger.debug('Network status manually updated', { ...logContext, isOnline: status })
  }

  return {
    isOnline,
    lastChangeAt,
    init,
    updateStatus,
  }
})
