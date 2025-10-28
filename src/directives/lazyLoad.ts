/**
 * 图片懒加载指令
 * 使用 Intersection Observer API 实现高性能懒加载
 *
 * 使用方法:
 * <img v-lazy="imageUrl" alt="description" />
 * <img v-lazy="{ src: imageUrl, loading: loadingUrl, error: errorUrl }" />
 */

import type { Directive, DirectiveBinding } from 'vue'

interface LazyOptions {
  src: string
  loading?: string
  error?: string
  threshold?: number
  rootMargin?: string
}

// 默认配置
const DEFAULT_LOADING =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="14"%3E加载中...%3C/text%3E%3C/svg%3E'
const DEFAULT_ERROR =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23fef2f2" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23dc2626" font-size="14"%3E加载失败%3C/text%3E%3C/svg%3E'

// 存储已观察的元素
const observerMap = new WeakMap<HTMLElement, IntersectionObserver>()

/**
 * 加载图片
 */
const loadImage = (el: HTMLImageElement, src: string, options: LazyOptions) => {
  const img = new Image()

  // 开始加载
  el.classList.add('lazy-loading')

  img.onload = () => {
    el.src = src
    el.classList.remove('lazy-loading')
    el.classList.add('lazy-loaded')
  }

  img.onerror = () => {
    if (options.error) {
      el.src = options.error
    }
    el.classList.remove('lazy-loading')
    el.classList.add('lazy-error')
  }

  img.src = src
}

/**
 * 创建 Intersection Observer
 */
const createObserver = (el: HTMLImageElement, binding: DirectiveBinding) => {
  const options: LazyOptions =
    typeof binding.value === 'string' ? { src: binding.value } : binding.value

  const {
    src,
    loading = DEFAULT_LOADING,
    error = DEFAULT_ERROR,
    threshold = 0.01,
    rootMargin = '50px',
  } = options

  // 设置占位图
  if (loading && !el.src) {
    el.src = loading
  }

  // 创建观察器
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // 进入视口，开始加载
          loadImage(el, src, { ...options, error })

          // 加载后停止观察
          observer.unobserve(el)
          observerMap.delete(el)
        }
      })
    },
    {
      threshold,
      rootMargin,
    },
  )

  // 开始观察
  observer.observe(el)
  observerMap.set(el, observer)
}

/**
 * 懒加载指令
 */
export const lazyLoad: Directive = {
  mounted(el: HTMLImageElement, binding: DirectiveBinding) {
    // 检查浏览器支持
    if (!('IntersectionObserver' in window)) {
      // 降级方案：直接加载
      const src = typeof binding.value === 'string' ? binding.value : binding.value.src
      el.src = src
      return
    }

    createObserver(el, binding)
  },

  updated(el: HTMLImageElement, binding: DirectiveBinding) {
    // 如果图片源改变，重新观察
    const oldValue = typeof binding.oldValue === 'string' ? binding.oldValue : binding.oldValue?.src
    const newValue = typeof binding.value === 'string' ? binding.value : binding.value?.src

    if (oldValue !== newValue) {
      // 停止旧的观察
      const oldObserver = observerMap.get(el)
      if (oldObserver) {
        oldObserver.unobserve(el)
        observerMap.delete(el)
      }

      // 创建新的观察
      createObserver(el, binding)
    }
  },

  unmounted(el: HTMLImageElement) {
    // 清理观察器
    const observer = observerMap.get(el)
    if (observer) {
      observer.unobserve(el)
      observerMap.delete(el)
    }
  },
}

export default lazyLoad
