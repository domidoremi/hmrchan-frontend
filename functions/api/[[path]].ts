/**
 * Cloudflare Pages Function - API 代理
 *
 * 将 /api/* 请求代理到后端 API 服务器
 * 支持所有 HTTP 方法和请求头转发
 */

interface Env {
  API_BASE_URL: string
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

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin!,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, X-Requested-With, Accept, Origin',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  })
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

  // 构建目标 URL
  // 保留原始请求的尾部斜杠
  const path = Array.isArray(params.path) ? params.path.join('/') : params.path || ''
  const url = new URL(request.url)
  const originalPath = url.pathname
  const hasTrailingSlash = originalPath.endsWith('/')
  const normalizedPath = path + (hasTrailingSlash && !path.endsWith('/') ? '/' : '')
  const targetUrl = `${apiBaseUrl}/api/${normalizedPath}${url.search}`

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

  // 安全增强：添加共享密钥验证（可选）
  // 后端可以验证此密钥，确保请求来自 Cloudflare Functions
  // const SECRET_KEY = env.API_SECRET_KEY
  // if (SECRET_KEY) {
  //   headers.set('X-Proxy-Secret', SECRET_KEY)
  // }

  try {
    // 转发请求
    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      redirect: 'follow',
    }

    // 只有非 GET/HEAD 请求才传递 body
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      fetchOptions.body = request.body
      // @ts-expect-error - Cloudflare Workers 支持 duplex
      fetchOptions.duplex = 'half'
    }

    const response = await fetch(targetUrl, fetchOptions)

    // 复制响应头
    const responseHeaders = new Headers(response.headers)

    // 添加 CORS 头（使用白名单验证）
    const origin = request.headers.get('Origin')
    const allowedOrigin = isAllowedOrigin(origin, isDev) ? origin : ALLOWED_ORIGINS[0]
    responseHeaders.set('Access-Control-Allow-Origin', allowedOrigin!)
    responseHeaders.set('Access-Control-Allow-Credentials', 'true')

    // 移除可能导致问题的头
    responseHeaders.delete('content-encoding')
    responseHeaders.delete('transfer-encoding')

    // 为媒体资源设置更长的缓存时间（7天）
    // 针对 /api/v1/media/*/thumbnail 等图片资源
    if (path.includes('/media/') && (path.includes('/thumbnail') || path.includes('/image'))) {
      responseHeaders.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400')
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    // 仅在服务端日志记录详细错误，不暴露给客户端
    console.error('[API Proxy] Error:', error)
    console.error('[API Proxy] Target URL:', targetUrl)

    // 生产环境返回通用错误信息，不泄露内部细节
    const origin = request.headers.get('Origin')
    const allowedOrigin = isAllowedOrigin(origin, isDev) ? origin : ALLOWED_ORIGINS[0]

    return new Response(
      JSON.stringify({
        error: 'Service Unavailable',
        message: 'Unable to process request. Please try again later.',
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin!,
          'Access-Control-Allow-Credentials': 'true',
        },
      }
    )
  }
}
