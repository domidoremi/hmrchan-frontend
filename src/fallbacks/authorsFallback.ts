import type { AuthorListItem, AuthorResponse, ListAuthorsParams } from '@/api/authorService'
import type { PaginatedApiResponse } from '@/api'
import type { PostListItem } from '@/api/postService'
import {
  STATIC_AUTHORS,
  STATIC_AUTHOR_DETAILS,
  STATIC_AUTHOR_POSTS,
} from './generated/publicSnapshots'
import { clonePublicSnapshot, paginateFallbackItems } from './publicPageFallback'

export const AUTHORS_FALLBACK_AUTHORS: AuthorListItem[] = clonePublicSnapshot(STATIC_AUTHORS)

export function getFallbackAuthors(
  params: ListAuthorsParams = {}
): PaginatedApiResponse<AuthorListItem> {
  const sortBy = params.sort_by ?? 'created_at'
  const sortOrder = params.sort_order ?? 'desc'

  let items = AUTHORS_FALLBACK_AUTHORS.filter((item) => {
    if (params.platform && item.platform !== params.platform) return false
    if (params.is_verified !== undefined && item.is_verified !== params.is_verified) return false
    if (typeof params.min_followers === 'number') {
      if ((item.follower_count ?? 0) < params.min_followers) return false
    }
    if (params.q) {
      const query = params.q.trim().toLowerCase()
      const haystack = [item.display_name, item.username, item.description, item.platform]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  })

  items = [...items].sort((left, right) => {
    const leftValue =
      sortBy === 'follower_count'
        ? (left.follower_count ?? 0)
        : sortBy === 'post_count'
          ? (left.post_count ?? 0)
          : Date.parse(left.created_at ?? '') || 0
    const rightValue =
      sortBy === 'follower_count'
        ? (right.follower_count ?? 0)
        : sortBy === 'post_count'
          ? (right.post_count ?? 0)
          : Date.parse(right.created_at ?? '') || 0

    return sortOrder === 'asc' ? leftValue - rightValue : rightValue - leftValue
  })

  return paginateFallbackItems(items, params.page ?? 1, params.page_size ?? 20)
}

export function getFallbackAuthorById(authorId: string): AuthorResponse | null {
  const item = STATIC_AUTHOR_DETAILS[authorId]
  return item ? clonePublicSnapshot(item) : null
}

export function getFallbackAuthorPosts(
  authorId: string,
  page = 1,
  pageSize = 20
): PaginatedApiResponse<PostListItem> {
  const items = clonePublicSnapshot(STATIC_AUTHOR_POSTS[authorId] ?? [])
  return paginateFallbackItems(items, page, pageSize)
}
