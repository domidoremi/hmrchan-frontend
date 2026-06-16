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

function createStatusResponse(status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => '',
    json: async () => ({}),
  }
}

describe('discoverAuditTargets', () => {
  it('combines sitemap, whitelist, api samples, and exclusion rules into a manifest', async () => {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset>
        <url><loc>https://momichan.com/</loc></url>
        <url><loc>https://momichan.com/explore</loc></url>
        <url><loc>https://momichan.com/authors</loc></url>
        <url><loc>https://momichan.com/favorites</loc></url>
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

    const liveDetailPattern =
      /\/api\/v1\/(?:authors|posts|discussions|schedules)\/(?:author-\d+|post-\d+|discussion-\d+|schedule-\d+)$/
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
      if (liveDetailPattern.test(url)) return createJsonResponse({ id: url.split('/').pop() })

      throw new Error(`Unexpected URL: ${url}`)
    }

    const manifest = await discoverAuditTargets({
      base: 'https://momichan.com',
      fallbackEntries: [],
      fetchImpl: fetchImpl as typeof fetch,
    })

    expect(manifest.entries).toHaveLength(20)
    expect(manifest.entries.map((entry) => entry.url)).not.toContain(
      'https://momichan.com/favorites'
    )
    expect(manifest.excluded).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: 'https://momichan.com/favorites',
        }),
      ])
    )

    const home = manifest.entries.find((entry) => entry.url === 'https://momichan.com/')
    expect(home).toMatchObject({
      pageType: 'home',
      discoverySource: 'sitemap',
      indexedInSitemap: true,
    })

    const login = manifest.entries.find((entry) => entry.url === 'https://momichan.com/login')
    expect(login).toMatchObject({
      pageType: 'anonymous-auth',
      discoverySource: 'route-whitelist',
      robotsDisallowed: true,
    })

    expect(
      manifest.entries
        .filter((entry) => entry.pageType === 'author-detail')
        .map((entry) => entry.url)
    ).toEqual(['https://momichan.com/author/author-1', 'https://momichan.com/author/author-2'])
    expect(
      manifest.entries.filter((entry) => entry.pageType === 'post-detail').map((entry) => entry.url)
    ).toEqual([
      'https://momichan.com/post/post-1',
      'https://momichan.com/post/post-2',
      'https://momichan.com/post/post-3',
    ])
    expect(
      manifest.entries
        .filter((entry) => entry.pageType === 'discussion-detail')
        .map((entry) => entry.url)
    ).toEqual(['https://momichan.com/community/discussions/discussion-1'])
    expect(
      manifest.entries
        .filter((entry) => entry.pageType === 'schedule-detail')
        .map((entry) => entry.url)
    ).toEqual(['https://momichan.com/schedule/schedule-1'])

    expect(manifest.coverage.gaps).toEqual([])
  })

  it('uses fallback entries when live detail discovery cannot satisfy quotas', async () => {
    const fetchImpl = async (url: string, init?: RequestInit) => {
      if (url.endsWith('/sitemap.xml')) return createTextResponse('<urlset></urlset>')
      if (url.endsWith('/robots.txt')) return createTextResponse('User-agent: *\nAllow: /')
      if (url.includes('/api/v1/authors')) return createJsonResponse({ items: [] })
      if (url.endsWith('/api/v1/posts/post-1')) return createJsonResponse({ id: 'post-1' })
      if (url.includes('/api/v1/posts')) return createJsonResponse({ items: [{ id: 'post-1' }] })
      if (url.includes('/api/v1/discussions')) return createJsonResponse({ items: [] })
      if (url.includes('/api/v1/schedules')) return createJsonResponse({ items: [] })
      if (url.endsWith('/api/v1/authors/fallback-author-a')) {
        return createJsonResponse({ id: 'fallback-author-a' })
      }
      if (url.endsWith('/api/v1/authors/fallback-author-b')) {
        return createJsonResponse({ id: 'fallback-author-b' })
      }
      if (url.endsWith('/api/v1/discussions/fallback-discussion')) {
        return createJsonResponse({ id: 'fallback-discussion' })
      }
      if (init?.method === 'HEAD') {
        return createStatusResponse(200)
      }
      throw new Error(`Unexpected URL: ${url}`)
    }

    const manifest = await discoverAuditTargets({
      base: 'https://momichan.com',
      fetchImpl: fetchImpl as typeof fetch,
      fallbackEntries: [
        { url: 'https://momichan.com/author/fallback-author-a' },
        { url: 'https://momichan.com/author/fallback-author-b' },
        { url: 'https://momichan.com/community/discussions/fallback-discussion' },
      ],
    })

    expect(
      manifest.entries
        .filter((entry) => entry.pageType === 'author-detail')
        .map((entry) => entry.url)
    ).toEqual([
      'https://momichan.com/author/fallback-author-a',
      'https://momichan.com/author/fallback-author-b',
    ])

    expect(
      manifest.entries
        .filter((entry) => entry.pageType === 'discussion-detail')
        .map((entry) => entry.url)
    ).toEqual(['https://momichan.com/community/discussions/fallback-discussion'])

    expect(manifest.coverage.gaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pageType: 'schedule-detail', missing: 1 }),
        expect.objectContaining({ pageType: 'post-detail', missing: 2 }),
      ])
    )
    expect(manifest.coverage.rejectedFallbacks).toEqual([])
  })

  it('rejects unreachable fallback detail URLs before they enter the manifest', async () => {
    const fetchImpl = async (url: string, init?: RequestInit) => {
      if (url.endsWith('/sitemap.xml')) return createTextResponse('<urlset></urlset>')
      if (url.endsWith('/robots.txt')) return createTextResponse('User-agent: *\nAllow: /')
      if (url.includes('/api/v1/authors')) return createJsonResponse({ items: [] })
      if (url.includes('/api/v1/posts')) return createJsonResponse({ items: [] })
      if (url.includes('/api/v1/discussions')) return createJsonResponse({ items: [] })
      if (url.endsWith('/api/v1/schedules/stale-sample')) return createStatusResponse(404)
      if (url.includes('/api/v1/schedules')) return createJsonResponse({ items: [] })
      if (init?.method === 'HEAD' && url.endsWith('/schedule/stale-sample')) {
        return createStatusResponse(200)
      }
      if (init?.method === 'HEAD') return createStatusResponse(200)
      throw new Error(`Unexpected URL: ${url}`)
    }

    const manifest = await discoverAuditTargets({
      base: 'https://momichan.com',
      fetchImpl: fetchImpl as typeof fetch,
      fallbackEntries: [
        { url: 'https://momichan.com/schedule/stale-sample', pageType: 'schedule-detail' },
      ],
    })

    expect(manifest.entries.map((entry) => entry.url)).not.toContain(
      'https://momichan.com/schedule/stale-sample'
    )
    expect(manifest.coverage.rejectedFallbacks).toEqual([
      expect.objectContaining({
        url: 'https://momichan.com/schedule/stale-sample',
        pageType: 'schedule-detail',
        status: 404,
        phase: 'detail-api',
        probeUrl: 'https://momichan.com/api/v1/schedules/stale-sample',
      }),
    ])
    expect(manifest.coverage.gaps).toEqual(
      expect.arrayContaining([expect.objectContaining({ pageType: 'schedule-detail', missing: 1 })])
    )
  })

  it('rejects legacy UUIDv4 post samples before probing detail APIs', async () => {
    const legacyPostId = '4df78e2b-4a70-4df1-8956-2e249376a336'
    const strictPostId = '0195fe30-6f9d-7f31-9e6f-c9a5c478a001'
    const probedUrls: string[] = []

    const fetchImpl = async (url: string) => {
      probedUrls.push(url)
      if (url.endsWith('/sitemap.xml')) return createTextResponse('<urlset></urlset>')
      if (url.endsWith('/robots.txt')) return createTextResponse('User-agent: *\nAllow: /')
      if (url.includes('/api/v1/authors')) return createJsonResponse({ items: [] })
      if (url.endsWith(`/api/v1/posts/${strictPostId}`)) {
        return createJsonResponse({ id: strictPostId })
      }
      if (url.endsWith('/api/v1/posts?limit=10')) {
        return createJsonResponse({ items: [{ id: legacyPostId }, { id: strictPostId }] })
      }
      if (url.includes('/api/v1/discussions')) return createJsonResponse({ items: [] })
      if (url.includes('/api/v1/schedules')) return createJsonResponse({ items: [] })
      throw new Error(`Unexpected URL: ${url}`)
    }

    const manifest = await discoverAuditTargets({
      base: 'https://momichan.com',
      fallbackEntries: [],
      fetchImpl: fetchImpl as typeof fetch,
    })

    expect(manifest.entries.map((entry) => entry.url)).toContain(
      `https://momichan.com/post/${strictPostId}`
    )
    expect(manifest.entries.map((entry) => entry.url)).not.toContain(
      `https://momichan.com/post/${legacyPostId}`
    )
    expect(probedUrls).not.toContain(`https://momichan.com/api/v1/posts/${legacyPostId}`)
    expect(manifest.coverage.rejectedFallbacks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: `https://momichan.com/post/${legacyPostId}`,
          pageType: 'post-detail',
          phase: 'strict-uuidv7-contract',
        }),
      ])
    )
  })
})
