import { describe, expect, it } from 'vitest'

import {
  buildExplorePostsEndpoint,
  buildExploreSuggestionsEndpoint,
  MOMICHAN_PLATFORMS,
  normalizePlatformId,
  summarizePlatforms,
} from '@/api/hmrContentPlatforms'
import type { HmrPost } from '@/api/hmrContentTypes'

function makePost(id: string, platform?: string): HmrPost {
  return {
    id,
    title: id,
    excerpt: '',
    authorName: 'Momi',
    tag: 'test',
    createdAt: '2026-05-28T00:00:00.000Z',
    statsLabel: '0',
    platform,
  }
}

describe('hmrContentPlatforms endpoints', () => {
  it('normalizes platform ids for UI and API endpoints', () => {
    expect(normalizePlatformId(' Twitter ')).toBe('x')
    expect(normalizePlatformId(' YouTube ')).toBe('youtube')

    expect(
      buildExplorePostsEndpoint({
        query: ' live cut ',
        platform: 'x',
        cursor: 'cursor-1',
        limit: 24,
      })
    ).toBe('/search/posts?limit=24&cursor=cursor-1&platform=twitter&q=live+cut')
  })

  it('builds browsing and suggestion endpoints with stable query parameters', () => {
    expect(
      buildExplorePostsEndpoint({
        platform: 'youtube',
        sortBy: 'popular',
      })
    ).toBe('/posts?limit=12&platform=youtube&sort_by=popular')
    expect(buildExploreSuggestionsEndpoint('momi live')).toBe('/search/suggestions?q=momi%20live')
  })
})

describe('hmrContentPlatforms summaries', () => {
  it('returns all configured platform rows with normalized counts', () => {
    const summary = summarizePlatforms(
      [makePost('x-post', 'twitter'), makePost('yt-post', 'YouTube'), makePost('misc', 'unknown')],
      'instagram'
    )
    const byId = new Map(summary.map((item) => [item.id, item.count]))

    expect(summary.map((item) => item.id)).toEqual(['all', ...MOMICHAN_PLATFORMS])
    expect(byId.get('all')).toBe(3)
    expect(byId.get('x')).toBe(1)
    expect(byId.get('youtube')).toBe(1)
    expect(byId.get('instagram')).toBe(0)
  })
})
