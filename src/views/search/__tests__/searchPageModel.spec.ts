import { describe, expect, it } from 'vitest'

import type { AuthorListItem, PublicVisibilityScope } from '@/api'
import type { HistoryStats, SearchHistoryItem } from '@/api/historyService'

import {
  buildSearchHistoryFilters,
  buildSearchRecordKey,
  buildTopSearchQueries,
  computeMayHaveMoreResults,
  getAuthorMemo,
  getPostMemo,
} from '../searchPageModel'

describe('searchPageModel', () => {
  it('deduplicates and truncates top search queries', () => {
    const stats = {
      top_searches: [
        { query: 'himeri', count: 4 },
        { query: 'live', count: 2 },
      ],
    } as HistoryStats
    const history = [
      { id: '1', query: 'live', created_at: '2026-03-20T00:00:00Z' },
      { id: '2', query: 'editorial', created_at: '2026-03-19T00:00:00Z' },
      { id: '3', query: 'design', created_at: '2026-03-18T00:00:00Z' },
      { id: '4', query: 'motion', created_at: '2026-03-17T00:00:00Z' },
      { id: '5', query: 'archive', created_at: '2026-03-16T00:00:00Z' },
      { id: '6', query: 'extra', created_at: '2026-03-15T00:00:00Z' },
    ] as SearchHistoryItem[]

    expect(buildTopSearchQueries(stats, history)).toEqual([
      { query: 'himeri', count: 4 },
      { query: 'live', count: 2 },
      { query: 'editorial', count: 0 },
      { query: 'design', count: 0 },
      { query: 'motion', count: 0 },
    ])
  })

  it('computes guest visibility hints from the shared visibility scope', () => {
    const guestVisibility = {
      tier: 'guest',
      limit: 12,
      requires_auth: false,
    } as PublicVisibilityScope

    expect(
      computeMayHaveMoreResults({
        isAuthenticated: false,
        resultsLength: 10,
        hasMore: true,
        searchVisibility: guestVisibility,
      })
    ).toBe(true)

    expect(
      computeMayHaveMoreResults({
        isAuthenticated: true,
        resultsLength: 10,
        hasMore: true,
        searchVisibility: guestVisibility,
      })
    ).toBe(false)
  })

  it('builds normalized search history payloads', () => {
    expect(buildSearchRecordKey('  Himeri LIVE  ')).toBe('himeri live')
    expect(buildSearchHistoryFilters('posts')).toEqual({
      tab: 'posts',
    })
    expect(buildSearchHistoryFilters('authors')).toEqual({
      tab: 'authors',
    })
  })

  it('derives stable memo keys for posts and authors', () => {
    expect(
      getPostMemo({
        id: 'post-1',
        published_at: '2026-03-20T00:00:00Z',
        view_count: 12,
        like_count: 3,
        comment_count: 1,
        thumbnail_url: 'thumb.webp',
      } as never)
    ).toEqual(['post-1', '2026-03-20T00:00:00Z', 12, 3, 1, 'thumb.webp'])

    expect(
      getAuthorMemo({
        id: 'author-1',
        name: 'Momi',
        username: 'momi',
        display_name: 'Momi Chan',
        avatar_url: 'avatar.webp',
        post_count: 8,
        follower_count: 99,
        created_at: '2026-03-01T00:00:00Z',
      } as AuthorListItem)
    ).toEqual(['author-1', '2026-03-01T00:00:00Z', 8, 99, 'avatar.webp', 'Momi Chan'])
  })
})
