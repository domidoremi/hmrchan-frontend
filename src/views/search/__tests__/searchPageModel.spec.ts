import { describe, expect, it, vi } from 'vitest'

import type { AuthorListItem, PublicVisibilityScope } from '@/api'
import type { HistoryStats, SearchHistoryItem } from '@/api/historyService'

import {
  buildSearchHistoryFilters,
  buildSearchRecordKey,
  buildTopSearchQueries,
  computeMayHaveMoreResults,
  getAuthorMemo,
  getPostMemo,
  getThumbnailQuality,
  shufflePosts,
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
        total: 12,
        searchVisibility: guestVisibility,
      })
    ).toBe(true)

    expect(
      computeMayHaveMoreResults({
        isAuthenticated: true,
        resultsLength: 10,
        total: 50,
        searchVisibility: guestVisibility,
      })
    ).toBe(false)
  })

  it('builds normalized search history payloads', () => {
    expect(buildSearchRecordKey('  Himeri LIVE  ')).toBe('himeri live')
    expect(buildSearchHistoryFilters('posts', 'view_count', 'asc', 'youtube')).toEqual({
      tab: 'posts',
      sort_by: 'view_count',
      sort_order: 'asc',
      platform: 'youtube',
    })
    expect(buildSearchHistoryFilters('authors', 'relevance', 'desc', 'all')).toEqual({
      tab: 'authors',
      sort_by: 'relevance',
      sort_order: 'desc',
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

  it('keeps shuffled discover posts immutable and chooses thumbnail quality by viewport', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const source = [{ id: '1' }, { id: '2' }, { id: '3' }] as never[]

    const shuffled = shufflePosts(source)

    expect(source.map((item) => item.id)).toEqual(['1', '2', '3'])
    expect(shuffled).toHaveLength(3)
    expect(shuffled.map((item) => item.id)).not.toEqual(source.map((item) => item.id))
    expect(getThumbnailQuality(390)).toBe('medium')
    expect(getThumbnailQuality(1280)).toBe('large')

    randomSpy.mockRestore()
  })
})
