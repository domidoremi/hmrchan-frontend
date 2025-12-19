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
