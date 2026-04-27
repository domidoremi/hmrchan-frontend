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
        limit: 24,
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith('/search/posts?q=idol&limit=24&cursor=cursor-1', {
      skipErrorToast: true,
    })
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
        limit: 12,
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith(
      '/search/authors?q=momo&limit=12&cursor=author-cursor-1',
      { skipErrorToast: true }
    )
  })

  it('requests suggestions with query, optional limit, and request config', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce([])

    await searchService.getSuggestions('idol', { limit: 8, skipErrorToast: true })

    expect(clientMocks.get).toHaveBeenCalledWith('/search/suggestions?q=idol&limit=8', {
      skipErrorToast: true,
    })
  })
})
