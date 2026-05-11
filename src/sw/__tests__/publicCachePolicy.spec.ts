import { describe, expect, it } from 'vitest'

import {
  cacheNameForRequest,
  isPublicCacheableRequest,
  isPublicCacheableResponse,
  PUBLIC_API_CACHE_NAME,
  PUBLIC_MEDIA_CACHE_NAME,
} from '@/sw/publicCachePolicy'

describe('public cache service worker policy', () => {
  it('allows public content API GET requests without credentials', () => {
    const request = new Request('https://next.momichan.xyz/api/v1/posts/abc/comments', {
      credentials: 'omit',
    })

    expect(isPublicCacheableRequest(request)).toBe(true)
    expect(cacheNameForRequest(request)).toBe(PUBLIC_API_CACHE_NAME)
  })

  it('rejects auth, private, cookie, and authorization requests', () => {
    expect(
      isPublicCacheableRequest(
        new Request('https://next.momichan.xyz/api/v1/auth/me', { credentials: 'omit' })
      )
    ).toBe(false)
    expect(
      isPublicCacheableRequest(
        new Request('https://next.momichan.xyz/api/v1/posts', {
          headers: { authorization: 'Bearer token' },
          credentials: 'omit',
        })
      )
    ).toBe(false)
    expect(
      isPublicCacheableRequest(
        new Request('https://next.momichan.xyz/api/v1/posts', {
          headers: { cookie: 'sid=1' },
          credentials: 'omit',
        })
      )
    ).toBe(false)
  })

  it('routes public media to the media cache', () => {
    const request = new Request(
      'https://next.momichan.xyz/hmrchan/pets/tidyfox/v1/spritesheet.webp'
    )

    expect(isPublicCacheableRequest(request)).toBe(true)
    expect(cacheNameForRequest(request)).toBe(PUBLIC_MEDIA_CACHE_NAME)
  })

  it('rejects private or Set-Cookie responses', () => {
    expect(
      isPublicCacheableResponse(new Response('{}', { headers: { 'cache-control': 'private' } }))
    ).toBe(false)
    expect(
      isPublicCacheableResponse(new Response('{}', { headers: { 'set-cookie': 'x=1' } }))
    ).toBe(false)
  })
})
