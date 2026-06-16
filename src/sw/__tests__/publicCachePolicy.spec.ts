import { describe, expect, it } from 'vitest'

import {
  cacheLimitForName,
  cacheNameForRequest,
  isPublicCacheableRequest,
  isPublicCacheableResponse,
  PUBLIC_API_CACHE_LIMIT,
  PUBLIC_API_CACHE_NAME,
  PUBLIC_MEDIA_CACHE_LIMIT,
  PUBLIC_MEDIA_CACHE_NAME,
} from '@/sw/publicCachePolicy'

describe('public cache service worker policy', () => {
  it('allows public content API GET requests without credentials', () => {
    const request = new Request('https://next.momichan.com/api/v1/posts/abc/comments', {
      credentials: 'omit',
    })

    expect(isPublicCacheableRequest(request)).toBe(true)
    expect(cacheNameForRequest(request)).toBe(PUBLIC_API_CACHE_NAME)
  })

  it('allows public discussion detail and comment API GET requests without credentials', () => {
    const detailRequest = new Request(
      'https://next.momichan.com/api/v1/discussions/018f6d22-3cc7-7a1d-a456-4d2c59b6f4f0',
      { credentials: 'omit' }
    )
    const commentsRequest = new Request(
      'https://next.momichan.com/api/v1/discussions/018f6d22-3cc7-7a1d-a456-4d2c59b6f4f0/comments',
      { credentials: 'omit' }
    )

    expect(isPublicCacheableRequest(detailRequest)).toBe(true)
    expect(cacheNameForRequest(detailRequest)).toBe(PUBLIC_API_CACHE_NAME)
    expect(isPublicCacheableRequest(commentsRequest)).toBe(true)
    expect(cacheNameForRequest(commentsRequest)).toBe(PUBLIC_API_CACHE_NAME)
  })

  it('rejects auth, private, cookie, and authorization requests', () => {
    expect(
      isPublicCacheableRequest(
        new Request('https://next.momichan.com/api/v1/auth/me', { credentials: 'omit' })
      )
    ).toBe(false)
    expect(
      isPublicCacheableRequest(
        new Request('https://next.momichan.com/api/v1/posts', {
          headers: { authorization: 'Bearer token' },
          credentials: 'omit',
        })
      )
    ).toBe(false)
    expect(
      isPublicCacheableRequest(
        new Request('https://next.momichan.com/api/v1/posts', {
          headers: { cookie: 'sid=1' },
          credentials: 'omit',
        })
      )
    ).toBe(false)
  })

  it('rejects non-GET, no-store, and credentialed public API requests', () => {
    expect(
      isPublicCacheableRequest(
        new Request('https://next.momichan.com/api/v1/posts', {
          credentials: 'omit',
          method: 'POST',
        })
      )
    ).toBe(false)
    expect(
      isPublicCacheableRequest(
        new Request('https://next.momichan.com/api/v1/posts', {
          cache: 'no-store',
          credentials: 'omit',
        })
      )
    ).toBe(false)
    expect(isPublicCacheableRequest(new Request('https://next.momichan.com/api/v1/posts'))).toBe(
      false
    )
  })

  it('routes public media to the media cache', () => {
    const request = new Request(
      'https://next.momichan.com/hmrchan/pets/tidyfox/v1/spritesheet.webp'
    )

    expect(isPublicCacheableRequest(request)).toBe(true)
    expect(cacheNameForRequest(request)).toBe(PUBLIC_MEDIA_CACHE_NAME)
  })

  it('routes generated public media thumbnails to the media cache', () => {
    const request = new Request(
      'https://next.momichan.com/api/v1/media/019e6f16-e319-7551-94b9-08e3b49e16b3/thumbnail?size=small',
      { credentials: 'omit' }
    )

    expect(isPublicCacheableRequest(request)).toBe(true)
    expect(cacheNameForRequest(request)).toBe(PUBLIC_MEDIA_CACHE_NAME)
  })

  it('rejects media streams and credentialed media thumbnails', () => {
    expect(
      isPublicCacheableRequest(
        new Request(
          'https://next.momichan.com/api/v1/media/019e6f16-e319-7551-94b9-08e3b49e16b3/stream',
          { credentials: 'omit' }
        )
      )
    ).toBe(false)
    expect(
      isPublicCacheableRequest(
        new Request(
          'https://next.momichan.com/api/v1/media/019e6f16-e319-7551-94b9-08e3b49e16b3/thumbnail?size=small',
          {
            headers: { cookie: 'sid=1' },
            credentials: 'omit',
          }
        )
      )
    ).toBe(false)
  })

  it('rejects non-OK, private, no-store, or Set-Cookie responses', () => {
    expect(isPublicCacheableResponse(new Response('{}', { status: 503 }))).toBe(false)
    expect(
      isPublicCacheableResponse(new Response('{}', { headers: { 'cache-control': 'private' } }))
    ).toBe(false)
    expect(
      isPublicCacheableResponse(new Response('{}', { headers: { 'cache-control': 'no-store' } }))
    ).toBe(false)
    expect(
      isPublicCacheableResponse(new Response('{}', { headers: { 'set-cookie': 'x=1' } }))
    ).toBe(false)
  })

  it('keeps cache limits separated by cache family', () => {
    expect(cacheLimitForName(PUBLIC_API_CACHE_NAME)).toBe(PUBLIC_API_CACHE_LIMIT)
    expect(cacheLimitForName(PUBLIC_MEDIA_CACHE_NAME)).toBe(PUBLIC_MEDIA_CACHE_LIMIT)
  })
})
