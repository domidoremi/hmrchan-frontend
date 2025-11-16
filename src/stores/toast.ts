/**
 * Toast 通知系统 Store
 * Toast Notification System Store
 *
 * 管理应用内的通知消息
 * v2.0 - 规范化：统一Store结构，添加日志记录
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import logger from '@/utils/logger'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  title?: string
  duration?: number
}

export const useToastStore = defineStore('toast', () => {
  // 设置日志上下文
  const logContext = { category: 'ToastStore' }

  // ==================== 状态 ====================
  const toasts = ref<Toast[]>([])

  // ==================== 内部状态 ====================
  const autoRemoveTimers = new Map<string, number>()

  // ==================== 辅助函数 ====================

  /**
   * 生成唯一ID
   */
  function generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  // ==================== Actions ====================

  /**
   * 添加Toast通知
   */
  function addToast(toast: Omit<Toast, 'id'>): string {
    try {
      const id = generateId()
      const duration = toast.duration ?? 5000 // 默认5秒

      const newToast: Toast = {
        id,
        ...toast,
        duration,
      }

      toasts.value.push(newToast)

      logger.debug('Toast added', {
        ...logContext,
        id,
        type: toast.type,
        message: toast.message,
        duration,
      })

      // 自动移除
      if (duration > 0) {
        const timer = window.setTimeout(() => {
          removeToast(id)
        }, duration)
        autoRemoveTimers.set(id, timer)
      }

      return id
    } catch (error) {
      logger.error('Failed to add toast', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return ''
    }
  }

  /**
   * 移除Toast通知
   */
  function removeToast(id: string): void {
    try {
      const index = toasts.value.findIndex((t) => t.id === id)
      if (index > -1) {
        toasts.value.splice(index, 1)

        // 清除定时器
        const timer = autoRemoveTimers.get(id)
        if (timer) {
          clearTimeout(timer)
          autoRemoveTimers.delete(id)
        }

        logger.debug('Toast removed', { ...logContext, id })
      }
    } catch (error) {
      logger.error('Failed to remove toast', {
        ...logContext,
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * 清除所有Toast
   */
  function clearAll(): void {
    try {
      const count = toasts.value.length
      toasts.value = []
      autoRemoveTimers.forEach((timer) => clearTimeout(timer))
      autoRemoveTimers.clear()

      logger.debug('All toasts cleared', { ...logContext, count })
    } catch (error) {
      logger.error('Failed to clear toasts', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // ==================== 便捷方法 ====================

  /**
   * 成功提示
   */
  function success(message: string, title?: string, duration?: number): string {
    return addToast({ type: 'success', message, title, duration })
  }

  /**
   * 错误提示
   */
  function error(message: string, title?: string, duration?: number): string {
    return addToast({ type: 'error', message, title, duration: duration ?? 8000 })
  }

  /**
   * 警告提示
   */
  function warning(message: string, title?: string, duration?: number): string {
    return addToast({ type: 'warning', message, title, duration })
  }

  /**
   * 信息提示
   */
  function info(message: string, title?: string, duration?: number): string {
    return addToast({ type: 'info', message, title, duration })
  }

  return {
    // 状态
    toasts,

    // 方法
    addToast,
    removeToast,
    clearAll,
    success,
    error,
    warning,
    info,
  }
})
