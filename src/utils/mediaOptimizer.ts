import { normalizeToProxyPath } from '@/utils/url'

// Media URL helpers preserve the same-origin proxy contract used by the browser.

export type MediaThumbnailSize = 'small' | 'medium' | 'large' | 'original'

export const THUMBNAIL_SIZES: Record<
  MediaThumbnailSize,
  { width: number; height: number; usage: string }
> = {
  small: { width: 200, height: 200, usage: '列表卡片、网格预览' },
  medium: { width: 400, height: 400, usage: 'Feed 流、网格大图' },
  large: { width: 800, height: 800, usage: '详情页预览、Lightbox 占位' },
  original: { width: 0, height: 0, usage: 'Lightbox 全屏、下载' },
}

export function getMediaStreamUrl(mediaId: string): string {
  const apiBaseUrl =
    import.meta.env.VITE_API_ENDPOINT || `${import.meta.env.VITE_API_URL || '/api'}/v1`
  return `${apiBaseUrl}/media/${mediaId}/stream`
}

let webpSupported: boolean | null = null
export function supportsWebP(): boolean {
  if (webpSupported !== null) return webpSupported

  if (typeof window === 'undefined') return false

  const canvas = document.createElement('canvas')
  try {
    if (canvas.getContext && canvas.getContext('2d')) {
      webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
      return webpSupported
    }
  } catch {
    // Some test/runtime environments expose canvas APIs but do not implement them.
  }

  webpSupported = false
  if (!canvas.getContext) {
    webpSupported = false
  }

  return webpSupported
}

export function getMediaThumbnailUrl(mediaId: string, size: MediaThumbnailSize = 'medium'): string {
  const apiBaseUrl =
    import.meta.env.VITE_API_ENDPOINT || `${import.meta.env.VITE_API_URL || '/api'}/v1`
  const baseUrl = `${apiBaseUrl}/media/${mediaId}/thumbnail?size=${size}`

  // An explicit format avoids unstable upstream defaults while retaining JPEG fallback.
  const format = supportsWebP() ? 'webp' : 'jpeg'
  return `${baseUrl}&format=${format}`
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768
}

export function getResponsiveThumbnailSize(
  baseSize: 'small' | 'medium' = 'small'
): MediaThumbnailSize {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const isMobile = isMobileDevice()

  if (isMobile) {
    if (baseSize === 'small') return 'small'

    return dpr >= 2 ? 'medium' : 'small'
  }

  if (baseSize === 'small') {
    if (dpr >= 3) return 'large'
    if (dpr >= 2) return 'medium'
    return 'small'
  }

  // baseSize === 'medium'
  if (dpr >= 2) return 'large'
  return 'medium'
}

export function getResponsiveThumbnailUrl(
  mediaId: string,
  baseSize: 'small' | 'medium' = 'small'
): string {
  const size = getResponsiveThumbnailSize(baseSize)
  return getMediaThumbnailUrl(mediaId, size)
}

export function getMediaThumbnailSrcset(mediaId?: string | null): string | null {
  if (!mediaId) return null

  const small = getMediaThumbnailUrl(mediaId, 'small')
  const medium = getMediaThumbnailUrl(mediaId, 'medium')
  const large = getMediaThumbnailUrl(mediaId, 'large')

  return `${small} ${THUMBNAIL_SIZES.small.width}w, ${medium} ${THUMBNAIL_SIZES.medium.width}w, ${large} ${THUMBNAIL_SIZES.large.width}w`
}

export function extractMediaIdFromUrl(url?: string | null): string | null {
  if (!url) return null

  const match = url.match(/\/api\/v1\/media\/([0-9a-f-]+)\/(?:stream|thumbnail)/i)
  return match?.[1] ?? null
}

export function normalizeToThumbnailUrl(
  url?: string | null,
  size: MediaThumbnailSize = 'medium'
): string | null {
  if (!url) return null
  const normalized = normalizeToProxyPath(url) ?? url
  const mediaId = extractMediaIdFromUrl(normalized)
  if (!mediaId) return normalized
  if (!mediaId) return url

  return getMediaThumbnailUrl(mediaId, size)
}

export const VIDEO_PLACEHOLDER_URL = '/images/video-placeholder.svg'

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

export function getThumbnailSrcset(thumbnailUrl?: string | null): string | null {
  const mediaId = extractMediaIdFromUrl(thumbnailUrl)
  if (!mediaId) return null
  return getMediaThumbnailSrcset(mediaId)
}

export function isMediaThumbnailUrl(url?: string | null): boolean {
  if (!url) return false
  const normalized = normalizeToProxyPath(url) ?? url
  return /\/api\/v1\/media\/[^/]+\/thumbnail(?:$|[?#])/i.test(normalized)
}
