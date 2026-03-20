import { describe, expect, it } from 'vitest'

import { discoverAuditTargets } from '../../../scripts/lib/lighthouse-prod-discovery.mjs'

function createTextResponse(body: string) {
  return {
    ok: true,
    status: 200,
    text: async () => body,
  }
}

function createJsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  }
}

describe('discoverAuditTargets', () => {
  it('combines sitemap, whitelist, api samples, and exclusion rules into a manifest', async () => {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset>
        <url><loc>https://momichan.xyz/</loc></url>
        <url><loc>https://momichan.xyz/explore</loc></url>
        <url><loc>https://momichan.xyz/authors</loc></url>
        <url><loc>https://momichan.xyz/favorites</loc></url>
      </urlset>`

    const robots = `
      User-agent: *
      Allow: /
      Disallow: /api/
      Disallow: /favorites
      Disallow: /login
      Disallow: /register
      Disallow: /forgot-password
      Disallow: /reset-password
      Disallow: /verify-email
    `

    const fetchImpl = async (url: string) => {
      if (url.endsWith('/sitemap.xml')) return createTextResponse(sitemap)
      if (url.endsWith('/robots.txt')) return createTextResponse(robots)
      if (url.includes('/api/v1/authors')) {
        return createJsonResponse({ items: [{ id: 'author-1' }, { id: 'author-2' }] })
      }
      if (url.includes('/api/v1/posts')) {
        return createJsonResponse({
          items: [{ id: 'post-1' }, { id: 'post-2' }, { id: 'post-3' }],
        })
      }
      if (url.includes('/api/v1/discussions')) {
        return createJsonResponse({ items: [{ id: 'discussion-1' }] })
      }
      if (url.includes('/api/v1/schedules')) {
        return createJsonResponse({ items: [{ id: 'schedule-1' }] })
      }

      throw new Error(`Unexpected URL: ${url}`)
    }

    const manifest = await discoverAuditTargets({
      base: 'https://momichan.xyz',
      fallbackEntries: [],
      fetchImpl: fetchImpl as typeof fetch,
    })

    expect(manifest.entries).toHaveLength(20)
    expect(manifest.entries.map((entry) => entry.url)).not.toContain(
      'https://momichan.xyz/favorites'
    )
    expect(manifest.excluded).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: 'https://momichan.xyz/favorites',
        }),
      ])
    )

    const home = manifest.entries.find((entry) => entry.url === 'https://momichan.xyz/')
    expect(home).toMatchObject({
      pageType: 'home',
      discoverySource: 'sitemap',
      indexedInSitemap: true,
    })

    const login = manifest.entries.find((entry) => entry.url === 'https://momichan.xyz/login')
    expect(login).toMatchObject({
      pageType: 'anonymous-auth',
      discoverySource: 'route-whitelist',
      robotsDisallowed: true,
    })

    expect(
      manifest.entries
        .filter((entry) => entry.pageType === 'author-detail')
        .map((entry) => entry.url)
    ).toEqual(['https://momichan.xyz/author/author-1', 'https://momichan.xyz/author/author-2'])
    expect(
      manifest.entries.filter((entry) => entry.pageType === 'post-detail').map((entry) => entry.url)
    ).toEqual([
      'https://momichan.xyz/post/post-1',
      'https://momichan.xyz/post/post-2',
      'https://momichan.xyz/post/post-3',
    ])
    expect(
      manifest.entries
        .filter((entry) => entry.pageType === 'discussion-detail')
        .map((entry) => entry.url)
    ).toEqual(['https://momichan.xyz/community/discussions/discussion-1'])
    expect(
      manifest.entries
        .filter((entry) => entry.pageType === 'schedule-detail')
        .map((entry) => entry.url)
    ).toEqual(['https://momichan.xyz/schedule/schedule-1'])

    expect(manifest.coverage.gaps).toEqual([])
  })

  it('uses fallback entries when live detail discovery cannot satisfy quotas', async () => {
    const fetchImpl = async (url: string) => {
      if (url.endsWith('/sitemap.xml')) return createTextResponse('<urlset></urlset>')
      if (url.endsWith('/robots.txt')) return createTextResponse('User-agent: *\nAllow: /')
      if (url.includes('/api/v1/authors')) return createJsonResponse({ items: [] })
      if (url.includes('/api/v1/posts')) return createJsonResponse({ items: [{ id: 'post-1' }] })
      if (url.includes('/api/v1/discussions')) return createJsonResponse({ items: [] })
      if (url.includes('/api/v1/schedules')) return createJsonResponse({ items: [] })
      throw new Error(`Unexpected URL: ${url}`)
    }

    const manifest = await discoverAuditTargets({
      base: 'https://momichan.xyz',
      fetchImpl: fetchImpl as typeof fetch,
      fallbackEntries: [
        { url: 'https://momichan.xyz/author/fallback-author-a' },
        { url: 'https://momichan.xyz/author/fallback-author-b' },
        { url: 'https://momichan.xyz/community/discussions/fallback-discussion' },
      ],
    })

    expect(
      manifest.entries
        .filter((entry) => entry.pageType === 'author-detail')
        .map((entry) => entry.url)
    ).toEqual([
      'https://momichan.xyz/author/fallback-author-a',
      'https://momichan.xyz/author/fallback-author-b',
    ])

    expect(
      manifest.entries
        .filter((entry) => entry.pageType === 'discussion-detail')
        .map((entry) => entry.url)
    ).toEqual(['https://momichan.xyz/community/discussions/fallback-discussion'])

    expect(manifest.coverage.gaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pageType: 'schedule-detail', missing: 1 }),
        expect.objectContaining({ pageType: 'post-detail', missing: 2 }),
      ])
    )
  })
})
