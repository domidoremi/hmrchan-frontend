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

// CORS 预检响应
function handleCORS(request: Request): Response {
  const origin = request.headers.get('Origin') || '*'
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
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

  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return handleCORS(request)
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

    // 添加 CORS 头
    const origin = request.headers.get('Origin') || '*'
    responseHeaders.set('Access-Control-Allow-Origin', origin)
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
    console.error('[API Proxy] Error:', error)
    console.error('[API Proxy] Target URL:', targetUrl)

    return new Response(
      JSON.stringify({
        error: 'Proxy Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        target: targetUrl,
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    )
  }
}
