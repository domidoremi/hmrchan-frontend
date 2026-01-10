/**
 * Cloudflare Pages Function - Uploads 代理
 *
 * 将 /uploads/* 请求代理到后端服务器
 * 用于访问需要认证的用户头像等上传文件
 */

interface Env {
  API_BASE_URL: string
}

type CFPagesContext = {
  request: Request
  env: Env
  params: { path?: string | string[] }
}

export async function onRequest(context: CFPagesContext): Promise<Response> {
  const { request, env, params } = context

  // 获取后端地址
  const apiBaseUrl = env.API_BASE_URL || 'https://api.momichan.xyz'

  // 构建目标 URL
  const path = Array.isArray(params.path) ? params.path.join('/') : params.path || ''
  const targetUrl = `${apiBaseUrl}/uploads/${path}`

  // 复制请求头
  const headers = new Headers()
  const skipHeaders = ['host', 'cf-connecting-ip', 'cf-ray', 'cf-visitor', 'cf-ipcountry']

  for (const [key, value] of request.headers.entries()) {
    if (!skipHeaders.includes(key.toLowerCase())) {
      headers.set(key, value)
    }
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
    })

    // 复制响应头
    const responseHeaders = new Headers(response.headers)

    // 设置缓存（头像可以缓存较长时间）
    if (response.ok) {
      responseHeaders.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
    }

    // 移除可能导致问题的头
    responseHeaders.delete('content-encoding')
    responseHeaders.delete('transfer-encoding')

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('[Uploads Proxy] Error:', error)
    return new Response('Not Found', { status: 404 })
  }
}
