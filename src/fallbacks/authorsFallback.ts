import type { AuthorListItem, AuthorResponse, ListAuthorsParams } from '@/api/authorService'
import type { CursorCollectionResponse } from '@/api'
import type { PostListItem } from '@/api/postService'
import {
  STATIC_AUTHORS,
  STATIC_AUTHOR_DETAILS,
  STATIC_AUTHOR_POSTS,
} from './generated/publicSnapshots'
import { clonePublicSnapshot, cursorPaginateFallbackItems } from './publicPageFallback'

export const AUTHORS_FALLBACK_AUTHORS: AuthorListItem[] = clonePublicSnapshot(STATIC_AUTHORS)

export function getFallbackAuthors(
  params: ListAuthorsParams = {}
): CursorCollectionResponse<AuthorListItem> {
  return cursorPaginateFallbackItems(AUTHORS_FALLBACK_AUTHORS, {
    cursor: params.cursor ?? null,
    limit: params.limit ?? 20,
  })
}

export function getFallbackAuthorById(authorId: string): AuthorResponse | null {
  const item = STATIC_AUTHOR_DETAILS[authorId]
  return item ? clonePublicSnapshot(item) : null
}

export function getFallbackAuthorPosts(
  authorId: string,
  options: {
    cursor?: string | null
    limit?: number
  } = {}
): CursorCollectionResponse<PostListItem> {
  const items = clonePublicSnapshot(STATIC_AUTHOR_POSTS[authorId] ?? [])
  return cursorPaginateFallbackItems(items, {
    cursor: options.cursor ?? null,
    limit: options.limit ?? 20,
  })
}
