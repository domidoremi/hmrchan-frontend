import {
  resolveConfiguredApiBaseUrl,
  resolveVpcOriginForPath,
  type UpstreamRuntimeEnv,
} from './upstream'
import type { EdgeBindingFetcher } from './internalApiGateway'

export type InternalApiGatewayWorkerEnv = UpstreamRuntimeEnv & {
  VPC_SERVICE?: EdgeBindingFetcher
}

export type InternalGatewayUpstreamSource = 'vpc' | 'public' | 'public-fallback'

const REQUEST_HEADERS_TO_SKIP = ['host', 'cf-connecting-ip', 'cf-ray', 'cf-visitor', 'cf-ipcountry']

function normalizePath(path: string): string {
  return path.trim().replace(/\/+$/, '') || '/'
}

function shouldBypassVpc(pathname: string, request: Request): boolean {
  if (request.method !== 'GET') return false

  const normalized = normalizePath(pathname).toLowerCase()
  return normalized === '/api/v1/auth/google/start' || normalized === '/api/v1/auth/google/callback'
}

function extractApiVersion(path: string): string | null {
  const versionSegment = path
    .split('/')
    .map((segment) => segment.trim())
    .find((segment) => /^v\d+$/i.test(segment))

  return versionSegment ? versionSegment.toLowerCase() : null
}

function cloneHeadersWithoutHopByHop(request: Request, requestUrl: URL): Headers {
  const headers = new Headers()
  for (const [key, value] of request.headers.entries()) {
    if (!REQUEST_HEADERS_TO_SKIP.includes(key.toLowerCase())) {
      headers.set(key, value)
    }
  }

  headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '')
  headers.set('X-Forwarded-Proto', 'https')
  headers.set('X-Forwarded-Host', requestUrl.host)

  return headers
}

async function fetchViaVPC(
  request: Request,
  requestUrl: URL,
  path: string,
  search: string,
  env: InternalApiGatewayWorkerEnv,
  bodyBuffer: ArrayBuffer | null
): Promise<Response> {
  if (!env.VPC_SERVICE) {
    throw new Error('VPC binding unavailable')
  }

  const targetUrl = `${resolveVpcOriginForPath(path, env)}${path}${search}`
  const headers = cloneHeadersWithoutHopByHop(request, requestUrl)
  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'follow',
  }

  if (request.method !== 'GET' && request.method !== 'HEAD' && bodyBuffer !== null) {
    init.body = bodyBuffer.slice(0)
  }

  return env.VPC_SERVICE.fetch(new Request(targetUrl, init))
}

async function fetchViaPublic(
  request: Request,
  requestUrl: URL,
  path: string,
  search: string,
  apiBaseUrl: string,
  bodyBuffer: ArrayBuffer | null
): Promise<Response> {
  const headers = cloneHeadersWithoutHopByHop(request, requestUrl)
  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'follow',
  }

  if (request.method !== 'GET' && request.method !== 'HEAD' && bodyBuffer !== null) {
    init.body = bodyBuffer.slice(0)
  }

  return fetch(new Request(`${apiBaseUrl}${path}${search}`, init))
}

function withUpstreamSourceHeaders(
  response: Response,
  source: InternalGatewayUpstreamSource,
  path: string
): Response {
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.delete('Content-Length')
  headers.delete('content-encoding')
  headers.delete('Content-Encoding')
  headers.delete('transfer-encoding')
  headers.delete('Transfer-Encoding')
  headers.set('X-Proxy-Upstream-Source', source)

  const apiVersion = extractApiVersion(path)
  if (apiVersion) {
    headers.set('X-API-Version', apiVersion)
  }

  return new Response(response.body, {
    status: response.status,
    headers,
  })
}

function buildConfigurationError(): Response {
  return new Response(
    JSON.stringify({
      error: 'UPSTREAM_NOT_CONFIGURED',
      message: 'API upstream is not configured.',
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Proxy-Upstream-Source': 'public',
      },
    }
  )
}

export async function handleInternalApiGatewayRequest(
  request: Request,
  env: InternalApiGatewayWorkerEnv
): Promise<Response> {
  const apiBaseUrl = resolveConfiguredApiBaseUrl(env)
  if (!apiBaseUrl) {
    return buildConfigurationError()
  }

  const requestUrl = new URL(request.url)
  const path = requestUrl.pathname
  const search = requestUrl.search

  if (!path.startsWith('/api/') && !path.startsWith('/uploads/')) {
    return new Response('Not Found', { status: 404 })
  }

  const bodyBuffer =
    request.method === 'GET' || request.method === 'HEAD' ? null : await request.arrayBuffer()

  if (env.VPC_SERVICE && !shouldBypassVpc(path, request)) {
    try {
      const response = await fetchViaVPC(request, requestUrl, path, search, env, bodyBuffer)
      return withUpstreamSourceHeaders(response, 'vpc', path)
    } catch (error) {
      console.error('[Internal API Gateway] VPC fetch failed, falling back to public:', error)
      const response = await fetchViaPublic(
        request,
        requestUrl,
        path,
        search,
        apiBaseUrl,
        bodyBuffer
      )
      return withUpstreamSourceHeaders(response, 'public-fallback', path)
    }
  }

  const response = await fetchViaPublic(request, requestUrl, path, search, apiBaseUrl, bodyBuffer)
  return withUpstreamSourceHeaders(response, 'public', path)
}
