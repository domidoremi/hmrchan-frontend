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
  shallowReactive,
  shallowReadonly,
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
  const resolvedOptions = shallowReadonly({
    threshold: options.threshold ?? 0,
    rootMargin: options.rootMargin ?? '200px',
    enabled: options.enabled,
  })

  const observerState = shallowReactive({
    observer: null as IntersectionObserver | null,
    observedElement: null as HTMLElement | null,
    lastIsIntersecting: false,
    isTriggering: false,
  })
  const isObserving = ref(false)

  function getSentinel() {
    return toValue(sentinelRef)
  }

  function getEnabled(): boolean {
    if (resolvedOptions.enabled === undefined) return true
    return toValue(resolvedOptions.enabled)
  }

  async function triggerLoadMore() {
    if (observerState.isTriggering) return
    if (!getEnabled()) return

    observerState.isTriggering = true
    try {
      const result = await loadMore()
      if (result === false) return

      const sentinel = getSentinel()
      if (observerState.lastIsIntersecting && getEnabled() && observerState.observer && sentinel) {
        observerState.observer.unobserve(sentinel)
        observerState.observer.observe(sentinel)
      }
    } catch {
      return
    } finally {
      observerState.isTriggering = false
    }
  }

  function handleIntersect(entries: IntersectionObserverEntry[]) {
    const entry = entries[0]
    observerState.lastIsIntersecting = Boolean(entry?.isIntersecting)

    if (entry?.isIntersecting) {
      void triggerLoadMore()
    }
  }

  function startObserving() {
    const sentinel = getSentinel()
    if (isObserving.value || !sentinel || !getEnabled()) return

    observerState.observer = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: resolvedOptions.rootMargin,
      threshold: resolvedOptions.threshold,
    })

    observerState.observer.observe(sentinel)
    observerState.observedElement = sentinel
    isObserving.value = true
  }

  function stopObserving() {
    if (!isObserving.value || !observerState.observer) return

    observerState.observer.disconnect()
    observerState.observer = null
    observerState.observedElement = null
    isObserving.value = false
  }

  const reactiveScope = effectScope()
  reactiveScope.run(() => {
    watch(
      () => getSentinel(),
      (el) => {
        if (el && isObserving.value && observerState.observedElement === el) return
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
          if (observerState.observer) {
            observerState.observer.unobserve(sentinel)
            observerState.observer.observe(sentinel)
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
