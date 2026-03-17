import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { onRequest } from '../../../functions/_middleware'

class PassthroughHTMLRewriter {
  on() {
    return this
  }

  transform(response: Response) {
    return response
  }
}

describe('Cloudflare HTML middleware', () => {
  beforeEach(() => {
    vi.stubGlobal('HTMLRewriter', PassthroughHTMLRewriter)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('preserves non-html responses without injecting html headers', async () => {
    const response = await onRequest({
      request: new Request('https://momichan.xyz/api/health'),
      next: () =>
        Promise.resolve(
          new Response('{"ok":true}', {
            headers: { 'content-type': 'application/json' },
            status: 200,
          })
        ),
    } as never)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-security-policy')).toBeNull()
    expect(await response.text()).toBe('{"ok":true}')
  })

  it('returns real 404 status and security headers for unknown html routes', async () => {
    const response = await onRequest({
      request: new Request('https://momichan.xyz/this-route-does-not-exist'),
      next: () =>
        Promise.resolve(
          new Response('<!doctype html><html><head><title>App</title></head><body></body></html>', {
            headers: { 'content-type': 'text/html; charset=utf-8' },
            status: 200,
          })
        ),
    } as never)

    expect(response.status).toBe(404)
    expect(response.statusText).toBe('Not Found')
    expect(response.headers.get('content-security-policy')).toContain("script-src 'self'")
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('strict-transport-security')).toContain('max-age=')
  })

  it('returns 404 for missing upstream post detail pages', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: { code: 'NOT_FOUND' } }), { status: 404 })
      )
    vi.stubGlobal('fetch', fetchMock)

    const response = await onRequest({
      request: new Request('https://momichan.xyz/post/00000000-0000-4000-8000-000000000000'),
      env: {
        API_BASE_URL: 'https://api.momichan.xyz',
      },
      next: () =>
        Promise.resolve(
          new Response('<!doctype html><html><head><title>App</title></head><body></body></html>', {
            headers: { 'content-type': 'text/html; charset=utf-8' },
            status: 200,
          })
        ),
    } as never)

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(response.status).toBe(404)
    expect(response.statusText).toBe('Not Found')
  })
})
