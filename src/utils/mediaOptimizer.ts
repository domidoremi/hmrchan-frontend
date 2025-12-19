/**
 * Media Optimizer - 媒体优化工具
 *
 * 根据 THUMBNAIL_API.md 规范实现缩略图 URL 生成和媒体优化
 *
 * 使用场景指南：
 * - small: 卡片列表、网格缩略图（首页、探索页、作者页的帖子卡片）
 * - medium: 详情页缩略图列表、占位图
 * - large: 详情页主图预览（非全屏）
 * - original: Lightbox 全屏查看、下载
 */

export type MediaThumbnailSize = 'small' | 'medium' | 'large' | 'original'

/**
 * 缩略图尺寸配置
 * - small: 200×200 - 列表卡片、网格预览（推荐用于 < 300px 容器）
 * - medium: 400×400 - Feed 流、网格大图（推荐用于 300-600px 容器）
 * - large: 800×800 - 详情页预览、Lightbox 占位（推荐用于 > 600px 容器）
 * - original: 原始尺寸 - 仅用于 Lightbox 全屏查看
 */
export const THUMBNAIL_SIZES: Record<MediaThumbnailSize, { width: number; height: number; usage: string }> = {
  small: { width: 200, height: 200, usage: '列表卡片、网格预览' },
  medium: { width: 400, height: 400, usage: 'Feed 流、网格大图' },
  large: { width: 800, height: 800, usage: '详情页预览、Lightbox 占位' },
  original: { width: 0, height: 0, usage: 'Lightbox 全屏、下载' },
}

/**
 * 获取媒体流 URL
 */
export function getMediaStreamUrl(mediaId: string): string {
  return `/api/v1/media/${mediaId}/stream`
}

/**
 * 获取媒体缩略图 URL
 */
export function getMediaThumbnailUrl(mediaId: string, size: MediaThumbnailSize = 'medium'): string {
  return `/api/v1/media/${mediaId}/thumbnail?size=${size}`
}

/**
 * 根据设备像素比 (DPR) 获取推荐的缩略图尺寸
 * - 1x 屏幕: small
 * - 2x 屏幕: medium
 * - 3x 屏幕: large
 */
export function getResponsiveThumbnailSize(baseSize: 'small' | 'medium' = 'small'): MediaThumbnailSize {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

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
export function getResponsiveThumbnailUrl(mediaId: string, baseSize: 'small' | 'medium' = 'small'): string {
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
  size: MediaThumbnailSize = 'medium',
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
