export type MediaThumbnailSize = 'small' | 'medium' | 'large' | 'original'

export function getMediaStreamUrl(mediaId: string): string {
  return `/api/v1/media/${mediaId}/stream`
}

export function getMediaThumbnailUrl(mediaId: string, size: MediaThumbnailSize = 'medium'): string {
  return `/api/v1/media/${mediaId}/thumbnail?size=${size}`
}

export function extractMediaIdFromUrl(url?: string | null): string | null {
  if (!url) return null

  const match = url.match(/\/api\/v1\/media\/([0-9a-f-]+)\/(?:stream|thumbnail)/i)
  return match ? match[1] : null
}

export function normalizeToThumbnailUrl(
  url?: string | null,
  size: MediaThumbnailSize = 'medium',
): string | null {
  if (!url) return null

  const mediaId = extractMediaIdFromUrl(url)
  if (!mediaId) return url

  return getMediaThumbnailUrl(mediaId, size)
}
