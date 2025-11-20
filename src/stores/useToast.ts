/**
 * Toast 通知状态管理
 *
 * 功能说明：
 * - 管理应用内的 Toast 通知消息
 * - 支持成功、错误、警告、信息四种类型
 * - 自动定时移除通知
 * - 提供便捷的通知方法
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import logger from '@/utils/logger'

/** Toast 通知类型 */
export type ToastType = 'success' | 'error' | 'warning' | 'info'

/**
 * Toast 通知接口定义
 */
export interface Toast {
  /** 唯一标识符 */
  id: string

  /** 通知类型 */
  type: ToastType

  /** 通知消息内容 */
  message: string

  /** 通知标题（可选） */
  title?: string

  /** 显示时长（毫秒，0 表示不自动关闭） */
  duration?: number
}

export const useToastStore = defineStore('toast', () => {
  /** 日志上下文 */
  const logContext = { category: 'ToastStore' }

  /** Toast 通知列表 */
  const toasts = ref<Toast[]>([])

  /** 自动移除定时器映射表 */
  const autoRemoveTimers = new Map<string, number>()

  /**
   * 生成唯一 ID
   *
   * @returns 唯一标识符字符串
   */
  function generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * 添加 Toast 通知
   *
   * @param toast - Toast 通知配置（不含 id）
   * @returns Toast 的唯一标识符
   */
  function addToast(toast: Omit<Toast, 'id'>): string {
    try {
      const id = generateId()
      const duration = toast.duration ?? 5000

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
   * 移除 Toast 通知
   *
   * @param id - Toast 的唯一标识符
   */
  function removeToast(id: string): void {
    try {
      const index = toasts.value.findIndex((t) => t.id === id)
      if (index > -1) {
        toasts.value.splice(index, 1)

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
   * 清除所有 Toast 通知
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

  /**
   * 显示成功提示
   *
   * @param message - 提示消息
   * @param title - 提示标题（可选）
   * @param duration - 显示时长（可选）
   * @returns Toast 的唯一标识符
   */
  function success(message: string, title?: string, duration?: number): string {
    return addToast({ type: 'success', message, title, duration })
  }

  /**
   * 显示错误提示
   *
   * @param message - 提示消息
   * @param title - 提示标题（可选）
   * @param duration - 显示时长（可选，默认 8 秒）
   * @returns Toast 的唯一标识符
   */
  function error(message: string, title?: string, duration?: number): string {
    return addToast({ type: 'error', message, title, duration: duration ?? 8000 })
  }

  /**
   * 显示警告提示
   *
   * @param message - 提示消息
   * @param title - 提示标题（可选）
   * @param duration - 显示时长（可选）
   * @returns Toast 的唯一标识符
   */
  function warning(message: string, title?: string, duration?: number): string {
    return addToast({ type: 'warning', message, title, duration })
  }

  /**
   * 显示信息提示
   *
   * @param message - 提示消息
   * @param title - 提示标题（可选）
   * @param duration - 显示时长（可选）
   * @returns Toast 的唯一标识符
   */
  function info(message: string, title?: string, duration?: number): string {
    return addToast({ type: 'info', message, title, duration })
  }

  return {
    toasts,
    addToast,
    removeToast,
    clearAll,
    success,
    error,
    warning,
    info,
  }
})
