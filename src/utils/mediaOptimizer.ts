/**
 * Media Optimizer - 媒体优化工具
 *
 * 根据 THUMBNAIL_API.md 规范实现缩略图 URL 生成和媒体优化
 *
 * 使用场景指南：
 * - small: 小尺寸预览（特殊场景）
 * - medium: 移动端卡片列表、网格缩略图（< 640px）
 * - large: 桌面端卡片列表、详情页预览（≥ 640px）
 * - original: Lightbox 全屏查看、下载
 */

export type MediaThumbnailSize = 'small' | 'medium' | 'large' | 'original'

/**
 * 缩略图尺寸配置
 * - small: 200×200 - 小尺寸预览（特殊场景）
 * - medium: 400×400 - 移动端列表卡片、网格预览（< 640px）
 * - large: 800×800 - 桌面端列表卡片、详情页预览（≥ 640px）
 * - original: 原始尺寸 - 仅用于 Lightbox 全屏查看
 */
export const THUMBNAIL_SIZES: Record<
  MediaThumbnailSize,
  { width: number; height: number; usage: string }
> = {
  small: { width: 200, height: 200, usage: '列表卡片、网格预览' },
  medium: { width: 400, height: 400, usage: 'Feed 流、网格大图' },
  large: { width: 800, height: 800, usage: '详情页预览、Lightbox 占位' },
  original: { width: 0, height: 0, usage: 'Lightbox 全屏、下载' },
}

/**
 * 获取媒体流 URL
 */
export function getMediaStreamUrl(mediaId: string): string {
  const apiBaseUrl =
    import.meta.env.VITE_API_ENDPOINT || `${import.meta.env.VITE_API_URL || '/api'}/v1`
  return `${apiBaseUrl}/media/${mediaId}/stream`
}

/**
 * 检测浏览器是否支持 WebP 格式
 */
let webpSupported: boolean | null = null
export function supportsWebP(): boolean {
  if (webpSupported !== null) return webpSupported

  if (typeof window === 'undefined') return false

  const canvas = document.createElement('canvas')
  if (canvas.getContext && canvas.getContext('2d')) {
    webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
  } else {
    webpSupported = false
  }

  return webpSupported
}

/**
 * 获取媒体缩略图 URL
 * 如果浏览器支持 WebP 且后端已启用，自动请求 WebP 格式
 */
export function getMediaThumbnailUrl(mediaId: string, size: MediaThumbnailSize = 'medium'): string {
  const apiBaseUrl =
    import.meta.env.VITE_API_ENDPOINT || `${import.meta.env.VITE_API_URL || '/api'}/v1`
  const baseUrl = `${apiBaseUrl}/media/${mediaId}/thumbnail?size=${size}`

  // 始终带 format 参数：避免后端在缺少 format 时出现不稳定的 500
  // - 浏览器支持 WebP：优先请求 webp（后端也可能回退为 jpeg）
  // - 不支持 WebP：请求 jpeg，避免返回 webp 导致无法解码
  const format = supportsWebP() ? 'webp' : 'jpeg'
  return `${baseUrl}&format=${format}`
}

/**
 * 检测是否为移动设备
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768
}

/**
 * 根据设备像素比 (DPR) 和屏幕尺寸获取推荐的缩略图尺寸
 * 移动端优化：即使高 DPR 也使用较小尺寸，减少流量
 * - 移动端: 始终使用 small（200x200 足够）
 * - 桌面端 1x: small
 * - 桌面端 2x: medium
 * - 桌面端 3x: large
 */
export function getResponsiveThumbnailSize(
  baseSize: 'small' | 'medium' = 'small'
): MediaThumbnailSize {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const isMobile = isMobileDevice()

  // 移动端优化：使用更小的图片减少流量和加载时间
  if (isMobile) {
    if (baseSize === 'small') return 'small'
    // medium 基础在移动端最多用 medium
    return dpr >= 2 ? 'medium' : 'small'
  }

  // 桌面端：根据 DPR 选择
  if (baseSize === 'small') {
    if (dpr >= 3) return 'large'
    if (dpr >= 2) return 'medium'
    return 'small'
  }

  // baseSize === 'medium'
  if (dpr >= 2) return 'large'
  return 'medium'
}

/**
 * 获取响应式缩略图 URL（根据 DPR 自动选择尺寸）
 */
export function getResponsiveThumbnailUrl(
  mediaId: string,
  baseSize: 'small' | 'medium' = 'small'
): string {
  const size = getResponsiveThumbnailSize(baseSize)
  return getMediaThumbnailUrl(mediaId, size)
}

/**
 * 从 URL 中提取媒体 ID
 */
export function extractMediaIdFromUrl(url?: string | null): string | null {
  if (!url) return null

  const match = url.match(/\/api\/v1\/media\/([0-9a-f-]+)\/(?:stream|thumbnail)/i)
  return match?.[1] ?? null
}

/**
 * 将 URL 转换为缩略图 URL
 */
export function normalizeToThumbnailUrl(
  url?: string | null,
  size: MediaThumbnailSize = 'medium'
): string | null {
  if (!url) return null

  const mediaId = extractMediaIdFromUrl(url)
  if (!mediaId) return url

  return getMediaThumbnailUrl(mediaId, size)
}

/**
 * 视频占位图 URL（用于视频缩略图 404 时的回退）
 */
export const VIDEO_PLACEHOLDER_URL = '/images/video-placeholder.svg'

/**
 * 创建带错误回退的图片加载器
 * 用于处理缩略图 404 错误，自动回退到占位图
 */
export function createImageLoader(
  src: string,
  options: {
    fallbackSrc?: string
    onLoad?: () => void
    onError?: (error: Error) => void
  } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      options.onLoad?.()
      resolve(src)
    }

    img.onerror = () => {
      const error = new Error(`Failed to load image: ${src}`)
      options.onError?.(error)

      if (options.fallbackSrc) {
        resolve(options.fallbackSrc)
      } else {
        reject(error)
      }
    }

    img.src = src
  })
}

/**
 * 生成响应式图片 srcset 属性值
 * 用于 <img srcset="..."> 实现响应式图片加载
 *
 * @param thumbnailUrl - 原始缩略图 URL（包含 mediaId）
 * @returns srcset 字符串，如 "url1 200w, url2 400w, url3 800w"，或 null（无法提取 mediaId）
 */
export function getThumbnailSrcset(thumbnailUrl?: string | null): string | null {
  const mediaId = extractMediaIdFromUrl(thumbnailUrl)
  if (!mediaId) return null

  const small = getMediaThumbnailUrl(mediaId, 'small')
  const medium = getMediaThumbnailUrl(mediaId, 'medium')
  const large = getMediaThumbnailUrl(mediaId, 'large')

  return `${small} ${THUMBNAIL_SIZES.small.width}w, ${medium} ${THUMBNAIL_SIZES.medium.width}w, ${large} ${THUMBNAIL_SIZES.large.width}w`
}
