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

import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

export interface UseProgressiveRenderOptions {
  initialCount?: MaybeRefOrGetter<number>
  batchSize?: MaybeRefOrGetter<number>
}

export function useProgressiveRender<T>(
  items: MaybeRefOrGetter<T[]>,
  options: UseProgressiveRenderOptions = {}
) {
  const visibleCount = ref(0)
  const getItems = () => toValue(items)
  const getInitialCount = () => Math.max(1, Math.round(toValue(options.initialCount ?? 20)))
  const getBatchSize = () => Math.max(1, Math.round(toValue(options.batchSize ?? 20)))

  const visibleItems = computed(() => {
    const source = getItems()
    const count = Math.max(0, Math.min(visibleCount.value, source.length))
    return source.slice(0, count)
  })

  const hasMoreToRender = computed(() => visibleCount.value < getItems().length)

  function reset() {
    visibleCount.value = Math.min(getInitialCount(), getItems().length)
  }

  function revealNextBatch() {
    visibleCount.value = Math.min(getItems().length, visibleCount.value + getBatchSize())
  }

  watch(
    [() => getItems().length, getInitialCount],
    ([len]) => {
      if (len === 0) {
        visibleCount.value = 0
        return
      }

      if (visibleCount.value === 0) {
        visibleCount.value = Math.min(getInitialCount(), len)
        return
      }

      if (visibleCount.value < Math.min(getInitialCount(), len)) {
        visibleCount.value = Math.min(getInitialCount(), len)
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
