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

  it('rejects BFF cookie-backed private API domains without relying on Authorization headers', async () => {
    const { isCacheableApiRequest } = await loadRuntime()
    const privatePaths = [
      '/api/v1/2fa/status',
      '/api/v1/account/export-data',
      '/api/v1/audit/my-activity',
      '/api/v1/devices',
      '/api/v1/email/change',
      '/api/v1/history/search',
      '/api/v1/inbox/messages',
      '/api/v1/preferences',
      '/api/v1/relations/followers',
      '/api/v1/reports/my',
      '/api/v1/discussions/my',
      '/api/v1/discussions/my-comments',
      '/api/v1/users/me',
      '/api/v1/users/018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a10/public-profile',
    ]

    for (const path of privatePaths) {
      expect(
        isCacheableApiRequest(
          new URL(`https://example.test${path}`),
          new Request(`https://example.test${path}`)
        )
      ).toBe(false)
    }
  })

  it('defaults unknown API routes to private instead of caching by missing Authorization', async () => {
    const { isCacheableApiRequest } = await loadRuntime()
    const url = new URL('https://example.test/api/v1/future-account-data')

    expect(isCacheableApiRequest(url, new Request(url))).toBe(false)
  })

  it('does not let private API paths bypass the allowlist through media classifiers', async () => {
    const { isAvatarRequest, isMediaRequest } = await loadRuntime()

    expect(isAvatarRequest(new URL('https://example.test/api/v1/profile'))).toBe(false)
    expect(isAvatarRequest(new URL('https://example.test/api/v1/account/avatar'))).toBe(false)
    expect(isMediaRequest(new URL('https://example.test/api/v1/profile/avatar.png'))).toBe(false)
    expect(
      isMediaRequest(
        new URL('https://example.test/api/v1/media/018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a10/thumbnail')
      )
    ).toBe(true)
  })
})
