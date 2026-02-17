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
  /** 记录每个 toast 的剩余时间和暂停时刻 */
  const remainingTime = new Map<string, number>()
  const pauseStartTime = new Map<string, number>()

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
      remainingTime.set(id, duration)
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

    remainingTime.delete(id)
    pauseStartTime.delete(id)

    const index = toasts.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  function pauseTimer(id: string) {
    const timeoutId = timeoutIds.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutIds.delete(id)
      pauseStartTime.set(id, Date.now())
    }
  }

  function resumeTimer(id: string) {
    if (!pauseStartTime.has(id)) return

    const pausedAt = pauseStartTime.get(id)!
    const remaining = remainingTime.get(id) ?? 0
    const elapsed = Date.now() - pausedAt
    const left = Math.max(remaining - elapsed, 100)

    pauseStartTime.delete(id)
    remainingTime.set(id, left)

    const timeoutId = setTimeout(() => {
      removeToast(id)
    }, left)
    timeoutIds.set(id, timeoutId)
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
    remainingTime.clear()
    pauseStartTime.clear()
    toasts.value = []
  }

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      clear()
    })
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
