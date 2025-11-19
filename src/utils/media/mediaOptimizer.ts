/**
 * 媒体优化工具
 * 提供图片优化、懒加载、渐进式加载等功能
 */

import { logger } from '../logger'

interface ImageOptimizationOptions {
  quality?: number
  format?: 'webp' | 'jpeg' | 'png'
  maxWidth?: number
  maxHeight?: number
  placeholder?: 'blur' | 'color' | 'lqip'
}

interface LazyLoadOptions {
  rootMargin?: string
  threshold?: number
  onLoad?: (element: HTMLElement) => void
  onError?: (element: HTMLElement, error: Error) => void
}

class MediaOptimizer {
  private imageCache = new Map<string, string>()
  private observers = new Map<HTMLElement, IntersectionObserver>()

  /**
   * 生成响应式图片srcset
   */
  generateSrcSet(baseUrl: string, sizes: number[]): string {
    return sizes
      .map((size) => `${this.getOptimizedUrl(baseUrl, { maxWidth: size })} ${size}w`)
      .join(', ')
  }

  /**
   * 获取优化后的图片URL
   */
  getOptimizedUrl(url: string, options: ImageOptimizationOptions = {}): string {
    const { quality = 80, format = 'webp', maxWidth, maxHeight } = options

    // 如果是外部URL（如Unsplash），使用其API参数
    if (url.includes('unsplash.com')) {
      const params = new URLSearchParams()
      if (maxWidth) params.set('w', maxWidth.toString())
      if (maxHeight) params.set('h', maxHeight.toString())
      params.set('q', quality.toString())
      params.set('fm', format)
      params.set('fit', 'crop')

      return `${url}?${params.toString()}`
    }

    // Twitter图片优化
    if (url.includes('pbs.twimg.com')) {
      // Twitter图片格式: name:size
      // small (340x340), medium (600x600), large (1024x1024)
      let sizeParam = 'medium'
      if (maxWidth && maxWidth <= 400) sizeParam = 'small'
      if (maxWidth && maxWidth >= 800) sizeParam = 'large'

      if (url.includes('?format=')) {
        return url.replace(/name=\w+/, `name=${sizeParam}`)
      }
      return `${url}?format=${format}&name=${sizeParam}`
    }

    // YouTube缩略图
    if (url.includes('i.ytimg.com') || url.includes('img.youtube.com')) {
      // 可选: default (120x90), mqdefault (320x180), hqdefault (480x360), maxresdefault (1280x720)
      if (maxWidth && maxWidth <= 320) {
        return url.replace(/maxresdefault|hqdefault/, 'mqdefault')
      }
      if (maxWidth && maxWidth <= 480) {
        return url.replace(/maxresdefault/, 'hqdefault')
      }
    }

    // 默认返回原始URL
    return url
  }

  /**
   * 生成LQIP (Low Quality Image Placeholder)
   */
  async generateLQIP(url: string): Promise<string> {
    // 检查缓存
    if (this.imageCache.has(url)) {
      return this.imageCache.get(url)!
    }

    try {
      // 加载小尺寸、低质量版本
      const lqipUrl = this.getOptimizedUrl(url, {
        maxWidth: 40,
        maxHeight: 40,
        quality: 20,
        format: 'webp',
      })

      // 预加载
      await this.preloadImage(lqipUrl)

      // 缓存
      this.imageCache.set(url, lqipUrl)

      return lqipUrl
    } catch (error) {
      logger.error('LQIP generation failed', { category: 'Media Optimizer' }, error)
      return url
    }
  }

  /**
   * 提取图片主色调
   */
  async extractDominantColor(url: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'Anonymous'

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')

          if (!ctx) {
            resolve('#f0f0f0')
            return
          }

          // 缩小到1x1获取平均颜色
          canvas.width = 1
          canvas.height = 1
          ctx.drawImage(img, 0, 0, 1, 1)

          const pixel = ctx.getImageData(0, 0, 1, 1).data
          const rgb = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`
          resolve(rgb)
        } catch {
          // CORS错误时使用默认颜色
          resolve('#f0f0f0')
        }
      }

      img.onerror = () => resolve('#f0f0f0')

      // 使用小尺寸图片加快处理
      img.src = this.getOptimizedUrl(url, { maxWidth: 50, maxHeight: 50 })

      // 超时保护
      setTimeout(() => resolve('#f0f0f0'), 3000)
    })
  }

  /**
   * 懒加载图片
   */
  lazyLoad(elements: HTMLElement | HTMLElement[], options: LazyLoadOptions = {}): () => void {
    const { rootMargin = '50px', threshold = 0.01, onLoad, onError } = options

    const elementsArray = Array.isArray(elements) ? elements : [elements]

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement

            if (element.tagName === 'IMG') {
              this.loadImage(element as HTMLImageElement, onLoad, onError)
            } else {
              this.loadBackgroundImage(element, onLoad, onError)
            }

            observer.unobserve(element)
            this.observers.delete(element)
          }
        })
      },
      {
        rootMargin,
        threshold,
      },
    )

    elementsArray.forEach((element) => {
      observer.observe(element)
      this.observers.set(element, observer)
    })

    // 返回清理函数
    return () => {
      elementsArray.forEach((element) => {
        observer.unobserve(element)
        this.observers.delete(element)
      })
    }
  }

  /**
   * 加载图片元素
   */
  private async loadImage(
    img: HTMLImageElement,
    onLoad?: (element: HTMLElement) => void,
    onError?: (element: HTMLElement, error: Error) => void,
  ): Promise<void> {
    const src = img.dataset.src
    const srcset = img.dataset.srcset

    if (!src && !srcset) return

    return new Promise((resolve) => {
      img.onload = () => {
        img.classList.add('loaded')
        if (onLoad) onLoad(img)
        resolve()
      }

      img.onerror = () => {
        const error = new Error(`Failed to load image: ${src}`)
        img.classList.add('error')
        if (onError) onError(img, error)
        resolve()
      }

      // 渐进式加载
      if (srcset) {
        img.srcset = srcset
      }
      if (src) {
        img.src = src
      }

      // 移除data属性
      delete img.dataset.src
      delete img.dataset.srcset
    })
  }

  /**
   * 加载背景图片
   */
  private async loadBackgroundImage(
    element: HTMLElement,
    onLoad?: (element: HTMLElement) => void,
    onError?: (element: HTMLElement, error: Error) => void,
  ): Promise<void> {
    const bgUrl = element.dataset.bg

    if (!bgUrl) return

    return new Promise((resolve) => {
      const img = new Image()

      img.onload = () => {
        element.style.backgroundImage = `url('${bgUrl}')`
        element.classList.add('loaded')
        if (onLoad) onLoad(element)
        resolve()
      }

      img.onerror = () => {
        const error = new Error(`Failed to load background: ${bgUrl}`)
        element.classList.add('error')
        if (onError) onError(element, error)
        resolve()
      }

      img.src = bgUrl
      delete element.dataset.bg
    })
  }

  /**
   * 预加载图片
   */
  async preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = () => reject(new Error(`Failed to preload: ${url}`))
      img.src = url

      // 超时保护
      setTimeout(() => reject(new Error('Preload timeout')), 10000)
    })
  }

  /**
   * 批量预加载
   */
  async preloadImages(urls: string[]): Promise<void> {
    const promises = urls.map((url) =>
      this.preloadImage(url).catch(() => {
        logger.warn('Preload failed', { category: 'Media Optimizer', url })
      }),
    )

    await Promise.allSettled(promises)
  }

  /**
   * 检测WebP支持
   */
  async supportsWebP(): Promise<boolean> {
    if (typeof window === 'undefined') return false

    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img.width === 1)
      img.onerror = () => resolve(false)
      img.src =
        'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA='
    })
  }

  /**
   * 检测AVIF支持
   */
  async supportsAVIF(): Promise<boolean> {
    if (typeof window === 'undefined') return false

    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img.width === 1)
      img.onerror = () => resolve(false)
      img.src =
        'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A='
    })
  }

  /**
   * 获取最佳图片格式
   */
  async getBestFormat(): Promise<'avif' | 'webp' | 'jpeg'> {
    if (await this.supportsAVIF()) return 'avif'
    if (await this.supportsWebP()) return 'webp'
    return 'jpeg'
  }

  /**
   * 计算图片尺寸（保持宽高比）
   */
  calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth?: number,
    maxHeight?: number,
  ): { width: number; height: number } {
    if (!maxWidth && !maxHeight) {
      return { width: originalWidth, height: originalHeight }
    }

    const aspectRatio = originalWidth / originalHeight

    if (maxWidth && !maxHeight) {
      return {
        width: maxWidth,
        height: Math.round(maxWidth / aspectRatio),
      }
    }

    if (maxHeight && !maxWidth) {
      return {
        width: Math.round(maxHeight * aspectRatio),
        height: maxHeight,
      }
    }

    // 两者都有，选择较小的缩放
    const widthScale = maxWidth! / originalWidth
    const heightScale = maxHeight! / originalHeight
    const scale = Math.min(widthScale, heightScale)

    return {
      width: Math.round(originalWidth * scale),
      height: Math.round(originalHeight * scale),
    }
  }

  /**
   * 清理观察器
   */
  cleanup(): void {
    this.observers.forEach((observer) => observer.disconnect())
    this.observers.clear()
    this.imageCache.clear()
  }
}

// 导出单例
export const mediaOptimizer = new MediaOptimizer()
export default mediaOptimizer
