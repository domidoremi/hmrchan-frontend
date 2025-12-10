/**
 * 图片优化工具
 * 处理后端图片的 WebP 转换、尺寸优化和懒加载
 */

import logger from './logger'

/**
 * 检测浏览器是否支持 WebP
 */
export const supportsWebP = (() => {
  if (typeof window === 'undefined') return false

  const canvas = document.createElement('canvas')
  if (canvas.getContext && canvas.getContext('2d')) {
    // 检查 toDataURL 是否支持 webp
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
  }
  return false
})()

/**
 * 图片格式优先级
 */
const IMAGE_FORMATS = {
  webp: 'image/webp',
  avif: 'image/avif',
  jpeg: 'image/jpeg',
  png: 'image/png',
}

/**
 * 生成优化后的图片 URL
 * @param originalUrl 原始图片 URL
 * @param options 优化选项
 * @returns 优化后的 URL
 */
interface ImageOptimizeOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto'
}

export function getOptimizedImageUrl(
  originalUrl: string,
  options: ImageOptimizeOptions = {},
): string {
  if (!originalUrl) return ''

  // 如果是相对路径或本地资源，直接返回
  if (originalUrl.startsWith('/') || originalUrl.startsWith('data:')) {
    return originalUrl
  }

  const { width, height, quality = 80, format = 'auto' } = options

  // 方案1: 使用图片 CDN 服务（如 Cloudinary、imgix）
  // 如果后端支持图片处理参数，可以直接附加参数
  const url = new URL(originalUrl)

  // 检查是否是已知的图片 CDN
  if (url.hostname.includes('cloudinary.com')) {
    // Cloudinary 格式示例
    const path = url.pathname
    const transforms = []

    if (width) transforms.push(`w_${width}`)
    if (height) transforms.push(`h_${height}`)
    if (quality) transforms.push(`q_${quality}`)
    if (format === 'webp' || (format === 'auto' && supportsWebP)) {
      transforms.push('f_webp')
    }

    if (transforms.length > 0) {
      const newPath = path.replace(/\/upload\//, `/upload/${transforms.join(',')}/`)
      url.pathname = newPath
    }

    return url.toString()
  }

  // 方案2: 使用我们自己的图片代理服务
  // 如果你的后端提供了图片处理 API，可以这样调用：
  // return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}&w=${width}&q=${quality}&f=${format}`

  // 方案3: 直接返回原始 URL，依赖浏览器的图片加载优化
  return originalUrl
}

/**
 * 生成响应式图片的 srcset
 */
export function generateSrcSet(
  originalUrl: string,
  widths: number[] = [320, 640, 960, 1280, 1920],
): string {
  return widths
    .map((width) => {
      const url = getOptimizedImageUrl(originalUrl, { width, format: 'auto' })
      return `${url} ${width}w`
    })
    .join(', ')
}

/**
 * 生成 sizes 属性
 */
export function generateSizes(breakpoints: Record<string, string> = {}): string {
  const defaultBreakpoints = {
    '(max-width: 640px)': '100vw',
    '(max-width: 1024px)': '50vw',
    ...breakpoints,
  }

  const sizes = Object.entries(defaultBreakpoints)
    .map(([media, size]) => `${media} ${size}`)
    .join(', ')

  return `${sizes}, 33vw`
}

/**
 * 图片加载占位符（LQIP - Low Quality Image Placeholder）
 */
export function generatePlaceholder(url: string): string {
  // 生成模糊的占位图
  return getOptimizedImageUrl(url, { width: 20, quality: 30 })
}

/**
 * 预加载关键图片
 * 使用 <link rel="preload"> 标签预加载
 */
export function preloadImage(url: string, as: 'image' = 'image'): void {
  if (typeof window === 'undefined') return

  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = as
  link.href = url

  if (supportsWebP) {
    link.type = IMAGE_FORMATS.webp
  }

  document.head.appendChild(link)
}

/**
 * 批量预加载图片
 * 使用 Image 对象预加载，支持进度回调
 */
export function preloadImages(
  urls: string[],
  onProgress?: (loaded: number, total: number) => void,
): Promise<void[]> {
  let loadedCount = 0
  const total = urls.length

  return Promise.all(
    urls.map((url) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image()

        img.onload = () => {
          loadedCount++
          if (onProgress) {
            onProgress(loadedCount, total)
          }
          resolve()
        }

        img.onerror = () => {
          loadedCount++
          if (onProgress) {
            onProgress(loadedCount, total)
          }
          reject(new Error(`Failed to load image: ${url}`))
        }

        img.src = url
      })
    }),
  )
}

/**
 * 智能预加载：根据网络状况和设备性能决定是否预加载
 */
export function smartPreloadImages(
  urls: string[],
  options: {
    priority?: 'high' | 'low'
    maxConcurrent?: number
    onProgress?: (loaded: number, total: number) => void
  } = {},
): Promise<void> {
  const { priority = 'low', maxConcurrent = 3, onProgress } = options

  // 检查网络连接
  interface NetworkInformation {
    effectiveType?: string
    saveData?: boolean
  }

  if ('connection' in navigator) {
    const conn = (navigator as { connection?: NetworkInformation }).connection
    // 如果是慢速网络或启用了数据节省模式，跳过预加载
    if (conn?.saveData || conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') {
      logger.debug('Skipping preload due to network conditions', { category: 'SmartPreload' })
      return Promise.resolve()
    }
  }

  // 分批预加载
  const batches: string[][] = []
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    batches.push(urls.slice(i, i + maxConcurrent))
  }

  let loadedCount = 0
  const total = urls.length

  const preloadBatch = async (batch: string[]) => {
    await Promise.allSettled(
      batch.map((url) => {
        return new Promise<void>((resolve, reject) => {
          const img = new Image()

          img.onload = () => {
            loadedCount++
            if (onProgress) {
              onProgress(loadedCount, total)
            }
            resolve()
          }

          img.onerror = () => {
            loadedCount++
            if (onProgress) {
              onProgress(loadedCount, total)
            }
            reject(new Error(`Failed to load image: ${url}`))
          }

          img.src = url
        })
      }),
    )
  }

  // 根据优先级决定预加载策略
  if (priority === 'high') {
    // 高优先级：立即预加载所有批次
    return Promise.all(batches.map(preloadBatch)).then(() => {})
  } else {
    // 低优先级：使用 requestIdleCallback 在空闲时预加载
    return new Promise((resolve) => {
      let currentBatch = 0

      const preloadNextBatch = () => {
        if (currentBatch >= batches.length) {
          resolve()
          return
        }

        const batch = batches[currentBatch]
        if (!batch) {
          resolve()
          return
        }

        preloadBatch(batch).then(() => {
          currentBatch++
          if ('requestIdleCallback' in window) {
            requestIdleCallback(() => preloadNextBatch(), { timeout: 2000 })
          } else {
            setTimeout(preloadNextBatch, 100)
          }
        })
      }

      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => preloadNextBatch(), { timeout: 2000 })
      } else {
        setTimeout(preloadNextBatch, 100)
      }
    })
  }
}

/**
 * 获取图片的实际尺寸
 */
export function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}

/**
 * 检测图片是否在视口内
 */
export function isInViewport(element: HTMLElement, offset: number = 0): boolean {
  const rect = element.getBoundingClientRect()
  return (
    rect.top >= -offset &&
    rect.left >= -offset &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + offset &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth) + offset
  )
}
