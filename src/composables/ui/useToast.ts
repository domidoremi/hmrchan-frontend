/**
 * Toast composable
 * Wrapper around the toast store for easier usage in components
 */

import { useToastStore } from '@/stores/toast'
import type { ToastType } from '@/stores/toast'

export interface ToastOptions {
  title?: string
  duration?: number
}

/**
 * Toast notification composable
 * Provides convenient methods to show toast notifications
 */
export function useToast() {
  const toastStore = useToastStore()

  /**
   * Show a success toast
   */
  function success(message: string, options: ToastOptions = {}) {
    return toastStore.success(message, options.title, options.duration)
  }

  /**
   * Show an error toast
   */
  function error(message: string, options: ToastOptions = {}) {
    return toastStore.error(message, options.title, options.duration)
  }

  /**
   * Show a warning toast
   */
  function warning(message: string, options: ToastOptions = {}) {
    return toastStore.warning(message, options.title, options.duration)
  }

  /**
   * Show an info toast
   */
  function info(message: string, options: ToastOptions = {}) {
    return toastStore.info(message, options.title, options.duration)
  }

  /**
   * Show a custom toast
   */
  function show(type: ToastType, message: string, options: ToastOptions = {}) {
    return toastStore.addToast({
      type,
      message,
      title: options.title,
      duration: options.duration,
    })
  }

  /**
   * Remove a specific toast
   */
  function remove(id: string) {
    toastStore.removeToast(id)
  }

  /**
   * Clear all toasts
   */
  function clear() {
    toastStore.clearAll()
  }

  /**
   * Promise-based toast for async operations
   */
  async function promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: unknown) => string)
    },
    options: ToastOptions = {},
  ): Promise<T> {
    const loadingId = info(messages.loading, { ...options, duration: 0 })

    try {
      const result = await promise
      remove(loadingId)

      const successMessage =
        typeof messages.success === 'function' ? messages.success(result) : messages.success

      success(successMessage, options)
      return result
    } catch (err) {
      remove(loadingId)

      const errorMessage =
        typeof messages.error === 'function' ? messages.error(err) : messages.error

      error(errorMessage, options)
      throw err
    }
  }

  return {
    success,
    error,
    warning,
    info,
    show,
    remove,
    clear,
    promise,
    // Expose store for advanced usage
    toasts: toastStore.toasts,
  }
}
