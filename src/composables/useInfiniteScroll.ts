/**
 * useInfiniteScroll - 无限滚动 Composable
 *
 * 使用 IntersectionObserver 实现高性能的无限滚动加载
 * 支持 KeepAlive 组件的激活/停用生命周期
 *
 * 特性：
 * - 基于 IntersectionObserver，比滚动事件监听更高效
 * - 自动处理组件挂载/卸载和 KeepAlive 激活/停用
 * - 支持条件启用/禁用
 * - 防止重复触发
 */

import { ref, onMounted, onUnmounted, onActivated, onDeactivated, watch, type Ref } from 'vue'

export interface UseInfiniteScrollOptions {
  threshold?: number
  rootMargin?: string
  enabled?: Ref<boolean> | (() => boolean)
}

export function useInfiniteScroll(
  sentinelRef: Ref<HTMLElement | null>,
  loadMore: () => void | boolean | Promise<void | boolean>,
  options: UseInfiniteScrollOptions = {}
) {
  const { threshold = 0, rootMargin = '200px', enabled } = options

  let observer: IntersectionObserver | null = null
  const isObserving = ref(false)
  let lastIsIntersecting = false
  let isTriggering = false

  function getEnabled(): boolean {
    if (enabled === undefined) return true
    if (typeof enabled === 'function') return enabled()
    return enabled.value
  }

  async function triggerLoadMore() {
    if (isTriggering) return
    if (!getEnabled()) return

    isTriggering = true
    try {
      const result = await loadMore()
      if (result === false) return

      if (lastIsIntersecting && getEnabled() && observer && sentinelRef.value) {
        observer.unobserve(sentinelRef.value)
        observer.observe(sentinelRef.value)
      }
    } catch {
      return
    } finally {
      isTriggering = false
    }
  }

  function handleIntersect(entries: IntersectionObserverEntry[]) {
    const entry = entries[0]
    lastIsIntersecting = Boolean(entry?.isIntersecting)

    if (entry?.isIntersecting) {
      void triggerLoadMore()
    }
  }

  function startObserving() {
    if (isObserving.value || !sentinelRef.value) return

    observer = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin,
      threshold,
    })

    observer.observe(sentinelRef.value)
    isObserving.value = true
  }

  function stopObserving() {
    if (!isObserving.value || !observer) return

    observer.disconnect()
    observer = null
    isObserving.value = false
  }

  watch(sentinelRef, (el) => {
    stopObserving()
    if (el) {
      startObserving()
    }
  })

  onMounted(() => {
    if (sentinelRef.value) {
      startObserving()
    }
  })

  onActivated(() => {
    if (sentinelRef.value && !isObserving.value) {
      startObserving()
    }
  })

  onDeactivated(() => {
    stopObserving()
  })

  onUnmounted(() => {
    stopObserving()
  })

  return {
    isObserving,
    startObserving,
    stopObserving,
  }
}
