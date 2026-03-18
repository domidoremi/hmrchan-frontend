/**
 * Cloudflare Pages Function - API 代理
 *
 * 将 /api/* 请求代理到后端 API 服务器
 * 优先通过 Workers VPC（Cloudflare Tunnel）私有访问后端
 * 如果 VPC 绑定不可用，回退到公网访问
 */

import { hasMediaAuthContext, resolveMediaCacheControl } from './mediaCachePolicy'

interface Env {
  API_BASE_URL: string
  VPC_API_ORIGIN?: string
  VPC_SERVICE?: Fetcher
}

type CFPagesContext = {
  request: Request
  env: Env
  params: { path?: string | string[] }
}

// 允许的 Origin 白名单
const ALLOWED_ORIGINS = [
  'https://momichan.xyz',
  'https://www.momichan.xyz',
  'https://himeri.momichan.xyz',
]

// 开发环境允许 localhost
const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']
const RESPONSE_HEADERS_TO_STRIP = [
  'content-security-policy',
  'content-security-policy-report-only',
  'cross-origin-embedder-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
  'permissions-policy',
  'x-frame-options',
  'x-xss-protection',
]

/**
 * 验证 Origin 是否在白名单中
 */
function isAllowedOrigin(origin: string | null, isDev: boolean): boolean {
  if (!origin) return false
  if (ALLOWED_ORIGINS.includes(origin)) return true
  if (isDev && DEV_ORIGINS.includes(origin)) return true
  // 支持 Cloudflare Pages 预览部署
  if (origin.endsWith('.pages.dev')) return true
  return false
}

// CORS 预检响应
function handleCORS(request: Request, isDev: boolean): Response {
  const origin = request.headers.get('Origin')
  const allowedOrigin = isAllowedOrigin(origin, isDev) ? origin : ALLOWED_ORIGINS[0]
  const headers = new Headers({
    'Access-Control-Allow-Origin': allowedOrigin!,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Client-Token, X-Client-Fingerprint, X-Timestamp, X-Signature',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  })
  appendVary(headers, 'Origin')

  return new Response(null, {
    status: 204,
    headers,
  })
}

function appendVary(headers: Headers, value: string) {
  const current = headers.get('Vary')
  if (!current) {
    headers.set('Vary', value)
    return
  }

  const values = current
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (!values.some((item) => item.toLowerCase() === value.toLowerCase())) {
    values.push(value)
    headers.set('Vary', values.join(', '))
  }
}

function extractApiVersion(path: string): string | null {
  const versionSegment = path
    .split('/')
    .map((segment) => segment.trim())
    .find((segment) => /^v\d+$/i.test(segment))

  return versionSegment ? versionSegment.toLowerCase() : null
}

/**
 * 通过 Workers VPC 发送请求（私有网络，不经过公网）
 */
async function fetchViaVPC(
  vpcBinding: Fetcher,
  vpcOrigin: string,
  path: string,
  search: string,
  request: Request,
  headers: Headers
): Promise<Response> {
  const targetUrl = `${vpcOrigin}/api/${path}${search}`

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
    redirect: 'follow',
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    fetchOptions.body = request.body
    // @ts-expect-error - Cloudflare Workers 支持 duplex
    fetchOptions.duplex = 'half'
  }

  return vpcBinding.fetch(new Request(targetUrl, fetchOptions))
}

/**
 * 通过公网发送请求（fallback）
 */
async function fetchViaPublic(
  apiBaseUrl: string,
  path: string,
  search: string,
  request: Request,
  headers: Headers
): Promise<Response> {
  const targetUrl = `${apiBaseUrl}/api/${path}${search}`

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
    redirect: 'follow',
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    fetchOptions.body = request.body
    // @ts-expect-error - Cloudflare Workers 支持 duplex
    fetchOptions.duplex = 'half'
  }

  return fetch(targetUrl, fetchOptions)
}

export async function onRequest(context: CFPagesContext): Promise<Response> {
  const { request, env, params } = context

  // 判断是否为开发环境
  const isDev = env.API_BASE_URL?.includes('localhost') || false

  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return handleCORS(request, isDev)
  }

  // 获取后端 API 地址
  const apiBaseUrl = env.API_BASE_URL || 'https://api.momichan.xyz'

  // 构建路径
  const path = Array.isArray(params.path) ? params.path.join('/') : params.path || ''
  const url = new URL(request.url)
  const originalPath = url.pathname
  const hasTrailingSlash = originalPath.endsWith('/')
  const normalizedPath = path + (hasTrailingSlash && !path.endsWith('/') ? '/' : '')

  // 复制请求头，移除不应转发的头
  const headers = new Headers()
  const skipHeaders = ['host', 'cf-connecting-ip', 'cf-ray', 'cf-visitor', 'cf-ipcountry']

  for (const [key, value] of request.headers.entries()) {
    if (!skipHeaders.includes(key.toLowerCase())) {
      headers.set(key, value)
    }
  }

  // 添加代理标识
  headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '')
  headers.set('X-Forwarded-Proto', 'https')
  headers.set('X-Forwarded-Host', url.host)

  try {
    let response: Response

    // 优先使用 Workers VPC（通过 Cloudflare Tunnel 私有访问）
    if (env.VPC_SERVICE) {
      const vpcOrigin = env.VPC_API_ORIGIN || 'http://localhost:8000'
      try {
        response = await fetchViaVPC(
          env.VPC_SERVICE,
          vpcOrigin,
          normalizedPath,
          url.search,
          request,
          headers
        )
      } catch (vpcError) {
        // VPC 失败，回退到公网
        console.error('[API Proxy] VPC fetch failed, falling back to public:', vpcError)
        response = await fetchViaPublic(apiBaseUrl, normalizedPath, url.search, request, headers)
      }
    } else {
      // 没有 VPC 绑定，直接走公网
      response = await fetchViaPublic(apiBaseUrl, normalizedPath, url.search, request, headers)
    }

    // 复制响应头
    const responseHeaders = new Headers(response.headers)

    // 添加 CORS 头（使用白名单验证）
    const origin = request.headers.get('Origin')
    const allowedOrigin = isAllowedOrigin(origin, isDev) ? origin : ALLOWED_ORIGINS[0]
    responseHeaders.set('Access-Control-Allow-Origin', allowedOrigin!)
    responseHeaders.set('Access-Control-Allow-Credentials', 'true')
    appendVary(responseHeaders, 'Origin')

    // 移除可能导致问题的头
    responseHeaders.delete('content-encoding')
    responseHeaders.delete('transfer-encoding')
    RESPONSE_HEADERS_TO_STRIP.forEach((header) => {
      responseHeaders.delete(header)
    })

    const apiVersion = extractApiVersion(path)
    if (apiVersion) {
      responseHeaders.set('X-API-Version', apiVersion)
    }

    const mediaCacheControl = resolveMediaCacheControl({
      path,
      method: request.method,
      requestHeaders: request.headers,
      responseStatus: response.status,
    })

    if (mediaCacheControl) {
      responseHeaders.set('Cache-Control', mediaCacheControl)

      if (mediaCacheControl === 'private, no-store' || hasMediaAuthContext(request.headers)) {
        appendVary(responseHeaders, 'Authorization')
        appendVary(responseHeaders, 'Cookie')
      }
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('[API Proxy] Error:', error)

    const origin = request.headers.get('Origin')
    const allowedOrigin = isAllowedOrigin(origin, isDev) ? origin : ALLOWED_ORIGINS[0]

    return new Response(
      JSON.stringify({
        error: 'Service Unavailable',
        message: 'Unable to process request. Please try again later.',
      }),
      {
        status: 502,
        headers: (() => {
          const headers = new Headers({
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': allowedOrigin!,
            'Access-Control-Allow-Credentials': 'true',
          })
          appendVary(headers, 'Origin')
          return headers
        })(),
      }
    )
  }
}
