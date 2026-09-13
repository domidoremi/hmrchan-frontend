import {
  getThumbnailSrcset,
  normalizeToThumbnailUrl,
  resolveMediaSources,
  type MediaSourceLike,
  type MediaThumbnailSize,
} from '@/utils/mediaOptimizer'

const POST_PREVIEW_STORAGE_PREFIX = 'post-media-preview-v2-'

export function getPostPreviewStorageKey(postId: string): string {
  return `${POST_PREVIEW_STORAGE_PREFIX}${postId}`
}

export function resolveThumbnailSrc(
  thumbnailUrl: string | null | undefined,
  size: MediaThumbnailSize = 'original'
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
  media: MediaSourceLike | string | null | undefined
): void {
  if (typeof sessionStorage === 'undefined' || !postId || !media) return

  const source = typeof media === 'string' ? { thumbnail_url: media } : media
  const displayUrl = resolveMediaSources(source).displayUrl
  if (!displayUrl) return

  sessionStorage.setItem(getPostPreviewStorageKey(postId), displayUrl)
}
