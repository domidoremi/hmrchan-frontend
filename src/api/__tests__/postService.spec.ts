import { beforeEach, describe, expect, it, vi } from 'vitest'

const clientMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('../client', () => ({
  apiClient: {
    get: clientMocks.get,
  },
  ApiError: class extends Error {
    status: number

    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

import { postService } from '../postService'

describe('postService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds cursor-based post list queries for explore feed loading', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: 'cursor-1',
      has_more: true,
    })

    await postService.listPosts(
      {
        page_size: 12,
        cursor: 'cursor-0',
        sort_by: 'published_at',
        sort_order: 'desc',
        platform: 'youtube',
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith(
      '/posts?page_size=12&cursor=cursor-0&platform=youtube&sort_by=published_at&sort_order=desc',
      { skipErrorToast: true }
    )
  })

  it('preserves cursor pagination fields from the normalized post list response', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [
        {
          id: 'post-1',
          platform: 'youtube',
          view_count: 0,
          like_count: 0,
          comment_count: 0,
          media_count: 0,
        },
      ],
      next_cursor: 'cursor-2',
      has_more: true,
    })

    await expect(postService.listPosts({ page_size: 10 })).resolves.toMatchObject({
      items: [{ id: 'post-1' }],
      next_cursor: 'cursor-2',
      has_more: true,
    })
  })
})
