import { describe, expect, it } from 'vitest'

import {
  buildExploreListParams,
  extractExploreCursorState,
  mergeUniquePostsById,
} from '../exploreFeed'

describe('exploreFeed helpers', () => {
  it('builds cursor-based request params without page-based pagination state', () => {
    expect(
      buildExploreListParams({
        cursor: 'cursor-1',
        pageSize: 12,
        sortBy: 'published_at',
        sortOrder: 'desc',
        platform: 'youtube',
        thumbnailQuality: 'medium',
      })
    ).toEqual({
      cursor: 'cursor-1',
      page_size: 12,
      sort_by: 'published_at',
      sort_order: 'desc',
      platform: 'youtube',
      thumbnail_quality: 'medium',
    })
  })

  it('derives hasMore from cursor pagination contract', () => {
    expect(extractExploreCursorState({ next_cursor: 'cursor-2', has_more: true })).toEqual({
      nextCursor: 'cursor-2',
      hasMore: true,
    })

    expect(extractExploreCursorState({ next_cursor: null, has_more: true })).toEqual({
      nextCursor: null,
      hasMore: false,
    })
  })

  it('deduplicates posts by id when appending new pages', () => {
    const existing = [
      {
        id: 'post-1',
        platform: 'youtube',
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        media_count: 0,
      },
      {
        id: 'post-2',
        platform: 'youtube',
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        media_count: 0,
      },
    ]
    const incoming = [
      {
        id: 'post-2',
        platform: 'youtube',
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        media_count: 0,
      },
      {
        id: 'post-3',
        platform: 'tiktok',
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        media_count: 0,
      },
    ]

    expect(mergeUniquePostsById(existing, incoming).map((post) => post.id)).toEqual([
      'post-1',
      'post-2',
      'post-3',
    ])
  })
})
