import type { ListPostsParams, PostListItem } from '@/api/postService'
import { STATIC_EXPLORE_POSTS } from './generated/publicSnapshots'
import { clonePublicSnapshot, cursorPaginateFallbackItems } from './publicPageFallback'

export const EXPLORE_FALLBACK_POSTS: PostListItem[] = clonePublicSnapshot(STATIC_EXPLORE_POSTS)

export function getFallbackExplorePosts(
  params: ListPostsParams = {}
): ReturnType<typeof cursorPaginateFallbackItems<PostListItem>> {
  return cursorPaginateFallbackItems(EXPLORE_FALLBACK_POSTS, {
    cursor: params.cursor ?? null,
    limit: params.limit ?? 20,
  })
}

export function getFallbackExplorePostById(postId: string): PostListItem | null {
  return EXPLORE_FALLBACK_POSTS.find((post) => post.id === postId) ?? null
}
