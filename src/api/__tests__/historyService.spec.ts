import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearPostHistory, listBrowsingHistory, recordPostView } from '@/api/historyService'

const mockGet = vi.hoisted(() => vi.fn())
const mockPost = vi.hoisted(() => vi.fn())
const mockDelete = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  apiClient: {
    delete: mockDelete,
    get: mockGet,
    post: mockPost,
  },
}))

const POST_ID = '018f6d22-3cc7-7a1d-a456-4d2c59b6f4f1'

describe('historyService', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
    mockDelete.mockReset()
  })

  it('uses authenticated browsing history facade endpoints', async () => {
    mockGet.mockResolvedValue({})
    mockPost.mockResolvedValue({})
    mockDelete.mockResolvedValue({})

    await listBrowsingHistory()
    await recordPostView(POST_ID)
    await clearPostHistory(POST_ID)

    expect(mockGet).toHaveBeenCalledWith('/history/browsing')
    expect(mockPost).toHaveBeenCalledWith('/history/browsing', {
      public_post_id: POST_ID,
    })
    expect(mockDelete).toHaveBeenCalledWith(`/history/browsing/${POST_ID}`)
  })

  it('rejects non-UUIDv7 post identifiers before calling the facade', () => {
    expect(() => recordPostView('not-a-v7-id')).toThrow('post id')
    expect(() => clearPostHistory('not-a-v7-id')).toThrow('post id')

    expect(mockPost).not.toHaveBeenCalled()
    expect(mockDelete).not.toHaveBeenCalled()
  })
})
