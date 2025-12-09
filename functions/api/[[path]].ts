/**
 * Cloudflare Pages Function - API 代理
 *
 * 将 /api/* 请求代理到后端 API 服务器
 * 支持所有 HTTP 方法和请求头转发
 */

interface Env {
  API_BASE_URL: string
}

interface Context {
  request: Request
  env: Env
  params: { path?: string | string[] }
}

export async function onRequest(context: Context): Promise<Response> {
  const { request, env, params } = context

  // 获取后端 API 地址
  const apiBaseUrl = env.API_BASE_URL || 'https://api.momichan.xyz'

  // 构建目标 URL
  const path = Array.isArray(params.path) ? params.path.join('/') : params.path || ''
  const url = new URL(request.url)
  const targetUrl = `${apiBaseUrl}/api/${path}${url.search}`

  // 复制请求头，移除 Host
  const headers = new Headers(request.headers)
  headers.delete('host')

  // 添加代理标识
  headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '')
  headers.set('X-Forwarded-Proto', 'https')

  try {
    // 转发请求
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'follow',
    })

    // 复制响应头
    const responseHeaders = new Headers(response.headers)

    // 添加 CORS 头（如果需要）
    responseHeaders.set('Access-Control-Allow-Origin', url.origin)
    responseHeaders.set('Access-Control-Allow-Credentials', 'true')

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('[API Proxy] Error:', error)
    return new Response(
      JSON.stringify({
        error: 'Proxy Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
