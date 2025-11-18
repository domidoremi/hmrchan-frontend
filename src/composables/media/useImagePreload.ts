/**
 * 图片预加载 Composable
 * 实现智能图片预加载策略
 */

import { ref, onMounted } from 'vue'

export interface PreloadOptions {
  /**
   * 预加载优先级
   * 'critical' - 关键图片，立即预加载
   * 'high' - 高优先级，在空闲时预加载
   * 'low' - 低优先级，延迟预加载
   */
  priority?: 'critical' | 'high' | 'low'

  /**
   * 延迟时间（毫秒）
   * 延迟多久后开始预加载
   */
  delay?: number

  /**
   * 是否在网络空闲时预加载
   */
  onIdle?: boolean

  /**
   * 最大并发预加载数量
   */
  maxConcurrent?: number

  /**
   * 是否仅在 WiFi 下预加载
   */
  wifiOnly?: boolean
}

export interface PreloadResult {
  /**
   * 是否正在预加载
   */
  isPreloading: Ref<boolean>

  /**
   * 已预加载的图片数量
   */
  preloadedCount: Ref<number>

  /**
   * 预加载总数
   */
  totalCount: Ref<number>

  /**
   * 预加载进度（0-100）
   */
  progress: Ref<number>

  /**
   * 预加载错误
   */
  errors: Ref<Error[]>

  /**
   * 预加载单张图片
   */
  preload: (url: string) => Promise<void>

  /**
   * 批量预加载图片
   */
  preloadBatch: (urls: string[]) => Promise<void>

  /**
   * 取消预加载
   */
  cancel: () => void
}

import type { Ref } from 'vue'

/**
 * 检测网络连接类型
 */
interface NetworkInformation {
  effectiveType?: string
  type?: string
  saveData?: boolean
}

function getConnectionType(): string {
  if ('connection' in navigator) {
    const conn = (navigator as { connection?: NetworkInformation }).connection
    return conn?.effectiveType || 'unknown'
  }
  return 'unknown'
}

/**
 * 检测是否为 WiFi 连接
 */
function isWiFiConnection(): boolean {
  if ('connection' in navigator) {
    const conn = (navigator as { connection?: NetworkInformation }).connection
    // 检测连接类型
    const type = conn?.type
    return type === 'wifi' || type === 'ethernet'
  }
  // 如果无法检测，默认允许
  return true
}

/**
 * 检测是否启用了数据节省模式
 */
function isDataSaverEnabled(): boolean {
  if ('connection' in navigator) {
    const conn = (navigator as { connection?: NetworkInformation }).connection
    return conn?.saveData === true
  }
  return false
}

/**
 * 使用图片预加载
 */
export function useImagePreload(options: PreloadOptions = {}): PreloadResult {
  const {
    priority = 'high',
    delay = 0,
    onIdle = true,
    maxConcurrent = 3,
    wifiOnly = false,
  } = options

  const isPreloading = ref(false)
  const preloadedCount = ref(0)
  const totalCount = ref(0)
  const errors = ref<Error[]>([])

  const progress = ref(0)
  const abortController = new AbortController()
  let preloadQueue: string[] = []
  let activePreloads = 0

  /**
   * 更新进度
   */
  const updateProgress = () => {
    if (totalCount.value > 0) {
      progress.value = Math.round((preloadedCount.value / totalCount.value) * 100)
    }
  }

  /**
   * 检查是否应该预加载
   */
  const shouldPreload = (): boolean => {
    // 检查数据节省模式
    if (isDataSaverEnabled()) {
      console.log('[ImagePreload] Data saver enabled, skipping preload')
      return false
    }

    // 检查网络连接
    if (wifiOnly && !isWiFiConnection()) {
      console.log('[ImagePreload] Not on WiFi, skipping preload')
      return false
    }

    // 检查网络速度
    const connectionType = getConnectionType()
    if (connectionType === 'slow-2g' || connectionType === '2g') {
      console.log('[ImagePreload] Slow connection, skipping preload')
      return false
    }

    return true
  }

  /**
   * 预加载单张图片
   */
  const preload = async (url: string): Promise<void> => {
    if (!shouldPreload()) {
      return
    }

    if (abortController.signal.aborted) {
      throw new Error('Preload cancelled')
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const img = new Image()

        img.onload = () => {
          preloadedCount.value++
          updateProgress()
          resolve()
        }

        img.onerror = () => {
          const error = new Error(`Failed to preload image: ${url}`)
          errors.value.push(error)
          reject(error)
        }

        // 监听取消信号
        abortController.signal.addEventListener('abort', () => {
          img.src = ''
          reject(new Error('Preload cancelled'))
        })

        img.src = url
      })
    } catch (error) {
      console.warn('[ImagePreload] Failed to preload:', url, error)
      throw error
    }
  }

  /**
   * 处理预加载队列
   */
  const processQueue = async () => {
    while (preloadQueue.length > 0 && activePreloads < maxConcurrent) {
      const url = preloadQueue.shift()
      if (!url) continue

      activePreloads++

      preload(url)
        .catch((error) => {
          console.warn('[ImagePreload] Error:', error)
        })
        .finally(() => {
          activePreloads--
          if (preloadQueue.length > 0) {
            processQueue()
          } else if (activePreloads === 0) {
            isPreloading.value = false
          }
        })
    }
  }

  /**
   * 批量预加载图片
   */
  const preloadBatch = async (urls: string[]): Promise<void> => {
    if (!shouldPreload() || urls.length === 0) {
      return
    }

    isPreloading.value = true
    totalCount.value = urls.length
    preloadedCount.value = 0
    errors.value = []
    progress.value = 0

    // 添加到队列
    preloadQueue = [...urls]

    // 根据优先级决定何时开始
    const startPreload = () => {
      if (priority === 'critical') {
        // 关键图片立即预加载
        processQueue()
      } else if (priority === 'high') {
        // 高优先级在空闲时预加载
        if (onIdle && 'requestIdleCallback' in window) {
          requestIdleCallback(() => processQueue(), { timeout: 2000 })
        } else {
          setTimeout(() => processQueue(), delay)
        }
      } else {
        // 低优先级延迟预加载
        setTimeout(() => processQueue(), delay || 1000)
      }
    }

    startPreload()
  }

  /**
   * 取消预加载
   */
  const cancel = () => {
    abortController.abort()
    preloadQueue = []
    isPreloading.value = false
  }

  return {
    isPreloading,
    preloadedCount,
    totalCount,
    progress,
    errors,
    preload,
    preloadBatch,
    cancel,
  }
}

/**
 * 智能预加载关键图片
 * 自动识别页面中的关键图片并预加载
 */
export function useSmartImagePreload() {
  const { preloadBatch, ...rest } = useImagePreload({
    priority: 'high',
    onIdle: true,
    maxConcurrent: 3,
    wifiOnly: false,
  })

  /**
   * 识别关键图片
   * - 首屏可见的图片
   * - 标记为 fetchpriority="high" 的图片
   * - Hero 图片、Logo 等
   */
  const identifyCriticalImages = (): string[] => {
    const criticalImages: string[] = []

    // 1. 查找高优先级图片
    const highPriorityImages = document.querySelectorAll('img[fetchpriority="high"]')
    highPriorityImages.forEach((img) => {
      const src = (img as HTMLImageElement).src || img.getAttribute('data-src')
      if (src) criticalImages.push(src)
    })

    // 2. 查找首屏图片（视口内的图片）
    const allImages = document.querySelectorAll('img')
    allImages.forEach((img) => {
      const rect = img.getBoundingClientRect()
      const isInViewport =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)

      if (isInViewport) {
        const src = img.src || img.getAttribute('data-src')
        if (src && !criticalImages.includes(src)) {
          criticalImages.push(src)
        }
      }
    })

    // 3. 查找特定类名的图片（如 hero, logo, banner）
    const specialImages = document.querySelectorAll(
      'img.hero, img.logo, img.banner, .hero img, .logo img, .banner img',
    )
    specialImages.forEach((img) => {
      const src = (img as HTMLImageElement).src || img.getAttribute('data-src')
      if (src && !criticalImages.includes(src)) {
        criticalImages.push(src)
      }
    })

    return criticalImages
  }

  /**
   * 自动预加载关键图片
   */
  const autoPreload = () => {
    const criticalImages = identifyCriticalImages()

    if (criticalImages.length > 0) {
      console.log(`[SmartPreload] Found ${criticalImages.length} critical images`)
      preloadBatch(criticalImages)
    }
  }

  onMounted(() => {
    // 页面加载完成后识别并预加载关键图片
    if (document.readyState === 'complete') {
      autoPreload()
    } else {
      window.addEventListener('load', autoPreload)
    }
  })

  return {
    ...rest,
    preloadBatch,
    identifyCriticalImages,
    autoPreload,
  }
}

/**
 * 预加载下一页的图片
 * 用于分页或无限滚动场景
 */
export function useNextPagePreload(getNextPageImages: () => string[] | Promise<string[]>) {
  const { preloadBatch, ...rest } = useImagePreload({
    priority: 'low',
    delay: 1000,
    onIdle: true,
    maxConcurrent: 2,
  })

  const preloadNextPage = async () => {
    const images = await getNextPageImages()
    if (images.length > 0) {
      console.log(`[NextPagePreload] Preloading ${images.length} images`)
      preloadBatch(images)
    }
  }

  return {
    ...rest,
    preloadBatch,
    preloadNextPage,
  }
}
