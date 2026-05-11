import { beforeEach, describe, expect, it, vi } from 'vitest'

async function loadRuntime() {
  vi.resetModules()
  return import('../runtime')
}

describe('service worker runtime cache policy', () => {
  beforeEach(() => {
    vi.stubGlobal('__SW_CACHE_VERSION__', 'test-v1')
  })

  it('rejects opaque, no-store, private, Set-Cookie, and failed responses', async () => {
    const { isCacheableResponse } = await loadRuntime()

    expect(isCacheableResponse(new Response('ok'))).toBe(true)
    expect(isCacheableResponse(new Response('no', { status: 500 }))).toBe(false)
    expect(
      isCacheableResponse(new Response('private', { headers: { 'Cache-Control': 'private' } }))
    ).toBe(false)
    expect(
      isCacheableResponse(new Response('no-store', { headers: { 'Cache-Control': 'no-store' } }))
    ).toBe(false)
    expect(
      isCacheableResponse(new Response('cookie', { headers: { 'Set-Cookie': 'sid=1' } }))
    ).toBe(false)
  })

  it('allows anonymous public API requests and rejects authenticated private API requests', async () => {
    const { isCacheableApiRequest } = await loadRuntime()

    expect(
      isCacheableApiRequest(
        new URL('https://example.test/api/v1/posts'),
        new Request('https://example.test/api/v1/posts')
      )
    ).toBe(true)
    expect(
      isCacheableApiRequest(
        new URL('https://example.test/api/v1/profile'),
        new Request('https://example.test/api/v1/profile')
      )
    ).toBe(false)
    expect(
      isCacheableApiRequest(
        new URL('https://example.test/api/v1/notifications'),
        new Request('https://example.test/api/v1/notifications')
      )
    ).toBe(false)
    expect(
      isCacheableApiRequest(
        new URL('https://example.test/api/v1/profile'),
        new Request('https://example.test/api/v1/profile', {
          headers: { Authorization: 'Bearer test' },
        })
      )
    ).toBe(false)
    expect(
      isCacheableApiRequest(
        new URL('https://example.test/api/v1/posts/018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a10'),
        new Request('https://example.test/api/v1/posts/018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a10', {
          headers: { Authorization: 'Bearer test' },
        })
      )
    ).toBe(true)
  })
})
