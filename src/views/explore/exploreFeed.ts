import type { ListPostsParams, PostListItem, PostListResponse } from '@/api/postService'

export interface ExploreFeedRequestOptions {
  cursor?: string | null
  pageSize: number
}

export interface ExploreCursorState {
  nextCursor: string | null
  hasMore: boolean
}

export function buildExploreListParams(options: ExploreFeedRequestOptions): ListPostsParams {
  return {
    limit: options.pageSize,
    cursor: options.cursor ?? null,
  }
}

export function extractExploreCursorState(
  response: Pick<PostListResponse, 'next_cursor' | 'has_more'>
): ExploreCursorState {
  const nextCursor = response.next_cursor ?? null
  return {
    nextCursor,
    hasMore: Boolean(response.has_more && nextCursor),
  }
}

export function mergeUniquePostsById(
  existing: PostListItem[],
  incoming: PostListItem[]
): PostListItem[] {
  if (existing.length === 0) {
    return incoming.slice()
  }

  const seen = new Set(existing.map((post) => post.id))
  const merged = existing.slice()

  for (const post of incoming) {
    if (seen.has(post.id)) continue
    seen.add(post.id)
    merged.push(post)
  }

  return merged
}
