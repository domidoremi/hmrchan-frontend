import { describe, expect, it } from 'vitest'

import {
  buildAuthorsListParams,
  extractAuthorsCursorState,
  mergeUniqueAuthorsById,
} from '../authorsFeed'

describe('authorsFeed helpers', () => {
  it('builds cursor-based author list params', () => {
    expect(
      buildAuthorsListParams({
        cursor: 'cursor-1',
        pageSize: 24,
      })
    ).toEqual({
      cursor: 'cursor-1',
      limit: 24,
    })
  })

  it('derives authors cursor state from the backend contract', () => {
    expect(extractAuthorsCursorState({ next_cursor: 'cursor-2', has_more: true })).toEqual({
      nextCursor: 'cursor-2',
      hasMore: true,
    })

    expect(extractAuthorsCursorState({ next_cursor: null, has_more: true })).toEqual({
      nextCursor: null,
      hasMore: false,
    })
  })

  it('deduplicates appended authors by id', () => {
    const existing = [
      { id: 'author-1', platform: 'youtube', username: 'a1', is_verified: false },
      { id: 'author-2', platform: 'youtube', username: 'a2', is_verified: false },
    ]
    const incoming = [
      { id: 'author-2', platform: 'youtube', username: 'a2', is_verified: false },
      { id: 'author-3', platform: 'tiktok', username: 'a3', is_verified: true },
    ]

    expect(mergeUniqueAuthorsById(existing, incoming).map((author) => author.id)).toEqual([
      'author-1',
      'author-2',
      'author-3',
    ])
  })
})
