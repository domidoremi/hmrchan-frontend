import { describe, expect, it } from 'vitest'

import { hasMediaAuthContext, resolveMediaCacheControl } from '../mediaCachePolicy'

describe('media cache policy', () => {
  it.each([
    ['Authorization', { Authorization: 'Bearer access-token' }],
    ['legacy refresh token', { Cookie: 'refresh_token=legacy-refresh' }],
    ['BFF access cookie', { Cookie: '__Host-momi_bff_at=access-token' }],
    ['BFF refresh cookie', { Cookie: '__Host-momi_bff_rt=refresh-token' }],
  ])('treats %s as media auth context', (_label, headersInit) => {
    expect(hasMediaAuthContext(new Headers(headersInit))).toBe(true)
  })

  it('uses private no-store for authenticated media thumbnail responses', () => {
    expect(
      resolveMediaCacheControl({
        path: 'v1/media/media-id/thumbnail',
        method: 'GET',
        requestHeaders: new Headers({
          Cookie: '__Host-momi_bff_at=access-token',
        }),
        responseStatus: 200,
      })
    ).toBe('private, no-store')
  })
})
