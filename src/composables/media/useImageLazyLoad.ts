/**
 * 图片懒加载 Composable
 * 使用 Intersection Observer API 实现高性能懒加载
 */

import { ref, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'

export interface LazyLoadOptions {
  /**
   * 根元素，用于检查目标元素的可见性
   * 默认为浏览器视口
   */
  root?: Element | null

  /**
   * 根元素的边距，用于提前加载
   * 例如：'50px' 表示在元素进入视口前 50px 就开始加载
   */
  rootMargin?: string

  /**
   * 触发加载的可见度阈值
   * 0.0 表示元素刚进入视口就触发
   * 1.0 表示元素完全可见才触发
   */
  threshold?: number | number[]

  /**
   * 是否启用预加载
   * 如果为 true，会在元素接近视口时提前加载
   */
  preload?: boolean

  /**
   * 预加载距离（像素）
   * 当元素距离视口这个距离时开始预加载
   */
  preloadDistance?: number

  /**
   * 加载优先级
   * 'high' - 立即加载
   * 'low' - 延迟加载
   * 'auto' - 自动判断
   */
  priority?: 'high' | 'low' | 'auto'
}

export interface LazyLoadReturn {
  /**
   * 图片元素的引用
   */
  elementRef: Ref<HTMLElement | null>

  /**
   * 是否正在加载
   */
  isLoading: Ref<boolean>

  /**
   * 是否已加载
   */
  isLoaded: Ref<boolean>

  /**
   * 是否在视口内
   */
  isInViewport: Ref<boolean>

  /**
   * 加载错误
   */
  error: Ref<Error | null>

  /**
   * 手动触发加载
   */
  load: () => void

  /**
   * 重置状态
   */
  reset: () => void
}

/**
 * 使用 Intersection Observer 实现图片懒加载
 */
export function useImageLazyLoad(options: LazyLoadOptions = {}): LazyLoadReturn {
  const {
    root = null,
    rootMargin = '50px',
    threshold = 0.01,
    preload = true,
    preloadDistance = 200,
    priority = 'auto',
  } = options

  const elementRef = ref<HTMLElement | null>(null)
  const isLoading = ref(false)
  const isLoaded = ref(false)
  const isInViewport = ref(false)
  const error = ref<Error | null>(null)

  let observer: IntersectionObserver | null = null
  let preloadObserver: IntersectionObserver | null = null

  /**
   * 加载图片
   */
  const load = () => {
    if (isLoaded.value || isLoading.value || !elementRef.value) return

    isLoading.value = true
    error.value = null

    const img = elementRef.value as HTMLImageElement
    const src = img.dataset.src || img.getAttribute('data-src')

    if (!src) {
      isLoading.value = false
      return
    }

    // 创建临时图片对象来预加载
    const tempImg = new Image()

    tempImg.onload = () => {
      // 加载成功，更新实际图片
      img.src = src

      // 如果有 srcset，也更新它
      const srcset = img.dataset.srcset || img.getAttribute('data-srcset')
      if (srcset) {
        img.srcset = srcset
      }

      isLoaded.value = true
      isLoading.value = false

      // 移除 data 属性
      img.removeAttribute('data-src')
      img.removeAttribute('data-srcset')

      // 停止观察
      if (observer && elementRef.value) {
        observer.unobserve(elementRef.value)
      }
      if (preloadObserver && elementRef.value) {
        preloadObserver.unobserve(elementRef.value)
      }
    }

    tempImg.onerror = () => {
      error.value = new Error(`Failed to load image: ${src}`)
      isLoading.value = false
    }

    // 开始加载
    tempImg.src = src
  }

  /**
   * 重置状态
   */
  const reset = () => {
    isLoading.value = false
    isLoaded.value = false
    isInViewport.value = false
    error.value = null
  }

  /**
   * 初始化 Intersection Observer
   */
  const initObserver = () => {
    if (!elementRef.value) return

    // 高优先级图片立即加载
    if (priority === 'high') {
      load()
      return
    }

    // 主观察器：当元素进入视口时加载
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isInViewport.value = entry.isIntersecting

          if (entry.isIntersecting && !isLoaded.value) {
            load()
          }
        })
      },
      {
        root,
        rootMargin,
        threshold,
      },
    )

    observer.observe(elementRef.value)

    // 预加载观察器：当元素接近视口时预加载
    if (preload && priority !== 'low') {
      preloadObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !isLoaded.value && !isLoading.value) {
              // 提前加载
              load()
            }
          })
        },
        {
          root,
          rootMargin: `${preloadDistance}px`,
          threshold: 0,
        },
      )

      preloadObserver.observe(elementRef.value)
    }
  }

  /**
   * 清理观察器
   */
  const cleanup = () => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
    if (preloadObserver) {
      preloadObserver.disconnect()
      preloadObserver = null
    }
  }

  onMounted(() => {
    initObserver()
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    elementRef,
    isLoading,
    isLoaded,
    isInViewport,
    error,
    load,
    reset,
  }
}

/**
 * 批量懒加载图片
 */
export function useBatchImageLazyLoad(options: LazyLoadOptions = {}) {
  const elements = ref<HTMLElement[]>([])
  const loadedCount = ref(0)
  const totalCount = ref(0)

  let observer: IntersectionObserver | null = null

  const initBatchObserver = () => {
    if (elements.value.length === 0) return

    totalCount.value = elements.value.length

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            const src = img.dataset.src || img.getAttribute('data-src')

            if (src && !img.src) {
              img.src = src

              const srcset = img.dataset.srcset || img.getAttribute('data-srcset')
              if (srcset) {
                img.srcset = srcset
              }

              img.removeAttribute('data-src')
              img.removeAttribute('data-srcset')

              loadedCount.value++
              observer?.unobserve(img)
            }
          }
        })
      },
      {
        root: options.root || null,
        rootMargin: options.rootMargin || '50px',
        threshold: options.threshold || 0.01,
      },
    )

    elements.value.forEach((el) => {
      observer?.observe(el)
    })
  }

  const addElement = (el: HTMLElement) => {
    if (!elements.value.includes(el)) {
      elements.value.push(el)
    }
  }

  const cleanup = () => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  }

  onMounted(() => {
    initBatchObserver()
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    elements,
    loadedCount,
    totalCount,
    addElement,
    initBatchObserver,
  }
}
