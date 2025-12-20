/**
 * 图片懒加载和优化工具
 * 使用 IntersectionObserver 实现视口内加载
 */

interface LazyImageOptions {
  rootMargin?: string
  threshold?: number
  placeholder?: string
}

const defaultOptions: LazyImageOptions = {
  rootMargin: '200px 0px',
  threshold: 0.01,
  placeholder: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E',
}

const loadedImages = new Set<string>()
const pendingImages = new Map<HTMLImageElement, string>()

let observer: IntersectionObserver | null = null

function getObserver(options: LazyImageOptions): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            const src = pendingImages.get(img)

            if (src) {
              img.src = src
              loadedImages.add(src)
              pendingImages.delete(img)
              observer?.unobserve(img)
            }
          }
        })
      },
      {
        rootMargin: options.rootMargin ?? '200px 0px',
        threshold: options.threshold ?? 0.01,
      }
    )
  }
  return observer
}

/**
 * 注册图片进行懒加载
 */
export function lazyLoadImage(
  img: HTMLImageElement,
  src: string,
  options: LazyImageOptions = {}
): void {
  const opts = { ...defaultOptions, ...options }

  // 如果图片已加载过，直接使用
  if (loadedImages.has(src)) {
    img.src = src
    return
  }

  // 设置占位符
  if (opts.placeholder) {
    img.src = opts.placeholder
  }

  // 存储真实 src 并观察
  pendingImages.set(img, src)
  getObserver(opts).observe(img)
}

/**
 * 停止观察图片
 */
export function unobserveImage(img: HTMLImageElement): void {
  pendingImages.delete(img)
  observer?.unobserve(img)
}

/**
 * 预加载图片
 */
export function preloadImage(src: string): Promise<void> {
  if (loadedImages.has(src)) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      loadedImages.add(src)
      resolve()
    }
    img.onerror = reject
    img.src = src
  })
}

/**
 * 批量预加载图片
 */
export function preloadImages(srcs: string[], concurrency = 3): Promise<void[]> {
  const chunks: string[][] = []
  for (let i = 0; i < srcs.length; i += concurrency) {
    chunks.push(srcs.slice(i, i + concurrency))
  }

  return chunks.reduce(
    (promise, chunk) =>
      promise.then(() => Promise.all(chunk.map(preloadImage))),
    Promise.resolve([]) as Promise<void[]>
  )
}

/**
 * 清理观察器
 */
export function cleanupLazyLoader(): void {
  observer?.disconnect()
  observer = null
  pendingImages.clear()
}

/**
 * Vue 指令：v-lazy-src
 * 用法: <img v-lazy-src="imageUrl" />
 */
export const vLazySrc = {
  mounted(el: HTMLImageElement, binding: { value: string }) {
    if (binding.value) {
      lazyLoadImage(el, binding.value)
    }
  },
  updated(el: HTMLImageElement, binding: { value: string; oldValue: string }) {
    if (binding.value !== binding.oldValue && binding.value) {
      unobserveImage(el)
      lazyLoadImage(el, binding.value)
    }
  },
  unmounted(el: HTMLImageElement) {
    unobserveImage(el)
  },
}
