import { beforeEach, describe, expect, it, vi } from 'vitest'

const clientMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('../client', () => ({
  apiClient: {
    get: clientMocks.get,
    post: clientMocks.post,
    delete: clientMocks.delete,
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
        limit: 12,
        cursor: 'cursor-0',
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith('/posts?limit=12&cursor=cursor-0', {
      skipErrorToast: true,
    })
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

    await expect(postService.listPosts({ limit: 10 })).resolves.toMatchObject({
      items: [{ id: 'post-1' }],
      next_cursor: 'cursor-2',
      has_more: true,
    })
  })

  it('calls the post like and unlike endpoints with request config', async () => {
    vi.mocked(clientMocks.post).mockResolvedValueOnce(undefined)
    vi.mocked(clientMocks.delete).mockResolvedValueOnce(undefined)
    const config = { skipErrorToast: true }

    await postService.likePost('post-1', config)
    await postService.unlikePost('post-1', config)

    expect(clientMocks.post).toHaveBeenCalledWith('/posts/post-1/like', null, config)
    expect(clientMocks.delete).toHaveBeenCalledWith('/posts/post-1/like', config)
  })
})
