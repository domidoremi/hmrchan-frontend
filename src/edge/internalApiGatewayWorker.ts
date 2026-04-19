import {
  resolveConfiguredApiBaseUrl,
  resolveUpstreamDomain,
  resolveVpcOriginForPath,
  type UpstreamRuntimeEnv,
} from './upstream'
import { buildBufferedResponse } from './bufferedResponse'
import type { EdgeBindingFetcher } from './internalApiGateway'

export type InternalApiGatewayWorkerEnv = UpstreamRuntimeEnv & {
  ENABLE_VPC_PROXY?: string
  VPC_SERVICE?: EdgeBindingFetcher
}

export type InternalGatewayUpstreamSource = 'vpc' | 'public' | 'public-fallback' | 'vpc-error'

const REQUEST_HEADERS_TO_SKIP = ['host', 'cf-connecting-ip', 'cf-ray', 'cf-visitor', 'cf-ipcountry']
const RESPONSE_HEADERS_TO_SKIP = [
  'connection',
  'Connection',
  'keep-alive',
  'Keep-Alive',
  'proxy-authenticate',
  'Proxy-Authenticate',
  'proxy-authorization',
  'Proxy-Authorization',
  'te',
  'TE',
  'trailer',
  'Trailer',
  'upgrade',
  'Upgrade',
  'proxy-connection',
  'Proxy-Connection',
  'content-length',
  'Content-Length',
  'content-encoding',
  'Content-Encoding',
  'transfer-encoding',
  'Transfer-Encoding',
]

function normalizePath(path: string): string {
  return path.trim().replace(/\/+$/, '') || '/'
}

function isVpcProxyEnabled(env: InternalApiGatewayWorkerEnv): boolean {
  const value = env.ENABLE_VPC_PROXY?.trim().toLowerCase()
  return value === '1' || value === 'true' || value === 'yes' || value === 'on'
}

function shouldBypassVpc(pathname: string, request: Request): boolean {
  if (request.method !== 'GET') return false

  const normalized = normalizePath(pathname).toLowerCase()
  return normalized === '/api/v1/auth/google/start' || normalized === '/api/v1/auth/google/callback'
}

function requiresPrivateVpc(pathname: string): boolean {
  return pathname.startsWith('/internal/')
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

async function withUpstreamSourceHeaders(
  response: Response,
  source: InternalGatewayUpstreamSource,
  path: string,
  requestMethod: string
): Promise<Response> {
  const headers = new Headers(response.headers)
  RESPONSE_HEADERS_TO_SKIP.forEach((header) => headers.delete(header))
  headers.set('X-Proxy-Upstream-Source', source)
  headers.set('X-Proxy-Upstream-Domain', resolveUpstreamDomain(path))

  const apiVersion = extractApiVersion(path)
  if (apiVersion) {
    headers.set('X-API-Version', apiVersion)
  }

  return buildBufferedResponse(response, headers, requestMethod)
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

function buildVpcUpstreamError(error: unknown): Response {
  const message = error instanceof Error ? error.message : String(error)
  return new Response(
    JSON.stringify({
      error: 'VPC_UPSTREAM_UNAVAILABLE',
      message: 'Internal API gateway could not reach the private upstream.',
      detail: message,
    }),
    {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Proxy-Upstream-Source': 'vpc-error',
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

  if (
    !path.startsWith('/api/') &&
    !path.startsWith('/uploads/') &&
    !path.startsWith('/internal/')
  ) {
    return new Response('Not Found', { status: 404 })
  }

  const bodyBuffer =
    request.method === 'GET' || request.method === 'HEAD' ? null : await request.arrayBuffer()

  // Keep the private VPC path opt-in until the runtime route is verified healthy in production.
  if (isVpcProxyEnabled(env) && env.VPC_SERVICE && !shouldBypassVpc(path, request)) {
    try {
      const response = await fetchViaVPC(request, requestUrl, path, search, env, bodyBuffer)
      return await withUpstreamSourceHeaders(response, 'vpc', path, request.method)
    } catch (error) {
      if (requiresPrivateVpc(path)) {
        console.error('[Internal API Gateway] VPC fetch failed for private internal path:', error)
        return buildVpcUpstreamError(error)
      }

      console.error('[Internal API Gateway] VPC fetch failed, falling back to public:', error)
      const response = await fetchViaPublic(
        request,
        requestUrl,
        path,
        search,
        apiBaseUrl,
        bodyBuffer
      )
      return await withUpstreamSourceHeaders(response, 'public-fallback', path, request.method)
    }
  }

  const response = await fetchViaPublic(request, requestUrl, path, search, apiBaseUrl, bodyBuffer)
  return await withUpstreamSourceHeaders(response, 'public', path, request.method)
}
