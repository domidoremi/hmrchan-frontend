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
            '<url><loc>https://next.momichan.xyz/</loc></url>',
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
      base: 'https://next.momichan.xyz',
      fallbackEntries: [],
      fetchImpl,
    })

    const urls = manifest.entries.map((entry) => entry.url)

    expect(urls).toContain('https://next.momichan.xyz/posts/019e1463-bc76-7bf7-8266-2a8316ab3d2c')
    expect(urls).toContain('https://next.momichan.xyz/profile/019dcf17-91e8-76cc-8a3a-e89b1666bf94')
    expect(urls).toContain(
      'https://next.momichan.xyz/schedule/019dcf17-aedb-7842-b273-463f47c7502d'
    )
    expect(urls).not.toContain(
      'https://next.momichan.xyz/post/019e1463-bc76-7bf7-8266-2a8316ab3d2c'
    )
    expect(urls).not.toContain(
      'https://next.momichan.xyz/author/019dcf17-91e8-76cc-8a3a-e89b1666bf94'
    )
    expect(urls).not.toContain('https://next.momichan.xyz/search')
    expect(urls).not.toContain('https://next.momichan.xyz/authors')
    expect(urls).not.toContain('https://next.momichan.xyz/forgot-password')
    expect(urls.some((url) => url.includes('hmrchan.local'))).toBe(false)
  })
})
