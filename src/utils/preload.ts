/**
 * 媒体预加载工具
 * 支持图片和视频的智能预加载
 */
import { logger } from './logger'

/**
 * 图片预加载器
 */
class ImagePreloader {
  private cache = new Set<string>()
  private loading = new Set<string>()
  private queue: string[] = []
  private maxConcurrent = 3 // 最多3个并发预加载

  /**
   * 预加载单个图片
   */
  preload(url: string): Promise<void> {
    // 已缓存或正在加载
    if (this.cache.has(url) || this.loading.has(url)) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      this.loading.add(url)

      const img = new Image()
      img.onload = () => {
        this.cache.add(url)
        this.loading.delete(url)
        logger.info(`[Preload] ✅ 图片: ${url.substring(0, 50)}...`)
        resolve()
        this.processQueue()
      }
      img.onerror = () => {
        this.loading.delete(url)
        logger.warn(`[Preload] ❌ 图片失败: ${url.substring(0, 50)}...`)
        reject(new Error(`Failed to preload: ${url}`))
        this.processQueue()
      }
      img.src = url
    })
  }

  /**
   * 批量预加载（带并发控制）
   */
  async preloadBatch(urls: string[]) {
    const uniqueUrls = [...new Set(urls)].filter((url) => !this.cache.has(url))

    if (uniqueUrls.length === 0) return

    logger.info(`[Preload] 📦 批量预加载 ${uniqueUrls.length} 张图片`, {
      count: uniqueUrls.length,
    })

    for (const url of uniqueUrls) {
      if (this.loading.size >= this.maxConcurrent) {
        // 加入队列
        this.queue.push(url)
      } else {
        // 立即加载
        this.preload(url).catch(() => {})
      }
    }
  }

  /**
   * 处理队列
   */
  private processQueue() {
    if (this.queue.length > 0 && this.loading.size < this.maxConcurrent) {
      const url = this.queue.shift()
      if (url) {
        this.preload(url).catch(() => {})
      }
    }
  }

  /**
   * 优先级预加载（清空队列，优先加载这些）
   */
  async preloadPriority(urls: string[]) {
    this.queue = []
    const uniqueUrls = [...new Set(urls)].filter((url) => !this.cache.has(url))

    logger.info(`[Preload] ⭐ 优先级预加载 ${uniqueUrls.length} 张图片`, {
      count: uniqueUrls.length,
    })

    for (const url of uniqueUrls) {
      await this.preload(url).catch(() => {})
    }
  }

  /**
   * 检查是否已缓存
   */
  isCached(url: string): boolean {
    return this.cache.has(url)
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear()
    logger.info('[Preload] 🗑️ 清除图片缓存')
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      cached: this.cache.size,
      loading: this.loading.size,
      queued: this.queue.length,
    }
  }
}

/**
 * 视频预加载器
 */
class VideoPreloader {
  private cache = new Map<string, HTMLVideoElement>()
  private loading = new Set<string>()

  /**
   * 预加载视频元数据
   */
  preloadMetadata(url: string): Promise<void> {
    if (this.cache.has(url) || this.loading.has(url)) {
      return Promise.resolve()
    }

    this.loading.add(url)

    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata' // 只加载元数据
      video.src = url

      video.onloadedmetadata = () => {
        this.cache.set(url, video)
        this.loading.delete(url)
        logger.info(
          `[Preload] 🎬 视频元数据: ${url.substring(0, 50)}... (${video.duration.toFixed(1)}s)`,
        )
        resolve()
      }
      video.onerror = () => {
        this.loading.delete(url)
        logger.warn(`[Preload] ❌ 视频失败: ${url.substring(0, 50)}...`)
        reject(new Error(`Failed to preload video: ${url}`))
      }
    })
  }

  /**
   * 预加载视频（部分内容）
   */
  preloadPartial(url: string, seconds: number = 3): Promise<void> {
    if (this.cache.has(url) || this.loading.has(url)) {
      return Promise.resolve()
    }

    this.loading.add(url)

    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'auto'
      video.src = url

      let loaded = false
      const checkProgress = () => {
        if (!loaded && video.buffered.length > 0) {
          const buffered = video.buffered.end(0)
          if (buffered >= seconds) {
            loaded = true
            this.cache.set(url, video)
            this.loading.delete(url)
            logger.info(
              `[Preload] 🎬 视频部分加载: ${url.substring(0, 50)}... (${buffered.toFixed(1)}s)`,
            )
            resolve()
          }
        }
      }

      video.addEventListener('progress', checkProgress)
      video.addEventListener('canplay', () => {
        if (!loaded) {
          loaded = true
          this.loading.delete(url)
          this.cache.set(url, video)
          resolve()
        }
      })
      video.onerror = () => {
        this.loading.delete(url)
        reject(new Error(`Failed to preload video: ${url}`))
      }

      // 超时处理
      setTimeout(() => {
        if (!loaded) {
          loaded = true
          this.loading.delete(url)
          reject(new Error(`Video preload timeout: ${url}`))
        }
      }, 10000) // 10秒超时
    })
  }

  /**
   * 批量预加载视频元数据
   */
  async preloadBatchMetadata(urls: string[]) {
    const uniqueUrls = [...new Set(urls)].filter((url) => !this.cache.has(url))

    logger.info(`[Preload] 📦 批量预加载 ${uniqueUrls.length} 个视频元数据`, {
      count: uniqueUrls.length,
    })

    const promises = uniqueUrls.map((url) => this.preloadMetadata(url).catch(() => {}))
    await Promise.all(promises)
  }

  /**
   * 获取缓存的视频元素
   */
  getCached(url: string): HTMLVideoElement | undefined {
    return this.cache.get(url)
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear()
    this.loading.clear()
    logger.info('[Preload] 🗑️ 清除视频缓存')
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      cached: this.cache.size,
      loading: this.loading.size,
    }
  }
}

/**
 * 智能预加载管理器
 */
class SmartPreloader {
  /**
   * 预加载帖子缩略图
   */
  preloadPostThumbnails(posts: Array<{ thumbnail_url?: string | null }>, limit: number = 10) {
    const thumbnails = posts
      .slice(0, limit)
      .filter((p) => p.thumbnail_url)
      .map((p) => p.thumbnail_url!)

    if (thumbnails.length > 0) {
      imagePreloader.preloadBatch(thumbnails)
    }
  }

  /**
   * 预加载下一批内容
   */
  preloadNextBatch(
    allPosts: Array<{ thumbnail_url?: string | null }>,
    currentIndex: number,
    batchSize: number = 10,
  ) {
    const nextPosts = allPosts.slice(currentIndex + 1, currentIndex + 1 + batchSize)
    this.preloadPostThumbnails(nextPosts, batchSize)
  }

  /**
   * 预加载媒体资源（图片和视频）
   */
  preloadMediaResources(
    items: Array<{ url: string; type: 'image' | 'video' }>,
    currentIndex: number,
    lookahead: number = 2,
  ) {
    const nextItems = items.slice(currentIndex + 1, currentIndex + 1 + lookahead)

    nextItems.forEach((item) => {
      if (item.type === 'image') {
        imagePreloader.preload(item.url).catch(() => {})
      } else if (item.type === 'video') {
        videoPreloader.preloadMetadata(item.url).catch(() => {})
      }
    })
  }

  /**
   * 清除所有缓存
   */
  clearAll() {
    imagePreloader.clearCache()
    videoPreloader.clearCache()
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      images: imagePreloader.getStats(),
      videos: videoPreloader.getStats(),
    }
  }
}

// 导出单例
export const imagePreloader = new ImagePreloader()
export const videoPreloader = new VideoPreloader()
export const smartPreloader = new SmartPreloader()

// 开发环境暴露到全局
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(
    window as Window & {
      __preloader?: {
        image: typeof imagePreloader
        video: typeof videoPreloader
        smart: typeof smartPreloader
      }
    }
  ).__preloader = {
    image: imagePreloader,
    video: videoPreloader,
    smart: smartPreloader,
  }
}
