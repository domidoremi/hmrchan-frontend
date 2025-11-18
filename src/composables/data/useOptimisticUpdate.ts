/**
 * Optimistic update composable
 * Provides optimistic UI updates with automatic rollback on error
 */

import { ref } from 'vue'
import { useToast } from '@/composables'

export interface OptimisticUpdateOptions<T> {
  /**
   * Callback to update local state optimistically
   */
  onOptimisticUpdate?: (data: T) => void

  /**
   * Callback to rollback on error
   */
  onRollback?: (data: T) => void

  /**
   * Show success toast
   */
  showSuccessToast?: boolean

  /**
   * Show error toast
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
   * Callback on success
   */
  onSuccess?: (result: unknown) => void

  /**
   * Callback on error
   */
  onError?: (error: Error) => void
}

/**
 * Optimistic update composable
 */
export function useOptimisticUpdate<T>(options: OptimisticUpdateOptions<T> = {}) {
  const {
    onOptimisticUpdate,
    onRollback,
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = 'Update successful',
    errorMessage = 'Update failed',
    onSuccess,
    onError,
  } = options

  const toast = useToast()

  const loading = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Execute optimistic update
   */
  async function execute(
    updateFn: (data: T) => Promise<unknown>,
    data: T,
  ): Promise<{ success: boolean; result?: unknown; error?: Error }> {
    loading.value = true
    error.value = null

    // Store original state for rollback
    const originalData = structuredClone(data)

    // Apply optimistic update
    onOptimisticUpdate?.(data)

    try {
      // Perform actual update
      const result = await updateFn(data)

      // Success
      if (showSuccessToast) {
        toast.success(successMessage)
      }

      onSuccess?.(result)

      return { success: true, result }
    } catch (err) {
      // Rollback on error
      const updateError = err instanceof Error ? err : new Error('Update failed')
      error.value = updateError

      onRollback?.(originalData)

      if (showErrorToast) {
        toast.error(errorMessage)
      }

      onError?.(updateError)

      return { success: false, error: updateError }
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    execute,
  }
}

/**
 * List optimistic update composable
 * Specialized for list operations (add, remove, update)
 */
export function useListOptimisticUpdate<T extends { id: string | number }>(
  list: { value: T[] },
  options: Omit<OptimisticUpdateOptions<T>, 'onOptimisticUpdate' | 'onRollback'> = {},
) {
  const optimistic = useOptimisticUpdate<T>(options)

  /**
   * Add item optimistically
   */
  async function add(item: T, addFn: (item: T) => Promise<T>): Promise<{ success: boolean }> {
    // Optimistically add to list
    list.value.push(item)

    const result = await optimistic.execute(async () => {
      const newItem = await addFn(item)
      // Replace temporary item with server response
      const index = list.value.findIndex((i) => i.id === item.id)
      if (index !== -1) {
        list.value[index] = newItem
      }
      return newItem
    }, item)

    // Rollback on error
    if (!result.success) {
      const index = list.value.findIndex((i) => i.id === item.id)
      if (index !== -1) {
        list.value.splice(index, 1)
      }
    }

    return { success: result.success }
  }

  /**
   * Remove item optimistically
   */
  async function remove(
    itemId: string | number,
    removeFn: (id: string | number) => Promise<void>,
  ): Promise<{ success: boolean }> {
    // Find and store item
    const index = list.value.findIndex((i) => i.id === itemId)
    if (index === -1) return { success: false }

    const item = list.value[index]
    if (!item) return { success: false }

    // Optimistically remove from list
    list.value.splice(index, 1)

    const result = await optimistic.execute(async () => {
      await removeFn(itemId)
    }, item)

    // Rollback on error
    if (!result.success) {
      list.value.splice(index, 0, item)
    }

    return { success: result.success }
  }

  /**
   * Update item optimistically
   */
  async function update(
    itemId: string | number,
    updates: Partial<T>,
    updateFn: (id: string | number, updates: Partial<T>) => Promise<T>,
  ): Promise<{ success: boolean }> {
    // Find item
    const index = list.value.findIndex((i) => i.id === itemId)
    if (index === -1) return { success: false }

    const currentItem = list.value[index]
    if (!currentItem) return { success: false }

    const originalItem = { ...currentItem }

    // Optimistically update
    list.value[index] = { ...currentItem, ...updates } as T

    const updatedCurrentItem = list.value[index]
    if (!updatedCurrentItem) return { success: false }

    const result = await optimistic.execute(async () => {
      const updatedItem = await updateFn(itemId, updates)
      // Update with server response
      const currentIndex = list.value.findIndex((i) => i.id === itemId)
      if (currentIndex !== -1) {
        list.value[currentIndex] = updatedItem
      }
      return updatedItem
    }, updatedCurrentItem)

    // Rollback on error
    if (!result.success) {
      const currentIndex = list.value.findIndex((i) => i.id === itemId)
      if (currentIndex !== -1) {
        list.value[currentIndex] = originalItem as T
      }
    }

    return { success: result.success }
  }

  /**
   * Toggle boolean property optimistically
   */
  async function toggle(
    itemId: string | number,
    property: keyof T,
    toggleFn: (id: string | number, value: boolean) => Promise<void>,
  ): Promise<{ success: boolean }> {
    const index = list.value.findIndex((i) => i.id === itemId)
    if (index === -1) return { success: false }

    const item = list.value[index]
    if (!item) return { success: false }

    const originalValue = item[property]

    if (typeof originalValue !== 'boolean') {
      console.error(`Property ${String(property)} is not a boolean`)
      return { success: false }
    }

    // Optimistically toggle
    const currentIndex = list.value.findIndex((i) => i.id === itemId)
    if (currentIndex !== -1) {
      const currentItem = list.value[currentIndex]
      if (currentItem) {
        ;(currentItem[property] as boolean) = !originalValue
      }
    }

    const result = await optimistic.execute(async () => {
      await toggleFn(itemId, !originalValue)
    }, item)

    // Rollback on error
    if (!result.success) {
      const rollbackIndex = list.value.findIndex((i) => i.id === itemId)
      if (rollbackIndex !== -1) {
        const rollbackItem = list.value[rollbackIndex]
        if (rollbackItem) {
          ;(rollbackItem[property] as boolean) = originalValue
        }
      }
    }

    return { success: result.success }
  }

  return {
    loading: optimistic.loading,
    error: optimistic.error,
    add,
    remove,
    update,
    toggle,
  }
}
