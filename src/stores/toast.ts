import { onScopeDispose, reactive, ref } from 'vue'
import { defineStore } from 'pinia'

export interface ToastAction {
  label: string
  onClick: () => void | Promise<void>
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  title?: string
  duration: number
  action?: ToastAction
}

type PauseReason = 'pointer' | 'focus' | 'hidden' | 'window' | 'queued' | 'collapsed' | 'action'
interface ToastTiming {
  remaining: number
  startedAt: number
  paused: boolean
  revision: number
}
interface ToastOptions {
  title?: string
  action?: ToastAction
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])
  const timings = reactive(new Map<string, ToastTiming>())
  const reasons = new Map<string, Set<PauseReason>>()
  const timeoutIds = new Map<string, ReturnType<typeof setTimeout>>()
  let pageHidden = false
  let windowFocused = true

  function cancelTimer(id: string) {
    const timeout = timeoutIds.get(id)
    if (timeout !== undefined) clearTimeout(timeout)
    timeoutIds.delete(id)
  }

  function startTimer(id: string) {
    const timing = timings.get(id)
    if (!timing || reasons.get(id)?.size) return
    const toast = toasts.value.find((item) => item.id === id)
    if (!toast || toast.duration <= 0) return
    timing.paused = false
    timing.startedAt = performance.now()
    timing.revision++
    cancelTimer(id)
    timeoutIds.set(
      id,
      setTimeout(() => removeToast(id), timing.remaining)
    )
  }

  function addToast(
    type: Toast['type'],
    message: string,
    duration?: number,
    options?: ToastOptions
  ) {
    const fallback = type === 'error' ? 0 : Math.min(12000, Math.max(6000, message.length * 70))
    const lifetime =
      duration === undefined || !Number.isFinite(duration) ? fallback : Math.max(0, duration)
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const pauses = new Set<PauseReason>(['queued'])
    if (pageHidden) pauses.add('hidden')
    if (!windowFocused) pauses.add('window')
    reasons.set(id, pauses)
    timings.set(id, { remaining: lifetime, startedAt: 0, paused: true, revision: 0 })
    toasts.value.push({
      id,
      type,
      message,
      duration: lifetime,
      ...(options?.title === undefined ? {} : { title: options.title }),
      ...(options?.action === undefined ? {} : { action: options.action }),
    })
    return id
  }

  function removeToast(id: string) {
    cancelTimer(id)
    timings.delete(id)
    reasons.delete(id)
    const index = toasts.value.findIndex((toast) => toast.id === id)
    if (index !== -1) toasts.value.splice(index, 1)
  }

  function pauseTimer(id: string, reason: PauseReason = 'pointer') {
    const timing = timings.get(id),
      pauses = reasons.get(id)
    if (!timing || !pauses || pauses.has(reason)) return
    if (!timing.paused)
      timing.remaining = Math.max(0, timing.remaining - (performance.now() - timing.startedAt))
    pauses.add(reason)
    timing.paused = true
    timing.revision++
    cancelTimer(id)
  }

  function resumeTimer(id: string, reason: PauseReason = 'pointer') {
    const pauses = reasons.get(id)
    if (!pauses?.delete(reason) || pauses.size) return
    startTimer(id)
  }

  function setVisibleToasts(ids: string[]) {
    const visible = new Set(ids)
    for (const toast of toasts.value) {
      if (visible.has(toast.id)) resumeTimer(toast.id, 'queued')
      else pauseTimer(toast.id, 'queued')
    }
  }

  function setPageHidden(hidden: boolean) {
    pageHidden = hidden
    for (const toast of toasts.value) {
      if (hidden) pauseTimer(toast.id, 'hidden')
      else resumeTimer(toast.id, 'hidden')
    }
  }

  function setWindowFocused(focused: boolean) {
    windowFocused = focused
    for (const toast of toasts.value) {
      if (focused) resumeTimer(toast.id, 'window')
      else pauseTimer(toast.id, 'window')
    }
  }

  function success(message: string, duration?: number, options?: ToastOptions) {
    return addToast('success', message, duration, options)
  }
  function error(message: string, duration?: number, options?: ToastOptions) {
    return addToast('error', message, duration, options)
  }
  function warning(message: string, duration?: number, options?: ToastOptions) {
    return addToast('warning', message, duration, options)
  }
  function info(message: string, duration?: number, options?: ToastOptions) {
    return addToast('info', message, duration, options)
  }

  function clear() {
    timeoutIds.forEach(clearTimeout)
    timeoutIds.clear()
    timings.clear()
    reasons.clear()
    toasts.value = []
  }

  onScopeDispose(clear)
  if (import.meta.hot) import.meta.hot.dispose(clear)

  return {
    toasts,
    timings,
    addToast,
    removeToast,
    pauseTimer,
    resumeTimer,
    setVisibleToasts,
    setPageHidden,
    setWindowFocused,
    success,
    error,
    warning,
    info,
    clear,
  }
})
