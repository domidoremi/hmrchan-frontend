import { describe, expect, it } from 'vitest'

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

async function loadDiscoveryModule() {
  return import('../../scripts/lib/lighthouse-prod-discovery.mjs')
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function textResponse(payload: string, status = 200): Response {
  return new Response(payload, {
    status,
    headers: { 'content-type': 'text/plain' },
  })
}

describe('Lighthouse production discovery', () => {
  it('uses only current anonymous route defaults and current detail route shapes', async () => {
    const { discoverAuditTargets } = await loadDiscoveryModule()
    const fetchImpl: FetchLike = async (input) => {
      const url = String(input)
      const pathname = new URL(url).pathname

      if (pathname === '/sitemap.xml') {
        return textResponse(
          [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            '<url><loc>https://next.momichan.com/</loc></url>',
            '<url><loc>https://hmrchan.local/explore</loc></url>',
            '</urlset>',
          ].join('')
        )
      }
      if (pathname === '/robots.txt') {
        return textResponse('User-agent: *\nAllow: /\n')
      }
      if (pathname === '/api/v1/authors') {
        return jsonResponse({ data: [{ id: '019dcf17-91e8-76cc-8a3a-e89b1666bf94' }] })
      }
      if (pathname === '/api/v1/posts') {
        return jsonResponse({ data: [{ id: '019e1463-bc76-7bf7-8266-2a8316ab3d2c' }] })
      }
      if (pathname === '/api/v1/discussions') {
        return jsonResponse({ data: [] })
      }
      if (pathname === '/api/v1/schedules') {
        return jsonResponse({ data: [{ id: '019dcf17-aedb-7842-b273-463f47c7502d' }] })
      }
      if (
        pathname === '/profile/019dcf17-91e8-76cc-8a3a-e89b1666bf94' ||
        pathname === '/posts/019e1463-bc76-7bf7-8266-2a8316ab3d2c' ||
        pathname === '/schedule/019dcf17-aedb-7842-b273-463f47c7502d'
      ) {
        return textResponse('<!doctype html><title>MomiChan</title>', 200)
      }
      if (
        pathname === '/api/v1/authors/019dcf17-91e8-76cc-8a3a-e89b1666bf94' ||
        pathname === '/api/v1/posts/019e1463-bc76-7bf7-8266-2a8316ab3d2c' ||
        pathname === '/api/v1/schedules/019dcf17-aedb-7842-b273-463f47c7502d'
      ) {
        return jsonResponse({ data: { id: pathname.split('/').at(-1) } })
      }

      return textResponse('Not found', 404)
    }

    const manifest = await discoverAuditTargets({
      base: 'https://next.momichan.com',
      fallbackEntries: [],
      fetchImpl,
    })

    const urls = manifest.entries.map((entry) => entry.url)

    expect(urls).toContain('https://next.momichan.com/join-us')
    expect(urls).toContain('https://next.momichan.com/posts/019e1463-bc76-7bf7-8266-2a8316ab3d2c')
    expect(urls).toContain('https://next.momichan.com/profile/019dcf17-91e8-76cc-8a3a-e89b1666bf94')
    expect(urls).toContain(
      'https://next.momichan.com/schedule/019dcf17-aedb-7842-b273-463f47c7502d'
    )
    expect(urls).not.toContain(
      'https://next.momichan.com/post/019e1463-bc76-7bf7-8266-2a8316ab3d2c'
    )
    expect(urls).not.toContain(
      'https://next.momichan.com/author/019dcf17-91e8-76cc-8a3a-e89b1666bf94'
    )
    expect(urls).not.toContain('https://next.momichan.com/search')
    expect(urls).not.toContain('https://next.momichan.com/authors')
    expect(urls).not.toContain('https://next.momichan.com/forgot-password')
    expect(urls.some((url) => url.includes('hmrchan.local'))).toBe(false)
  })

  it('keeps the fallback URL manifest aligned with route and detail target policy', async () => {
    const {
      DEFAULT_BASE,
      DETAIL_PAGE_TARGETS,
      STATIC_ANONYMOUS_ROUTE_PATHS,
      readUrlManifestDocument,
    } = await import('../../scripts/lib/lighthouse-prod-shared.mjs')

    const manifest = readUrlManifestDocument(
      'scripts/config/lighthouse-prod-urls.json',
      DEFAULT_BASE
    )
    const manifestPaths = manifest.entries.map((entry) => new URL(entry.url).pathname)

    expect(manifest.base).toBe(DEFAULT_BASE)
    expect(manifest.coverage?.staticAnonymousRoutes).toEqual(STATIC_ANONYMOUS_ROUTE_PATHS)
    expect(manifest.coverage?.detailTargets).toEqual(DETAIL_PAGE_TARGETS)
    expect(manifestPaths).toEqual(expect.arrayContaining(STATIC_ANONYMOUS_ROUTE_PATHS))
    expect(manifestPaths).not.toContain('/thank-you')
    expect(manifestPaths).not.toContain('/profile')

    expect(manifest.notes).toEqual(
      expect.objectContaining({
        authorDetail: expect.stringContaining('explicit gap'),
        postDetail: expect.stringContaining('explicit gap'),
        discussionDetail: expect.stringContaining('explicit gap'),
        scheduleDetail: expect.stringContaining('explicit gap'),
      })
    )
  })
})
