/**
 * Loading Store - 全局加载状态管理
 *
 * 统一管理应用中的各种加载状态，避免各组件分散管理
 * 支持多个并发加载任务的追踪
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export interface LoadingTask {
  id: string
  label?: string
  startTime: number
}

export const useLoadingStore = defineStore('loading', () => {
  // 活跃的加载任务
  const tasks = ref<Map<string, LoadingTask>>(new Map())

  // 全局加载状态（页面级）
  const isPageLoading = ref(false)

  // 路由加载状态
  const isRouteLoading = ref(false)

  // 计算属性：是否有任何加载任务
  const isLoading = computed(() => tasks.value.size > 0 || isPageLoading.value)

  // 计算属性：当前加载任务数量
  const loadingCount = computed(() => tasks.value.size)

  // 计算属性：所有加载任务的标签
  const loadingLabels = computed(() => {
    return Array.from(tasks.value.values())
      .filter((task) => task.label)
      .map((task) => task.label!)
  })

  /**
   * 开始一个加载任务
   * @param id 任务唯一标识
   * @param label 可选的任务描述
   * @returns 任务 ID
   */
  function startLoading(id?: string, label?: string): string {
    const taskId = id || `task-${Date.now()}-${Math.random().toString(36).slice(2)}`

    tasks.value.set(taskId, {
      id: taskId,
      ...(label !== undefined && { label }),
      startTime: Date.now(),
    })

    return taskId
  }

  /**
   * 结束一个加载任务
   * @param id 任务 ID
   */
  function stopLoading(id: string): void {
    tasks.value.delete(id)
  }

  /**
   * 检查特定任务是否在加载
   * @param id 任务 ID
   */
  function isTaskLoading(id: string): boolean {
    return tasks.value.has(id)
  }

  /**
   * 包装异步函数，自动管理加载状态
   * @param fn 异步函数
   * @param id 可选的任务 ID
   * @param label 可选的任务描述
   */
  async function withLoading<T>(fn: () => Promise<T>, id?: string, label?: string): Promise<T> {
    const taskId = startLoading(id, label)
    try {
      return await fn()
    } finally {
      stopLoading(taskId)
    }
  }

  /**
   * 设置页面级加载状态
   */
  function setPageLoading(loading: boolean): void {
    isPageLoading.value = loading
  }

  /**
   * 设置路由加载状态
   */
  function setRouteLoading(loading: boolean): void {
    isRouteLoading.value = loading
  }

  /**
   * 清除所有加载任务
   */
  function clearAll(): void {
    tasks.value.clear()
    isPageLoading.value = false
    isRouteLoading.value = false
  }

  /**
   * 获取任务的加载时长（毫秒）
   * @param id 任务 ID
   */
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
