import { beforeEach, describe, expect, it, vi } from 'vitest'

const clientMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('../client', () => ({
  apiClient: {
    get: clientMocks.get,
  },
}))

import { searchService } from '../searchService'

describe('searchService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds cursor-based post search queries', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: 'cursor-2',
      has_more: true,
    })

    await searchService.searchPosts(
      {
        q: 'idol',
        cursor: 'cursor-1',
        page_size: 24,
        platform: 'youtube',
        sort_by: 'published_at',
        sort_order: 'desc',
        thumbnail_quality: 'medium',
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith(
      '/search/posts?q=idol&page_size=24&cursor=cursor-1&platform=youtube&sort_by=published_at&sort_order=desc&thumbnail_quality=medium',
      { skipErrorToast: true }
    )
  })

  it('builds cursor-based author search queries', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: null,
      has_more: false,
    })

    await searchService.searchAuthors(
      {
        q: 'momo',
        cursor: 'author-cursor-1',
        page_size: 12,
        platform: 'twitter',
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith(
      '/search/authors?q=momo&page_size=12&cursor=author-cursor-1&platform=twitter',
      { skipErrorToast: true }
    )
  })
})
