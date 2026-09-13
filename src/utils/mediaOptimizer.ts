import { normalizeHttpUrl } from '@/utils/security'
import { probeImageStream } from '@/utils/mediaStreamProbe'
import { normalizeToProxyPath } from '@/utils/url'

// Media URL helpers preserve the same-origin proxy contract used by the browser.

export type MediaThumbnailSize = 'small' | 'medium' | 'large' | 'original'
export type MediaKind = 'image' | 'video' | 'unknown'

export interface MediaSourceLike {
  media_id?: string | null | undefined
  media_type?: string | null | undefined
  stream_url?: string | null | undefined
  thumbnail_url?: string | null | undefined
  file_type?: string | null | undefined
  file_path?: string | null | undefined
  thumbnail_path?: string | null | undefined
}

export interface ResolvedMediaSources {
  kind: MediaKind
  mediaId: string | null
  streamUrl: string | null
  posterUrl: string | null
  displayUrl: string | null
  imageCandidates: string[]
}

const originalImageProbeCache = new Map<string, Promise<string | null>>()
const MAX_IMAGE_PROBE_CACHE_SIZE = 250

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

  const match = url.match(/\/api\/v1\/media\/([^/?#]+)\/(?:stream|thumbnail)(?:$|[/?#])/i)
  if (!match?.[1]) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

export function normalizeMediaKind(value?: string | null): MediaKind {
  const normalized = value?.trim().toLowerCase() ?? ''
  if (normalized === 'image' || normalized.startsWith('image/')) return 'image'
  if (normalized === 'video' || normalized.startsWith('video/')) return 'video'
  return 'unknown'
}

export function normalizeMediaUrl(url?: string | null): string | null {
  if (!url) return null
  const proxied = normalizeToProxyPath(url)
  if (!proxied || !normalizeHttpUrl(proxied)) return null
  return proxied
}

export function isMediaStreamUrl(url?: string | null): boolean {
  const normalized = normalizeMediaUrl(url)
  return Boolean(normalized && /\/api\/v1\/media\/[^/]+\/stream(?:$|[?#])/i.test(normalized))
}

export function resolveMediaSources(
  media: MediaSourceLike | null | undefined
): ResolvedMediaSources {
  const kind = normalizeMediaKind(media?.media_type ?? media?.file_type)
  const explicitStreamUrl = normalizeMediaUrl(media?.stream_url)
  const legacyFileUrl = normalizeMediaUrl(media?.file_path)
  const explicitPosterUrl = normalizeMediaUrl(media?.thumbnail_url ?? media?.thumbnail_path)
  const fallbackUrl = explicitPosterUrl || legacyFileUrl
  const mediaId =
    (typeof media?.media_id === 'string' && media.media_id.trim()) ||
    extractMediaIdFromUrl(explicitStreamUrl) ||
    extractMediaIdFromUrl(explicitPosterUrl) ||
    null
  const generatedStreamUrl = mediaId ? getMediaStreamUrl(mediaId) : null
  const generatedPosterUrl = mediaId ? getMediaThumbnailUrl(mediaId, 'large') : null
  const streamUrl =
    explicitStreamUrl || (kind !== 'unknown' ? legacyFileUrl : null) || generatedStreamUrl

  if (kind === 'image') {
    const imageStreamUrl =
      streamUrl && !isMediaThumbnailUrl(streamUrl) ? streamUrl : generatedStreamUrl
    return {
      kind,
      mediaId,
      streamUrl: imageStreamUrl,
      posterUrl: explicitPosterUrl,
      displayUrl: imageStreamUrl || explicitPosterUrl || legacyFileUrl,
      imageCandidates: uniqueMediaUrls([imageStreamUrl, explicitPosterUrl, legacyFileUrl]),
    }
  }

  if (kind === 'video') {
    const posterUrl = explicitPosterUrl || generatedPosterUrl
    return {
      kind,
      mediaId,
      streamUrl,
      posterUrl,
      displayUrl: posterUrl,
      imageCandidates: uniqueMediaUrls([posterUrl]),
    }
  }

  const safeDisplayUrl = explicitPosterUrl || fallbackUrl
  return {
    kind,
    mediaId,
    streamUrl: explicitStreamUrl,
    posterUrl: safeDisplayUrl,
    displayUrl: safeDisplayUrl,
    imageCandidates: uniqueMediaUrls([safeDisplayUrl]),
  }
}

function uniqueMediaUrls(urls: Array<string | null | undefined>): string[] {
  return Array.from(new Set(urls.filter((url): url is string => Boolean(url))))
}

export function normalizeToThumbnailUrl(
  url?: string | null,
  size: MediaThumbnailSize = 'medium'
): string | null {
  if (!url) return null
  const normalized = normalizeToProxyPath(url) ?? url
  const mediaId = extractMediaIdFromUrl(normalized)
  if (!mediaId) return normalized

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

export function isImageStreamResponse(contentType: string, bytes: Uint8Array): boolean {
  const normalizedType = contentType.toLowerCase().split(';', 1)[0]?.trim() ?? ''
  if (normalizedType.startsWith('image/')) return true
  if (normalizedType !== 'application/octet-stream' || bytes.length < 12) return false

  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  const isWebp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50

  return isJpeg || isPng || isWebp
}

export async function resolveOriginalImageStream(
  media: MediaSourceLike | string
): Promise<string | null> {
  const source = typeof media === 'string' ? { thumbnail_url: media } : media
  const resolved = resolveMediaSources(source)
  if (resolved.kind === 'video') return null
  if (resolved.kind === 'image') return resolved.streamUrl
  if (!resolved.mediaId) return null

  const streamUrl = getMediaStreamUrl(resolved.mediaId)
  const cached = originalImageProbeCache.get(streamUrl)
  if (cached) return cached

  if (originalImageProbeCache.size >= MAX_IMAGE_PROBE_CACHE_SIZE) {
    originalImageProbeCache.delete(originalImageProbeCache.keys().next().value ?? '')
  }

  const probe = probeImageStream(streamUrl, isImageStreamResponse)

  originalImageProbeCache.set(streamUrl, probe)
  void probe.then((result) => {
    if (result === null && originalImageProbeCache.get(streamUrl) === probe) {
      originalImageProbeCache.delete(streamUrl)
    }
  })
  return probe
}

export async function resolveMediaImageCandidates(
  media: MediaSourceLike | null | undefined,
  options: { probeUnknown?: boolean } = {}
): Promise<string[]> {
  const resolved = resolveMediaSources(media)
  if (resolved.kind !== 'unknown' || !options.probeUnknown) return resolved.imageCandidates

  const streamUrl = await resolveOriginalImageStream(media ?? {})
  return uniqueMediaUrls([streamUrl, ...resolved.imageCandidates])
}
