/**
 * Toast 通知系统 Store
 * Toast Notification System Store
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  title?: string
  duration?: number
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])
  const autoRemoveTimers = new Map<string, number>()

  /**
   * 生成唯一ID
   */
  const generateId = (): string => {
    return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * 添加Toast通知
   */
  const addToast = (toast: Omit<Toast, 'id'>): string => {
    const id = generateId()
    const duration = toast.duration ?? 5000 // 默认5秒

    const newToast: Toast = {
      id,
      ...toast,
      duration,
    }

    toasts.value.push(newToast)

    // 自动移除
    if (duration > 0) {
      const timer = window.setTimeout(() => {
        removeToast(id)
      }, duration)
      autoRemoveTimers.set(id, timer)
    }

    return id
  }

  /**
   * 移除Toast通知
   */
  const removeToast = (id: string) => {
    const index = toasts.value.findIndex((t) => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)

      // 清除定时器
      const timer = autoRemoveTimers.get(id)
      if (timer) {
        clearTimeout(timer)
        autoRemoveTimers.delete(id)
      }
    }
  }

  /**
   * 清除所有Toast
   */
  const clearAll = () => {
    toasts.value = []
    autoRemoveTimers.forEach((timer) => clearTimeout(timer))
    autoRemoveTimers.clear()
  }

  /**
   * 便捷方法：成功提示
   */
  const success = (message: string, title?: string, duration?: number) => {
    return addToast({ type: 'success', message, title, duration })
  }

  /**
   * 便捷方法：错误提示
   */
  const error = (message: string, title?: string, duration?: number) => {
    return addToast({ type: 'error', message, title, duration: duration ?? 8000 })
  }

  /**
   * 便捷方法：警告提示
   */
  const warning = (message: string, title?: string, duration?: number) => {
    return addToast({ type: 'warning', message, title, duration })
  }

  /**
   * 便捷方法：信息提示
   */
  const info = (message: string, title?: string, duration?: number) => {
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
