/**
 * Toast Store - 通知消息状态管理
 */

import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  title?: string
  duration: number
  action?: ToastAction
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])
  const timeoutIds = new Map<string, ReturnType<typeof setTimeout>>()
  const pausedToasts = new Set<string>()

  function addToast(
    type: Toast['type'],
    message: string,
    duration = 4000,
    options?: { title?: string; action?: ToastAction }
  ) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const toast: Toast = {
      id,
      type,
      message,
      duration,
      title: options?.title,
      action: options?.action,
    }
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

    pausedToasts.delete(id)

    const index = toasts.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  function pauseTimer(id: string) {
    const timeoutId = timeoutIds.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      pausedToasts.add(id)
    }
  }

  function resumeTimer(id: string) {
    if (!pausedToasts.has(id)) return

    const toast = toasts.value.find((t) => t.id === id)
    if (toast && toast.duration > 0) {
      const timeoutId = setTimeout(() => {
        removeToast(id)
      }, toast.duration)
      timeoutIds.set(id, timeoutId)
      pausedToasts.delete(id)
    }
  }

  function success(message: string, duration?: number, options?: { title?: string }) {
    return addToast('success', message, duration, options)
  }

  function error(message: string, duration?: number, options?: { title?: string }) {
    return addToast('error', message, duration, options)
  }

  function warning(message: string, duration?: number, options?: { title?: string }) {
    return addToast('warning', message, duration, options)
  }

  function info(
    message: string,
    duration?: number,
    options?: { title?: string; action?: ToastAction }
  ) {
    return addToast('info', message, duration, options)
  }

  function clear() {
    // 清理所有定时器
    timeoutIds.forEach((timeoutId) => clearTimeout(timeoutId))
    timeoutIds.clear()
    pausedToasts.clear()
    toasts.value = []
  }

  return {
    toasts,
    addToast,
    removeToast,
    pauseTimer,
    resumeTimer,
    success,
    error,
    warning,
    info,
    clear,
  }
})
