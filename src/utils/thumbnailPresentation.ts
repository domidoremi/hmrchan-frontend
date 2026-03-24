import {
  getThumbnailSrcset,
  normalizeToThumbnailUrl,
  type MediaThumbnailSize,
} from '@/utils/mediaOptimizer'

export function resolveThumbnailSrc(
  thumbnailUrl: string | null | undefined,
  size: MediaThumbnailSize = 'medium'
): string | undefined {
  return normalizeToThumbnailUrl(thumbnailUrl, size) || thumbnailUrl || undefined
}

export function resolveThumbnailSrcset(
  thumbnailUrl: string | null | undefined
): string | undefined {
  return getThumbnailSrcset(thumbnailUrl) || undefined
}

export function cachePostThumbnailPreview(
  postId: string,
  thumbnailUrl: string | null | undefined
): void {
  if (typeof sessionStorage === 'undefined') return
  if (!postId || !thumbnailUrl) return

  sessionStorage.setItem(
    `post-thumbnail-${postId}`,
    resolveThumbnailSrc(thumbnailUrl) || thumbnailUrl
  )
}
