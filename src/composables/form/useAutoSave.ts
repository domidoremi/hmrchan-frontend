/**
 * Auto-save composable
 * Automatically saves form data after a delay when changes are detected
 */

import { ref, watch, type Ref } from 'vue'
import { useDebounceFn } from '@/composables'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface AutoSaveOptions<T> {
  /**
   * Delay in milliseconds before saving
   * @default 2000
   */
  delay?: number

  /**
   * Whether auto-save is enabled
   * @default true
   */
  enabled?: boolean

  /**
   * Whether to save immediately on mount
   * @default false
   */
  immediate?: boolean

  /**
   * Callback when save succeeds
   */
  onSuccess?: (data: T) => void

  /**
   * Callback when save fails
   */
  onError?: (error: unknown) => void

  /**
   * Custom equality check to determine if data has changed
   * @default JSON.stringify comparison
   */
  isEqual?: (a: T, b: T) => boolean
}

/**
 * Auto-save composable
 * Automatically saves data after a delay when changes are detected
 *
 * @example
 * ```ts
 * const settings = ref({ theme: 'dark', language: 'en' })
 *
 * const { status, error, save, cancel } = useAutoSave(
 *   settings,
 *   async (data) => {
 *     await api.updateSettings(data)
 *   },
 *   { delay: 2000 }
 * )
 * ```
 */
export function useAutoSave<T>(
  data: Ref<T>,
  saveFn: (data: T) => Promise<void>,
  options: AutoSaveOptions<T> = {},
) {
  const {
    delay = 2000,
    enabled = true,
    immediate = false,
    onSuccess,
    onError,
    isEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b),
  } = options

  const status = ref<SaveStatus>('idle')
  const error = ref<unknown>(null)
  const lastSavedData = ref<T | null>(null)

  /**
   * Save function that updates status and handles errors
   */
  async function save(dataToSave: T) {
    if (!enabled) return

    // Skip if data hasn't changed
    if (lastSavedData.value && isEqual(dataToSave, lastSavedData.value)) {
      return
    }

    status.value = 'saving'
    error.value = null

    try {
      await saveFn(dataToSave)
      lastSavedData.value = JSON.parse(JSON.stringify(dataToSave)) as T
      status.value = 'saved'
      onSuccess?.(dataToSave)

      // Reset to idle after a short delay
      setTimeout(() => {
        if (status.value === 'saved') {
          status.value = 'idle'
        }
      }, 2000)
    } catch (err) {
      error.value = err
      status.value = 'error'
      onError?.(err)
    }
  }

  /**
   * Debounced save function
   */
  const {
    debounced: debouncedSave,
    cancel,
    flush,
  } = useDebounceFn((dataToSave: unknown) => save(dataToSave as T), delay)

  /**
   * Watch for data changes and trigger auto-save
   */
  watch(
    data,
    (newData) => {
      if (enabled) {
        debouncedSave(newData)
      }
    },
    { deep: true, immediate },
  )

  /**
   * Manually trigger save immediately
   */
  function saveNow() {
    cancel()
    return save(data.value)
  }

  /**
   * Cancel pending save
   */
  function cancelSave() {
    cancel()
    status.value = 'idle'
  }

  /**
   * Flush pending save immediately
   */
  function flushSave() {
    flush()
  }

  return {
    status,
    error,
    save: saveNow,
    cancel: cancelSave,
    flush: flushSave,
  }
}
