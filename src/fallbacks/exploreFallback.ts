import type { ListPostsParams, PostListItem } from '@/api/postService'
import { STATIC_EXPLORE_POSTS } from './generated/publicSnapshots'
import { clonePublicSnapshot, cursorPaginateFallbackItems } from './publicPageFallback'

export const EXPLORE_FALLBACK_POSTS: PostListItem[] = clonePublicSnapshot(STATIC_EXPLORE_POSTS)

function matchesText(post: PostListItem, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true

  return [
    post.title,
    post.content,
    post.author_name,
    post.author_username,
    ...(post.tags ?? []),
  ].some((value) =>
    String(value ?? '')
      .toLowerCase()
      .includes(needle)
  )
}

function getNumericSortValue(
  post: PostListItem,
  sortBy: NonNullable<ListPostsParams['sort_by']>
): number {
  switch (sortBy) {
    case 'like_count':
      return post.like_count
    case 'comment_count':
      return post.comment_count
    case 'view_count':
      return post.view_count
    case 'scraped_at':
    case 'published_at':
    default:
      return Date.parse(post.published_at ?? '') || 0
  }
}

export function getFallbackExplorePosts(
  params: ListPostsParams = {}
): ReturnType<typeof cursorPaginateFallbackItems<PostListItem>> {
  const sortBy = params.sort_by ?? 'published_at'
  const sortOrder = params.sort_order ?? 'desc'

  let items = EXPLORE_FALLBACK_POSTS.filter((post) => {
    if (params.platform && post.platform !== params.platform) return false
    if (params.author_id && post.author_id !== params.author_id) return false
    if (params.q && !matchesText(post, params.q)) return false
    if (typeof params.has_media === 'boolean') {
      const hasMedia = (post.media_count ?? 0) > 0
      if (hasMedia !== params.has_media) return false
    }
    if (params.published_after) {
      const publishedAt = Date.parse(post.published_at ?? '') || 0
      if (publishedAt < Date.parse(params.published_after)) return false
    }
    if (params.published_before) {
      const publishedAt = Date.parse(post.published_at ?? '') || 0
      if (publishedAt > Date.parse(params.published_before)) return false
    }
    return true
  })

  items = [...items].sort((left, right) => {
    const leftValue = getNumericSortValue(left, sortBy)
    const rightValue = getNumericSortValue(right, sortBy)
    return sortOrder === 'asc' ? leftValue - rightValue : rightValue - leftValue
  })

  return cursorPaginateFallbackItems(items, {
    cursor: params.cursor ?? null,
    limit: params.limit ?? 20,
  })
}

export function getFallbackExplorePostById(postId: string): PostListItem | null {
  return EXPLORE_FALLBACK_POSTS.find((post) => post.id === postId) ?? null
}
