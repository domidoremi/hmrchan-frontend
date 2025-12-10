/**
 * Clipboard composable
 * Provides clipboard operations with fallback support
 */

import { ref } from 'vue'
import { useToast } from './useToast'

export interface ClipboardOptions {
  /**
   * Show success toast on copy
   */
  showSuccessToast?: boolean

  /**
   * Show error toast on failure
   */
  showErrorToast?: boolean

  /**
   * Success message
   */
  successMessage?: string

  /**
   * Error message
   */
  errorMessage?: string

  /**
   * Timeout for copied state (ms)
   */
  copiedTimeout?: number
}

/**
 * Clipboard composable
 */
export function useClipboard(options: ClipboardOptions = {}) {
  const {
    showSuccessToast = true,
    showErrorToast = true,
    successMessage = 'Copied to clipboard',
    errorMessage = 'Failed to copy',
    copiedTimeout = 2000,
  } = options

  const toast = useToast()

  const copied = ref(false)
  const error = ref<Error | null>(null)
  const text = ref('')

  let timeoutId: ReturnType<typeof setTimeout> | null = null

  /**
   * Check if clipboard API is supported
   */
  const isSupported = typeof navigator !== 'undefined' && 'clipboard' in navigator

  /**
   * Copy text to clipboard
   */
  async function copy(value: string): Promise<boolean> {
    error.value = null

    try {
      if (isSupported) {
        // Use modern Clipboard API
        await navigator.clipboard.writeText(value)
      } else {
        // Fallback for older browsers
        await copyFallback(value)
      }

      text.value = value
      copied.value = true

      if (showSuccessToast) {
        toast.success(successMessage)
      }

      // Reset copied state after timeout
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(() => {
        copied.value = false
        timeoutId = null
      }, copiedTimeout)

      return true
    } catch (err) {
      const copyError = err instanceof Error ? err : new Error('Failed to copy')
      error.value = copyError

      if (showErrorToast) {
        toast.error(errorMessage)
      }

      return false
    }
  }

  /**
   * Fallback copy method using execCommand
   */
  function copyFallback(value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const textarea = document.createElement('textarea')
      textarea.value = value
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      textarea.style.pointerEvents = 'none'

      document.body.appendChild(textarea)

      try {
        textarea.select()
        textarea.setSelectionRange(0, value.length)

        const successful = document.execCommand('copy')

        if (successful) {
          resolve()
        } else {
          reject(new Error('Copy command failed'))
        }
      } catch (err) {
        reject(err)
      } finally {
        document.body.removeChild(textarea)
      }
    })
  }

  /**
   * Read text from clipboard
   */
  async function read(): Promise<string> {
    error.value = null

    try {
      if (!isSupported) {
        throw new Error('Clipboard API not supported')
      }

      const clipboardText = await navigator.clipboard.readText()
      text.value = clipboardText
      return clipboardText
    } catch (err) {
      const readError = err instanceof Error ? err : new Error('Failed to read clipboard')
      error.value = readError
      throw readError
    }
  }

  /**
   * Copy element text content
   */
  async function copyElement(element: HTMLElement): Promise<boolean> {
    const textContent = element.textContent || ''
    return copy(textContent)
  }

  /**
   * Copy from input/textarea element
   */
  async function copyFromInput(input: HTMLInputElement | HTMLTextAreaElement): Promise<boolean> {
    return copy(input.value)
  }

  return {
    isSupported,
    copied,
    error,
    text,
    copy,
    read,
    copyElement,
    copyFromInput,
  }
}

/**
 * Simple copy to clipboard function
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && 'clipboard' in navigator) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'

      document.body.appendChild(textarea)
      textarea.select()

      const successful = document.execCommand('copy')
      document.body.removeChild(textarea)

      return successful
    }
  } catch {
    return false
  }
}
