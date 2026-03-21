export interface PostDetailMediaLike {
  id?: string | null
  file_type?: string | null
  width?: number | null
  height?: number | null
}

export interface PostDetailLike {
  title?: string | null
  description?: string | null
  media_count?: number | null
  media_files?: PostDetailMediaLike[] | null
}

export function buildDetailTitle(post: PostDetailLike | null | undefined): string {
  const title = (post?.title ?? '').trim()
  const description = (post?.description ?? '').trim()

  if (!title) return ''
  if (title === description) return ''
  if (description && description.startsWith(title)) return ''
  return title
}

export function shouldShowReadFullText(
  description: string | null | undefined,
  threshold = 280
): boolean {
  return (description?.length ?? 0) > threshold
}

export function resolveMediaAspectRatio(media: PostDetailMediaLike | null | undefined): number {
  if (!media?.width || !media?.height) return 16 / 9
  return media.width / media.height
}

export function buildActiveMediaViewerStyle(
  media: PostDetailMediaLike | null | undefined
): Record<string, string> {
  const aspectRatio = resolveMediaAspectRatio(media)

  if (!media) {
    return {
      '--aspect-ratio': '1.7777778',
      '--media-min-block-size': 'clamp(18rem, 52dvh, 40rem)',
    }
  }

  const intrinsicHeight =
    media.width && media.height ? `${media.height}px` : 'clamp(18rem, 52dvh, 40rem)'

  return {
    '--aspect-ratio': String(aspectRatio),
    '--media-min-block-size': intrinsicHeight,
  }
}

export function buildActiveMediaElementStyle(
  media: PostDetailMediaLike | null | undefined
): Record<string, string> {
  return {
    aspectRatio: String(resolveMediaAspectRatio(media)),
  }
}

export function isMediaPending(
  post: PostDetailLike | null | undefined,
  detailFetched: boolean
): boolean {
  if (!post || detailFetched) return false

  const hasFiles = Boolean(post.media_files && post.media_files.length > 0)
  if (hasFiles) return false

  return (post.media_count ?? 0) > 0
}

export function shouldShowThumbnailRail(
  post: PostDetailLike | null | undefined,
  detailFetched: boolean
): boolean {
  const mediaCount = post?.media_files?.length ?? 0
  if (mediaCount > 1) return true
  return Boolean(post && !detailFetched && (post.media_count ?? 0) > 1)
}

export function getThumbnailPlaceholderCount(mediaCount?: number | null): number {
  return Math.min(Math.max(mediaCount ?? 0, 2), 6)
}
