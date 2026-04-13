import type { FavoriteResponse } from '@/api/favoriteService'
import type { BrowsingHistoryItem } from '@/api/historyService'
import { extractMediaIdFromUrl } from '@/utils/mediaOptimizer'

export interface PostPreviewModel {
  id: string
  postId: string
  title: string
  authorName?: string
  thumbnailUrl?: string | null
  mediaId?: string | null
  target: string
}

export interface HistoryPreviewRecord {
  id: string
  viewedAt: string
  preview: PostPreviewModel
}

function buildPostTarget(
  postId: string,
  thumbnailUrl?: string | null
): Pick<PostPreviewModel, 'target' | 'mediaId'> {
  const mediaId = thumbnailUrl ? extractMediaIdFromUrl(thumbnailUrl) : null
  return {
    target: mediaId ? `/post/${postId}?mediaId=${mediaId}` : `/post/${postId}`,
    mediaId,
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
  const thumbnailUrl = favorite.post?.thumbnail_url ?? null
  const { target, mediaId } = buildPostTarget(postId, thumbnailUrl)

  return {
    id: favorite.id,
    postId,
    title: normalizeTitle(favorite.post?.title, fallbackTitle),
    authorName: favorite.post?.author_name?.trim() || undefined,
    thumbnailUrl,
    mediaId,
    target,
  }
}

export function buildHistoryPostPreview(
  item: BrowsingHistoryItem & {
    content_preview?: {
      title?: string
      thumbnail_url?: string | null
      author_name?: string | null
    } | null
  },
  fallbackTitle?: string
): HistoryPreviewRecord {
  const postId = item.content_uuid || item.post_id || ''
  const title = normalizeTitle(item.content_preview?.title ?? item.post_title, fallbackTitle)
  const thumbnailUrl = item.content_preview?.thumbnail_url ?? item.post_thumbnail_url ?? null
  const authorName = item.content_preview?.author_name ?? item.author_name ?? undefined
  const { target, mediaId } = buildPostTarget(postId, thumbnailUrl)

  return {
    id: String(item.id),
    viewedAt: item.created_at ?? item.viewed_at ?? '',
    preview: {
      id: String(item.id),
      postId,
      title,
      authorName: authorName?.trim() || undefined,
      thumbnailUrl,
      mediaId,
      target,
    },
  }
}
