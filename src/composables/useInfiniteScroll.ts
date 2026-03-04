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

import {
  ref,
  onMounted,
  onUnmounted,
  onActivated,
  onDeactivated,
  watch,
  effectScope,
  getCurrentScope,
  onScopeDispose,
  toValue,
  type MaybeRefOrGetter,
} from 'vue'

export interface UseInfiniteScrollOptions {
  threshold?: number
  rootMargin?: string
  enabled?: MaybeRefOrGetter<boolean>
}

export function useInfiniteScroll(
  sentinelRef: MaybeRefOrGetter<HTMLElement | null>,
  loadMore: () => void | boolean | Promise<void | boolean>,
  options: UseInfiniteScrollOptions = {}
) {
  const { threshold = 0, rootMargin = '200px', enabled } = options

  let observer: IntersectionObserver | null = null
  let observedElement: HTMLElement | null = null
  const isObserving = ref(false)
  let lastIsIntersecting = false
  let isTriggering = false

  function getSentinel() {
    return toValue(sentinelRef)
  }

  function getEnabled(): boolean {
    if (enabled === undefined) return true
    return toValue(enabled)
  }

  async function triggerLoadMore() {
    if (isTriggering) return
    if (!getEnabled()) return

    isTriggering = true
    try {
      const result = await loadMore()
      if (result === false) return

      const sentinel = getSentinel()
      if (lastIsIntersecting && getEnabled() && observer && sentinel) {
        observer.unobserve(sentinel)
        observer.observe(sentinel)
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
    const sentinel = getSentinel()
    if (isObserving.value || !sentinel || !getEnabled()) return

    observer = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin,
      threshold,
    })

    observer.observe(sentinel)
    observedElement = sentinel
    isObserving.value = true
  }

  function stopObserving() {
    if (!isObserving.value || !observer) return

    observer.disconnect()
    observer = null
    observedElement = null
    isObserving.value = false
  }

  const reactiveScope = effectScope()
  reactiveScope.run(() => {
    watch(
      () => getSentinel(),
      (el) => {
        if (el && isObserving.value && observedElement === el) return
        stopObserving()
        if (el) {
          startObserving()
        }
      }
    )

    watch(
      () => getEnabled(),
      (isEnabled) => {
        if (!isEnabled) {
          stopObserving()
          return
        }

        const sentinel = getSentinel()
        if (sentinel) {
          startObserving()
          if (observer) {
            observer.unobserve(sentinel)
            observer.observe(sentinel)
          }
        }
      },
      { immediate: true }
    )
  })

  let disposed = false
  function dispose() {
    if (disposed) return
    disposed = true
    stopObserving()
    reactiveScope.stop()
  }

  if (getCurrentScope()) {
    onScopeDispose(dispose)
  }

  onMounted(() => {
    if (getEnabled() && getSentinel()) {
      startObserving()
    }
  })

  onActivated(() => {
    if (getEnabled() && getSentinel() && !isObserving.value) {
      startObserving()
    }
  })

  onDeactivated(() => {
    stopObserving()
  })

  onUnmounted(() => {
    dispose()
  })

  return {
    isObserving,
    startObserving,
    stopObserving,
  }
}
