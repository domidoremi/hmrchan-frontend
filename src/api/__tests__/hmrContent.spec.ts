import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockApiGet = vi.hoisted(() => vi.fn())

const MockApiError = vi.hoisted(() => {
  return class MockApiError extends Error {
    readonly status: number
    readonly code?: string
    readonly details?: unknown

    constructor(message: string, status: number, code?: string, details?: unknown) {
      super(message)
      this.name = 'ApiError'
      this.status = status
      this.code = code
      this.details = details
    }
  }
})

vi.mock('@/api/client', () => ({
  ApiError: MockApiError,
  apiClient: {
    get: mockApiGet,
  },
}))

vi.mock('@/api/runtimeFlags', () => ({
  shouldUseApiFallback: () => false,
}))

describe('hmrContent post detail loading', () => {
  beforeEach(() => {
    mockApiGet.mockReset()
  })

  it('fetches non-UUID post ids from the API instead of returning a local not-found state', async () => {
    mockApiGet
      .mockResolvedValueOnce({
        post: {
          id: 'youtube-live-cut',
          title: 'YouTube live cut',
          text: 'Clip summary',
          platform: 'youtube',
        },
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 'comment-1',
            title: 'First response',
            body: 'Looks good',
          },
        ],
      })

    const { loadPostDetailContentResource } = await import('../hmrContent')
    const resource = await loadPostDetailContentResource('youtube-live-cut')

    expect(mockApiGet).toHaveBeenNthCalledWith(1, '/posts/youtube-live-cut', { skipAuth: true })
    expect(mockApiGet).toHaveBeenNthCalledWith(2, '/posts/youtube-live-cut/comments', {
      skipAuth: true,
    })
    expect(resource.source).toBe('api')
    expect(resource.error).toBeNull()
    expect(resource.paths).toEqual(['/posts/youtube-live-cut', '/posts/youtube-live-cut/comments'])
    expect(resource.data.post.id).toBe('youtube-live-cut')
    expect(resource.data.comments).toHaveLength(1)
  })
})
