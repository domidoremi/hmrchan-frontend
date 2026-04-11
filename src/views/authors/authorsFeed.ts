import type { CursorCollectionResponse } from '@/api'
import type { AuthorListItem, ListAuthorsParams } from '@/api/authorService'

export interface AuthorsCursorState {
  nextCursor: string | null
  hasMore: boolean
}

export function buildAuthorsListParams(options: {
  cursor?: string | null
  pageSize: number
}): ListAuthorsParams {
  return {
    cursor: options.cursor ?? null,
    page_size: options.pageSize,
  }
}

export function extractAuthorsCursorState(
  response: Pick<CursorCollectionResponse<AuthorListItem>, 'next_cursor' | 'has_more'>
): AuthorsCursorState {
  const nextCursor = response.next_cursor ?? null
  return {
    nextCursor,
    hasMore: Boolean(response.has_more && nextCursor),
  }
}

export function mergeUniqueAuthorsById(
  existing: AuthorListItem[],
  incoming: AuthorListItem[]
): AuthorListItem[] {
  if (existing.length === 0) {
    return incoming.slice()
  }

  const seen = new Set(existing.map((author) => author.id))
  const merged = existing.slice()

  for (const author of incoming) {
    if (seen.has(author.id)) continue
    seen.add(author.id)
    merged.push(author)
  }

  return merged
}
