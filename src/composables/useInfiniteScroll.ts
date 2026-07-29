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

  function ensureObserver() {
    if (observerState.observer) return observerState.observer

    observerState.observer = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: resolvedOptions.rootMargin,
      threshold: resolvedOptions.threshold,
    })

    return observerState.observer
  }

  function pauseObserving(clearTarget = false) {
    if (observerState.observer && observerState.observedElement && isObserving.value) {
      observerState.observer.unobserve(observerState.observedElement)
    }

    observerState.lastIsIntersecting = false
    isObserving.value = false

    if (clearTarget) {
      observerState.observedElement = null
    }
  }

  function observeSentinel(forceReobserve = false) {
    const sentinel = getSentinel()
    if (!sentinel || !getEnabled()) {
      pauseObserving(!sentinel)
      return false
    }

    const observer = ensureObserver()
    const isSameSentinel = observerState.observedElement === sentinel

    if (isSameSentinel && isObserving.value && !forceReobserve) return true

    if (observerState.observedElement && !isSameSentinel) {
      observer.unobserve(observerState.observedElement)
    }

    if (isSameSentinel && isObserving.value && forceReobserve) {
      observer.unobserve(sentinel)
    }

    observer.observe(sentinel)
    observerState.observedElement = sentinel
    observerState.lastIsIntersecting = false
    isObserving.value = true
    return true
  }

  function rearmObservedSentinel() {
    const sentinel = getSentinel()
    if (!observerState.observer || !sentinel) return
    if (observerState.observedElement !== sentinel) return
    if (!observerState.lastIsIntersecting) return
    if (!isObserving.value) return

    observeSentinel(true)
  }

  async function triggerLoadMore() {
    if (observerState.isTriggering) return
    if (!getEnabled()) return
    if (!observerState.observer || !isObserving.value) return

    const sentinel = getSentinel()
    if (!sentinel || observerState.observedElement !== sentinel) return
    if (!observerState.lastIsIntersecting) return

    observerState.isTriggering = true
    try {
      const result = await loadMore()
      if (result === false) return

      if (!observerState.lastIsIntersecting) return
      if (!getEnabled()) return
      if (!observerState.observer) return
      if (!isObserving.value) return
      if (observerState.observedElement !== sentinel) return

      rearmObservedSentinel()
    } catch {
      return
    } finally {
      observerState.isTriggering = false
    }
  }

  function handleIntersect(entries: IntersectionObserverEntry[]) {
    const activeSentinel = observerState.observedElement
    if (!activeSentinel) return

    const entry = entries.find((current) => current.target === activeSentinel)
    if (!entry) return

    observerState.lastIsIntersecting = Boolean(entry?.isIntersecting)

    if (entry?.isIntersecting && getEnabled()) {
      void triggerLoadMore()
    }
  }

  function startObserving() {
    observeSentinel()
  }

  function stopObserving() {
    if (!isObserving.value || !observerState.observer) return

    observerState.observer.disconnect()
    observerState.observer = null
    observerState.observedElement = null
    observerState.lastIsIntersecting = false
    isObserving.value = false
  }

  const reactiveScope = effectScope()
  reactiveScope.run(() => {
    watch(
      () => getSentinel(),
      (el, previousEl) => {
        if (!el) {
          pauseObserving(true)
          return
        }
        if (el === previousEl && observerState.observedElement === el) return
        startObserving()
      }
    )

    watch(
      () => getEnabled(),
      (isEnabled) => {
        if (!isEnabled) {
          pauseObserving()
          return
        }

        const sentinel = getSentinel()
        if (sentinel) {
          startObserving()
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
