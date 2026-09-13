import { describe, expect, it } from 'vitest'
import {
  hasMediaAuthContext,
  isMediaAssetRequest,
  resolveMediaCacheControl,
} from '../../../functions/api/mediaCachePolicy'

describe('mediaCachePolicy', () => {
  it.each([
    { 'Cache-Control': 'private, max-age=60' },
    { 'Cache-Control': 'no-store' },
    { 'Cache-Control': 'no-cache' },
    { 'Set-Cookie': 'preference=example; Secure; HttpOnly' },
  ])('does not override upstream privacy policy %j', (responseHeaders) => {
    expect(
      resolveMediaCacheControl({
        path: '/v1/media/abc/thumbnail',
        method: 'GET',
        requestHeaders: new Headers(),
        responseStatus: 200,
        responseHeaders: new Headers(responseHeaders),
      })
    ).toBe('private, no-store')
  })

  it('does not publicly cache a partial media response', () => {
    expect(
      resolveMediaCacheControl({
        path: '/v1/media/abc/image',
        method: 'GET',
        requestHeaders: new Headers({ Range: 'bytes=0-15' }),
        responseStatus: 206,
      })
    ).toBe('private, no-store')
  })

  it('detects anonymous successful media thumbnail requests as public-cacheable', () => {
    const headers = new Headers()

    expect(isMediaAssetRequest('/v1/media/abc/thumbnail', 'GET')).toBe(true)
    expect(hasMediaAuthContext(headers)).toBe(false)
    expect(
      resolveMediaCacheControl({
        path: '/v1/media/abc/thumbnail',
        method: 'GET',
        requestHeaders: headers,
        responseStatus: 200,
      })
    ).toContain('immutable')
  })

  it('marks media requests with auth context as private and uncacheable', () => {
    const headers = new Headers({
      Cookie: 'refresh_token=abc123',
    })

    expect(hasMediaAuthContext(headers)).toBe(true)
    expect(
      resolveMediaCacheControl({
        path: '/v1/media/abc/image',
        method: 'GET',
        requestHeaders: headers,
        responseStatus: 200,
      })
    ).toBe('private, no-store')
  })

  it.each(['__Host-momi_bff_at=access-token', '__Host-momi_bff_rt=refresh-token'])(
    'treats the BFF cookie %s as authenticated media context',
    (cookie) => {
      const headers = new Headers({ Cookie: cookie })

      expect(hasMediaAuthContext(headers)).toBe(true)
      expect(
        resolveMediaCacheControl({
          path: '/v1/media/abc/thumbnail',
          method: 'GET',
          requestHeaders: headers,
          responseStatus: 200,
        })
      ).toBe('private, no-store')
    }
  )

  it('prevents caching error responses for media thumbnails', () => {
    const headers = new Headers()

    expect(
      resolveMediaCacheControl({
        path: '/v1/media/abc/thumbnail',
        method: 'GET',
        requestHeaders: headers,
        responseStatus: 403,
      })
    ).toBe('private, no-store')
  })
})
