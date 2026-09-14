import type { FavoriteResponse } from '@/api/favoriteService'
import type { BrowsingHistoryItem } from '@/api/historyService'
import { resolveMediaSources, type MediaSourceLike } from '@/utils/mediaOptimizer'

export interface PostPreviewModel {
  id: string
  postId: string
  title: string
  authorName?: string | undefined
  thumbnailUrl?: string | null
  mediaId?: string | null
  mediaType?: string | null
  streamUrl?: string | null
  target: string
}

export interface HistoryPreviewRecord {
  id: string
  viewedAt: string
  preview: PostPreviewModel
}

function buildPostTarget(
  postId: string,
  media: MediaSourceLike
): Pick<PostPreviewModel, 'target' | 'mediaId' | 'mediaType' | 'streamUrl' | 'thumbnailUrl'> {
  const resolved = resolveMediaSources(media)
  return {
    target: resolved.mediaId ? `/post/${postId}?mediaId=${resolved.mediaId}` : `/post/${postId}`,
    mediaId: resolved.mediaId,
    mediaType: media.media_type ?? null,
    streamUrl: resolved.streamUrl,
    thumbnailUrl: resolved.displayUrl,
  }
}

function normalizeTitle(candidate?: string | null, fallbackTitle?: string): string {
  return candidate?.trim() || fallbackTitle || 'Untitled post'
}

export function buildFavoritePostPreview(
  favorite: FavoriteResponse,
  fallbackTitle?: string
): PostPreviewModel {
  const postId = favorite.post_id || favorite.post?.id || ''
  const media = {
    media_id: favorite.post?.media_id,
    media_type: favorite.post?.media_type,
    stream_url: favorite.post?.stream_url,
    thumbnail_url: favorite.post?.thumbnail_url,
  }
  const mediaTarget = buildPostTarget(postId, media)

  return {
    id: favorite.id,
    postId,
    title: normalizeTitle(favorite.post?.title, fallbackTitle),
    authorName: favorite.post?.author_name?.trim() || undefined,
    ...mediaTarget,
  }
}

export function buildHistoryPostPreview(
  item: BrowsingHistoryItem & {
    content_preview?: {
      title?: string
      media_id?: string | null
      media_type?: string | null
      stream_url?: string | null
      thumbnail_url?: string | null
      author_name?: string | null
    } | null
  },
  fallbackTitle?: string
): HistoryPreviewRecord {
  const postId = item.content_uuid || item.post_id || ''
  const title = normalizeTitle(item.content_preview?.title ?? item.post_title, fallbackTitle)
  const authorName = item.content_preview?.author_name ?? item.author_name ?? undefined
  const mediaTarget = buildPostTarget(postId, {
    media_id: item.content_preview?.media_id ?? item.post_media_id,
    media_type: item.content_preview?.media_type ?? item.post_media_type,
    stream_url: item.content_preview?.stream_url ?? item.post_stream_url,
    thumbnail_url: item.content_preview?.thumbnail_url ?? item.post_thumbnail_url,
  })

  return {
    id: String(item.id),
    viewedAt: item.created_at ?? item.viewed_at ?? '',
    preview: {
      id: String(item.id),
      postId,
      title,
      authorName: authorName?.trim() || undefined,
      ...mediaTarget,
    },
  }
}
