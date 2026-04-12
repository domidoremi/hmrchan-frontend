import { beforeEach, describe, expect, it, vi } from 'vitest'

const clientMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('../client', () => ({
  apiClient: {
    get: clientMocks.get,
  },
}))

import { authorService } from '../authorService'

describe('authorService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds cursor-based author list queries', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: 'cursor-2',
      has_more: true,
    })

    await authorService.listAuthors(
      {
        cursor: 'cursor-1',
        limit: 24,
        q: 'momo',
        platform: 'youtube',
        sort_by: 'follower_count',
        sort_order: 'desc',
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith(
      '/authors?limit=24&cursor=cursor-1&q=momo&platform=youtube&sort_by=follower_count&sort_order=desc',
      { skipErrorToast: true }
    )
  })

  it('builds cursor-based author post queries', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: null,
      has_more: false,
    })

    await authorService.listAuthorPosts(
      'author-1',
      {
        cursor: 'post-cursor-1',
        limit: 18,
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith(
      '/authors/author-1/posts?cursor=post-cursor-1&limit=18',
      { skipErrorToast: true }
    )
  })
})
