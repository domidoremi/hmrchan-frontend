import {
  customRef,
  getCurrentScope,
  onScopeDispose,
  readonly,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'

interface UseDebouncedRefResult<T> {
  debounced: Readonly<Ref<T>>
  flush: () => void
  cancel: () => void
}

interface UseWritableDebouncedRefResult<T> {
  state: Ref<T>
  flush: () => void
  cancel: () => void
}

interface DebouncedStateController<T> {
  state: Ref<T>
  flush: (resolveValue?: () => T) => void
  cancel: () => void
}

function createDebouncedState<T>(initialValue: T, delay: number): DebouncedStateController<T> {
  let timer: ReturnType<typeof setTimeout> | null = null
  let triggerRef: (() => void) | null = null
  let currentValue = initialValue
  let pendingValue = initialValue
  let hasPending = false

  const clearTimer = () => {
    if (!timer) return
    clearTimeout(timer)
    timer = null
  }

  const publish = (value: T) => {
    currentValue = value
    triggerRef?.()
  }

  const commit = (value: T) => {
    clearTimer()
    hasPending = false
    pendingValue = value

    if (Object.is(currentValue, value)) {
      currentValue = value
      return
    }

    publish(value)
  }

  const schedule = (value: T) => {
    if (Object.is(value, currentValue)) {
      clearTimer()
      hasPending = false
      pendingValue = value
      return
    }

    pendingValue = value
    hasPending = true
    clearTimer()
    timer = setTimeout(() => {
      commit(pendingValue)
    }, delay)
  }

  const flush = (resolveValue?: () => T) => {
    const nextValue = resolveValue ? resolveValue() : hasPending ? pendingValue : currentValue

    clearTimer()
    hasPending = false
    pendingValue = nextValue

    if (Object.is(currentValue, nextValue)) {
      currentValue = nextValue
      return
    }

    publish(nextValue)
  }

  const cancel = () => {
    clearTimer()
    hasPending = false
    pendingValue = currentValue
  }

  const state = customRef<T>((track, trigger) => {
    triggerRef = trigger

    return {
      get() {
        track()
        return currentValue
      },
      set(value) {
        schedule(value)
      },
    }
  })

  return {
    state,
    flush,
    cancel,
  }
}

export function useDebouncedRef<T>(
  source: MaybeRefOrGetter<T>,
  delay = 300
): UseDebouncedRefResult<T> {
  const controller = createDebouncedState(toValue(source), delay)

  const stop = watch(
    () => toValue(source),
    (value) => {
      controller.state.value = value
    }
  )

  if (getCurrentScope()) {
    onScopeDispose(() => {
      controller.cancel()
      stop()
    })
  }

  return {
    debounced: readonly(controller.state),
    flush: () => controller.flush(() => toValue(source)),
    cancel: controller.cancel,
  }
}

export function useWritableDebouncedRef<T>(
  initialValue: T,
  delay = 300
): UseWritableDebouncedRefResult<T> {
  const controller = createDebouncedState(initialValue, delay)

  if (getCurrentScope()) {
    onScopeDispose(() => {
      controller.cancel()
    })
  }

  return {
    state: controller.state,
    flush: controller.flush,
    cancel: controller.cancel,
  }
}
