/**
 * 图片预加载插件
 * 自动识别和预加载关键图片
 */

import type { App } from 'vue'
import { smartPreloadImages } from '@/utils'
import logger from '@/utils/logger'

export interface ImagePreloadPluginOptions {
  /**
   * 是否启用自动预加载
   */
  enabled?: boolean

  /**
   * 预加载优先级
   */
  priority?: 'high' | 'low'

  /**
   * 最大并发数
   */
  maxConcurrent?: number

  /**
   * 是否仅在 WiFi 下预加载
   */
  wifiOnly?: boolean

  /**
   * 自定义关键图片选择器
   */
  criticalSelectors?: string[]

  /**
   * 延迟时间（毫秒）
   */
  delay?: number
}

/**
 * 识别关键图片
 */
function identifyCriticalImages(selectors: string[] = []): string[] {
  const criticalImages: string[] = []

  // 默认选择器
  const defaultSelectors = [
    'img[fetchpriority="high"]', // 高优先级图片
    'img.hero', // Hero 图片
    'img.logo', // Logo
    'img.banner', // Banner
    '.hero img',
    '.logo img',
    '.banner img',
    '[data-preload="true"] img', // 标记为预加载的图片
  ]

  const allSelectors = [...defaultSelectors, ...selectors]

  // 查找所有匹配的图片
  allSelectors.forEach((selector) => {
    try {
      const images = document.querySelectorAll(selector)
      images.forEach((img) => {
        const src = (img as HTMLImageElement).src || img.getAttribute('data-src')
        if (src && !criticalImages.includes(src)) {
          criticalImages.push(src)
        }
      })
    } catch (error) {
      logger.warn('[ImagePreload] Invalid selector', { selector, error })
    }
  })

  // 查找首屏可见的图片
  const allImages = document.querySelectorAll('img')
  allImages.forEach((img) => {
    const rect = img.getBoundingClientRect()
    const isInViewport =
      rect.top >= -100 && // 允许一些缓冲区
      rect.left >= -100 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + 100 &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth) + 100

    if (isInViewport) {
      const src = img.src || img.getAttribute('data-src')
      if (src && !criticalImages.includes(src)) {
        criticalImages.push(src)
      }
    }
  })

  return criticalImages
}

/**
 * 检查是否应该预加载
 */
interface NetworkInformation {
  effectiveType?: string
  type?: string
  saveData?: boolean
}

function shouldPreload(wifiOnly: boolean = false): boolean {
  // 检查数据节省模式
  if ('connection' in navigator) {
    const conn = (navigator as { connection?: NetworkInformation }).connection
    if (conn?.saveData) {
      logger.info('[ImagePreload] Data saver enabled, skipping preload')
      return false
    }

    // 检查网络类型
    if (wifiOnly) {
      const type = conn?.type
      if (type !== 'wifi' && type !== 'ethernet') {
        logger.info('[ImagePreload] Not on WiFi, skipping preload')
        return false
      }
    }

    // 检查网络速度
    const effectiveType = conn?.effectiveType
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      logger.info('[ImagePreload] Slow connection, skipping preload')
      return false
    }
  }

  return true
}

/**
 * 图片预加载插件
 */
export const imagePreloadPlugin = {
  install(app: App, options: ImagePreloadPluginOptions = {}) {
    const {
      enabled = true,
      priority = 'low',
      maxConcurrent = 3,
      wifiOnly = false,
      criticalSelectors = [],
      delay = 1000,
    } = options

    if (!enabled) {
      return
    }

    // 在应用挂载后执行预加载
    app.mixin({
      mounted() {
        // 只在根组件执行一次
        if (this.$el === document.querySelector('#app')) {
          const preload = () => {
            if (!shouldPreload(wifiOnly)) {
              return
            }

            // 识别关键图片
            const criticalImages = identifyCriticalImages(criticalSelectors)

            if (criticalImages.length > 0) {
              logger.info(`[ImagePreload] Preloading ${criticalImages.length} critical images`)

              smartPreloadImages(criticalImages, {
                priority,
                maxConcurrent,
                onProgress: (loaded, total) => {
                  logger.info(`[ImagePreload] Progress: ${loaded}/${total}`)
                },
              }).catch((error) => {
                logger.warn('[ImagePreload] Failed to preload images', { error })
              })
            }
          }

          // 延迟执行，避免阻塞初始渲染
          if (delay > 0) {
            setTimeout(preload, delay)
          } else if ('requestIdleCallback' in window) {
            requestIdleCallback(preload, { timeout: 2000 })
          } else {
            setTimeout(preload, 100)
          }
        }
      },
    })

    // 提供全局方法
    app.config.globalProperties.$preloadImages = (urls: string[]) => {
      return smartPreloadImages(urls, {
        priority: 'high',
        maxConcurrent,
      })
    }

    logger.info('[ImagePreload] Plugin installed')
  },
}
