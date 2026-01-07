/**
 * Toast Store - 通知消息状态管理
 */

import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration: number
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])
  const timeoutIds = new Map<string, ReturnType<typeof setTimeout>>()

  function addToast(type: Toast['type'], message: string, duration = 4000) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const toast: Toast = { id, type, message, duration }
    toasts.value.push(toast)

    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        removeToast(id)
      }, duration)
      timeoutIds.set(id, timeoutId)
    }

    return id
  }

  function removeToast(id: string) {
    // 清理定时器
    const timeoutId = timeoutIds.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutIds.delete(id)
    }

    const index = toasts.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  function success(message: string, duration?: number) {
    return addToast('success', message, duration)
  }

  function error(message: string, duration?: number) {
    return addToast('error', message, duration)
  }

  function warning(message: string, duration?: number) {
    return addToast('warning', message, duration)
  }

  function info(message: string, duration?: number) {
    return addToast('info', message, duration)
  }

  function clear() {
    // 清理所有定时器
    timeoutIds.forEach((timeoutId) => clearTimeout(timeoutId))
    timeoutIds.clear()
    toasts.value = []
  }

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    clear,
  }
})
