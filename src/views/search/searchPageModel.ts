import type { AuthorListItem, PostListItem, PublicVisibilityScope } from '@/api'
import type { HistoryStats, SearchHistoryItem } from '@/api/historyService'

export type SearchTabId = 'posts' | 'authors'

export interface SearchQueryCount {
  query: string
  count: number
}

export function buildTopSearchQueries(
  searchStats: HistoryStats | null,
  searchHistory: SearchHistoryItem[]
): SearchQueryCount[] {
  const combined = new Map<string, number>()

  for (const item of searchStats?.top_searches ?? []) {
    combined.set(item.query, item.count)
  }

  for (const item of searchHistory) {
    if (!combined.has(item.query)) {
      combined.set(item.query, 0)
    }
  }

  return Array.from(combined.entries())
    .map(([query, count]) => ({ query, count }))
    .slice(0, 5)
}

export function computeMayHaveMoreResults(options: {
  isAuthenticated: boolean
  resultsLength: number
  hasMore: boolean
  searchVisibility: PublicVisibilityScope
}): boolean {
  const { isAuthenticated, resultsLength, hasMore, searchVisibility } = options

  if (isAuthenticated || resultsLength === 0) return false
  if (hasMore) return true

  const visibleLimit = searchVisibility.limit
  if (searchVisibility.tier === 'guest' && visibleLimit !== null) {
    return resultsLength >= visibleLimit
  }

  return false
}

export function buildSearchRecordKey(query: string): string {
  return query.trim().toLowerCase()
}

export function buildSearchHistoryFilters(activeTab: SearchTabId): Record<string, unknown> {
  return {
    tab: activeTab,
  }
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException
    ? err.name === 'AbortError'
    : err instanceof Error && err.name === 'AbortError'
}

export function getPostMemo(post: PostListItem): (string | number)[] {
  return [
    post.id,
    post.updated_at ?? post.created_at ?? post.published_at ?? '',
    post.view_count ?? 0,
    post.like_count ?? 0,
    post.comment_count ?? 0,
    post.thumbnail_url ?? '',
  ]
}

export function getAuthorMemo(author: AuthorListItem): (string | number | null | undefined)[] {
  return [
    author.id,
    author.updated_at ?? author.created_at ?? '',
    author.post_count ?? 0,
    author.follower_count ?? 0,
    author.avatar_url ?? '',
    author.display_name ?? author.name ?? author.username,
  ]
}
