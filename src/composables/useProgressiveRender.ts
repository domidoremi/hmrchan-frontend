/**
 * useProgressiveRender - 渐进式渲染 Composable
 *
 * 分批渲染大量数据，避免一次性渲染导致的页面卡顿
 * 适用于长列表、瀑布流等场景
 *
 * 特性：
 * - 初始只渲染部分数据，后续按需加载
 * - 自动响应数据源变化
 * - 支持自定义初始数量和批次大小
 */

import { computed, ref, watch, type Ref } from 'vue'

export interface UseProgressiveRenderOptions {
  initialCount?: number
  batchSize?: number
}

export function useProgressiveRender<T>(
  items: Ref<T[]>,
  options: UseProgressiveRenderOptions = {}
) {
  const { initialCount = 20, batchSize = 20 } = options

  const visibleCount = ref(0)

  const visibleItems = computed(() => {
    const count = Math.max(0, Math.min(visibleCount.value, items.value.length))
    return items.value.slice(0, count)
  })

  const hasMoreToRender = computed(() => visibleCount.value < items.value.length)

  function reset() {
    visibleCount.value = Math.min(initialCount, items.value.length)
  }

  function revealNextBatch() {
    visibleCount.value = Math.min(items.value.length, visibleCount.value + batchSize)
  }

  watch(
    () => items.value.length,
    (len) => {
      if (len === 0) {
        visibleCount.value = 0
        return
      }

      if (visibleCount.value === 0) {
        visibleCount.value = Math.min(initialCount, len)
        return
      }

      if (visibleCount.value > len) {
        visibleCount.value = len
      }
    },
    { immediate: true }
  )

  return {
    visibleCount,
    visibleItems,
    hasMoreToRender,
    reset,
    revealNextBatch,
  }
}
