/**
 * 优化渲染性能的组合式函数
 * 提供防抖、节流、虚拟滚动等性能优化工具
 */

import { ref, onMounted, onUnmounted, type Ref } from 'vue'

/**
 * 使用 requestAnimationFrame 进行防抖
 */
export function useRAFDebounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay = 0
): (...args: Parameters<T>) => void {
  let timeoutId: number | null = null
  let rafId: number | null = null

  return (...args: Parameters<T>) => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
    }
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    if (delay > 0) {
      timeoutId = window.setTimeout(() => {
        rafId = requestAnimationFrame(() => {
          fn(...args)
        })
      }, delay)
    } else {
      rafId = requestAnimationFrame(() => {
        fn(...args)
      })
    }
  }
}

/**
 * 使用 requestAnimationFrame 进行节流
 */
export function useRAFThrottle<T extends (...args: unknown[]) => unknown>(
  fn: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null
  let lastArgs: Parameters<T> | null = null

  const throttled = () => {
    if (lastArgs) {
      fn(...lastArgs)
      lastArgs = null
      rafId = requestAnimationFrame(throttled)
    } else {
      rafId = null
    }
  }

  return (...args: Parameters<T>) => {
    lastArgs = args
    if (rafId === null) {
      rafId = requestAnimationFrame(throttled)
    }
  }
}

/**
 * 延迟渲染：在空闲时才渲染组件
 */
export function useDeferredRender(delay = 0): Ref<boolean> {
  const shouldRender = ref(false)

  onMounted(() => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(
        () => {
          shouldRender.value = true
        },
        { timeout: delay || 1000 }
      )
    } else {
      setTimeout(() => {
        shouldRender.value = true
      }, delay || 100)
    }
  })

  return shouldRender
}

/**
 * 可见性检测：只在元素可见时渲染
 */
export function useIntersectionObserver(
  target: Ref<HTMLElement | null>,
  options: IntersectionObserverInit = {}
): Ref<boolean> {
  const isVisible = ref(false)
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    if (!target.value) return

    observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        isVisible.value = entry.isIntersecting
      }
    }, options)

    observer.observe(target.value)
  })

  onUnmounted(() => {
    if (observer) {
      observer.disconnect()
    }
  })

  return isVisible
}

/**
 * 批量更新：收集多个更新并一次性执行
 */
export function useBatchUpdate<T>(updateFn: (items: T[]) => void, delay = 16): (item: T) => void {
  let pending: T[] = []
  let timeoutId: number | null = null

  return (item: T) => {
    pending.push(item)

    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = window.setTimeout(() => {
      if (pending.length > 0) {
        updateFn([...pending])
        pending = []
      }
      timeoutId = null
    }, delay)
  }
}

/**
 * 虚拟滚动辅助函数
 */
export function useVirtualScroll<T>(
  items: Ref<T[]>,
  itemHeight: number,
  containerHeight: number,
  buffer = 3
) {
  const scrollTop = ref(0)

  const visibleRange = computed(() => {
    const start = Math.max(0, Math.floor(scrollTop.value / itemHeight) - buffer)
    const end = Math.min(
      items.value.length,
      Math.ceil((scrollTop.value + containerHeight) / itemHeight) + buffer
    )
    return { start, end }
  })

  const visibleItems = computed(() => {
    const { start, end } = visibleRange.value
    return items.value.slice(start, end).map((item, index) => ({
      item,
      index: start + index,
      top: (start + index) * itemHeight,
    }))
  })

  const totalHeight = computed(() => items.value.length * itemHeight)

  const handleScroll = (event: Event) => {
    const target = event.target as HTMLElement
    if (!target) return

    requestAnimationFrame(() => {
      scrollTop.value = target.scrollTop
    })
  }

  return {
    visibleItems,
    totalHeight,
    handleScroll,
  }
}

/**
 * 图片懒加载
 */
export function useLazyImage(src: Ref<string>): {
  imageSrc: Ref<string>
  isLoaded: Ref<boolean>
  error: Ref<Error | null>
} {
  const imageSrc = ref('')
  const isLoaded = ref(false)
  const error = ref<Error | null>(null)

  onMounted(() => {
    if (!src.value) return

    const img = new Image()

    img.onload = () => {
      imageSrc.value = src.value
      isLoaded.value = true
    }

    img.onerror = () => {
      error.value = new Error('Failed to load image')
    }

    img.src = src.value
  })

  return {
    imageSrc,
    isLoaded,
    error,
  }
}

/**
 * 组件预加载
 */
export function useComponentPreload(
  importFn: () => Promise<unknown>,
  trigger: 'hover' | 'visible' | 'idle' = 'idle'
): void {
  let loaded = false

  const load = () => {
    if (loaded) return
    loaded = true
    importFn().catch((err) => {
      console.warn('Failed to preload component:', err)
    })
  }

  onMounted(() => {
    if (trigger === 'idle') {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(load, { timeout: 2000 })
      } else {
        setTimeout(load, 1000)
      }
    }
    // hover 和 visible 触发需要在组件中手动调用 load()
  })
}

import { computed } from 'vue'
