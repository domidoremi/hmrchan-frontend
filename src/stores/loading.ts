import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export interface LoadingTask {
  id: string
  label?: string
  startTime: number
}

export const useLoadingStore = defineStore('loading', () => {
  const tasks = ref<Map<string, LoadingTask>>(new Map())

  const isPageLoading = ref(false)

  const isRouteLoading = ref(false)

  const isLoading = computed(() => tasks.value.size > 0 || isPageLoading.value)

  const loadingCount = computed(() => tasks.value.size)

  const loadingLabels = computed(() => {
    return Array.from(tasks.value.values())
      .filter((task) => task.label)
      .map((task) => task.label!)
  })

  function startLoading(id?: string, label?: string): string {
    const taskId = id || `task-${Date.now()}-${Math.random().toString(36).slice(2)}`

    tasks.value.set(taskId, {
      id: taskId,
      ...(label !== undefined && { label }),
      startTime: Date.now(),
    })

    return taskId
  }

  function stopLoading(id: string): void {
    tasks.value.delete(id)
  }

  function isTaskLoading(id: string): boolean {
    return tasks.value.has(id)
  }

  async function withLoading<T>(fn: () => Promise<T>, id?: string, label?: string): Promise<T> {
    const taskId = startLoading(id, label)
    try {
      return await fn()
    } finally {
      stopLoading(taskId)
    }
  }

  function setPageLoading(loading: boolean): void {
    isPageLoading.value = loading
  }

  function setRouteLoading(loading: boolean): void {
    isRouteLoading.value = loading
  }

  function clearAll(): void {
    tasks.value.clear()
    isPageLoading.value = false
    isRouteLoading.value = false
  }

  function getTaskDuration(id: string): number | null {
    const task = tasks.value.get(id)
    if (!task) return null
    return Date.now() - task.startTime
  }

  return {
    // State
    tasks,
    isPageLoading,
    isRouteLoading,

    // Computed
    isLoading,
    loadingCount,
    loadingLabels,

    // Actions
    startLoading,
    stopLoading,
    isTaskLoading,
    withLoading,
    setPageLoading,
    setRouteLoading,
    clearAll,
    getTaskDuration,
  }
})
