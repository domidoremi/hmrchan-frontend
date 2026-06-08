import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadHomeAggregate, normalizeHomeDeepLink } from '@/api/homeService'

const mockGet = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  apiClient: {
    get: mockGet,
  },
}))

const POST_ID = '018f6d22-3cc7-7a1d-a456-4d2c59b6f4f1'

describe('homeService', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it('uses the home aggregate facade endpoint', async () => {
    const aggregate = {
      featured: [{ id: POST_ID }],
      highlights: [],
      story_deck: [],
    }
    mockGet.mockResolvedValue(aggregate)

    await expect(loadHomeAggregate()).resolves.toBe(aggregate)

    expect(mockGet).toHaveBeenCalledWith('/home')
  })

  it('normalizes UUIDv7 post deep links to the public post route', () => {
    expect(normalizeHomeDeepLink(`/post/${POST_ID}`)).toBe(`/posts/${POST_ID}`)
  })

  it('rejects non-contract post deep links to the safe home route', () => {
    expect(normalizeHomeDeepLink('/post/not-a-v7-id')).toBe('/')
    expect(normalizeHomeDeepLink('/post/018f6d22-3cc7-4a1d-a456-4d2c59b6f4f1')).toBe('/')
  })

  it('keeps non-post deep links unchanged', () => {
    expect(normalizeHomeDeepLink('/community')).toBe('/community')
    expect(normalizeHomeDeepLink('https://example.com/hmrchan')).toBe('https://example.com/hmrchan')
  })
})
