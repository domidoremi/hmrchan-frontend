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

export function useDebouncedRef<T>(
  source: MaybeRefOrGetter<T>,
  delay = 300
): UseDebouncedRefResult<T> {
  let timer: ReturnType<typeof setTimeout> | null = null
  let triggerRef: (() => void) | null = null
  let currentValue = toValue(source)

  const debounced = customRef<T>((track, trigger) => {
    triggerRef = trigger

    return {
      get() {
        track()
        return currentValue
      },
      set(value) {
        if (timer) {
          clearTimeout(timer)
        }
        timer = setTimeout(() => {
          timer = null
          currentValue = value
          trigger()
        }, delay)
      },
    }
  })

  const stop = watch(
    () => toValue(source),
    (value) => {
      debounced.value = value
    },
    { immediate: true }
  )

  const cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  const flush = () => {
    if (!timer) return
    clearTimeout(timer)
    timer = null
    currentValue = toValue(source)
    triggerRef?.()
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      cancel()
      stop()
    })
  }

  return {
    debounced: readonly(debounced),
    flush,
    cancel,
  }
}
