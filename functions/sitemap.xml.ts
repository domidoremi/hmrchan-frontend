import {
  SITEMAP_COLLECTION_SOURCES,
  STATIC_SITEMAP_ENTRIES,
  createSitemapDetailEntries,
  mergeSitemapEntries,
  renderSitemap,
  type SitemapCollectionSource,
  type SitemapEntry,
} from '../src/edge/sitemap'
import {
  buildInternalGatewayUrl,
  withInternalApiGatewayAuth,
  type InternalApiGatewayRuntimeEnv,
} from '../src/edge/internalApiGateway'
import {
  resolveConfiguredApiBaseUrl,
  resolveVpcOriginForPath,
  type UpstreamRuntimeEnv,
} from '../src/edge/upstream'

type SitemapRuntimeEnv = UpstreamRuntimeEnv & InternalApiGatewayRuntimeEnv

type CollectionPage = {
  items: unknown[]
}

const UPSTREAM_TIMEOUT_MS = 3500

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function unwrapCollectionPage(payload: unknown): CollectionPage {
  let candidate = payload
  if (isRecord(payload) && 'data' in payload) {
    const data = payload['data']
    if (Array.isArray(data)) return { items: data }
    candidate = data
  }

  if (!isRecord(candidate) || !Array.isArray(candidate['items'])) {
    throw new Error('Sitemap collection response does not contain an items array')
  }
  return { items: candidate['items'] }
}

async function fetchCollectionPage(
  source: SitemapCollectionSource,
  env: SitemapRuntimeEnv
): Promise<CollectionPage> {
  const headers = new Headers({
    Accept: 'application/json',
    'X-MomiChan-Edge-Metadata': 'true',
  })
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

  try {
    let response: Response
    if (env.INTERNAL_API_GATEWAY) {
      response = await env.INTERNAL_API_GATEWAY.fetch(
        new Request(buildInternalGatewayUrl(source.endpoint), {
          method: 'GET',
          headers: withInternalApiGatewayAuth(headers, env),
          signal: controller.signal,
        })
      )
    } else {
      const pathname = new URL(source.endpoint, 'https://momichan.com').pathname
      const targetOrigin =
        resolveConfiguredApiBaseUrl(env) || resolveVpcOriginForPath(pathname, env)
      response = await fetch(`${targetOrigin}${source.endpoint}`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      })
    }

    if (!response.ok) {
      throw new Error(`Sitemap collection ${source.name} returned ${response.status}`)
    }
    return unwrapCollectionPage(await response.json())
  } finally {
    clearTimeout(timeout)
  }
}

export async function onRequest(
  context: EventContext<SitemapRuntimeEnv, string, unknown>
): Promise<Response> {
  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'GET, HEAD' },
    })
  }

  const results = await Promise.allSettled(
    SITEMAP_COLLECTION_SOURCES.map(async (source) => ({
      source,
      page: await fetchCollectionPage(source, context.env),
    }))
  )
  const detailEntries: SitemapEntry[] = []
  const degradedSources: string[] = []

  results.forEach((result, index) => {
    const source = SITEMAP_COLLECTION_SOURCES[index]
    if (!source) return
    if (result.status === 'rejected') {
      degradedSources.push(source.name)
      return
    }
    detailEntries.push(...createSitemapDetailEntries(source, result.value.page.items))
  })

  const body = renderSitemap(mergeSitemapEntries(STATIC_SITEMAP_ENTRIES, detailEntries))
  const headers = new Headers({
    'Cache-Control': 'public, max-age=900, s-maxage=3600, stale-if-error=86400',
    'Content-Type': 'application/xml; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Sitemap-Detail-Count': String(detailEntries.length),
  })
  if (degradedSources.length) {
    headers.set('X-Sitemap-Degraded-Sources', degradedSources.join(','))
  }

  return new Response(context.request.method === 'HEAD' ? null : body, { headers })
}
