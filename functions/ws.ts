/**
 * Cloudflare Pages Function - WebSocket 代理
 *
 * 将 /ws 请求代理到后端 WebSocket 服务器
 */

interface Env {
  API_BASE_URL: string
}

interface Context {
  request: Request
  env: Env
}

export async function onRequest(context: Context): Promise<Response> {
  const { request, env } = context

  // 检查是否为 WebSocket 升级请求
  const upgradeHeader = request.headers.get('Upgrade')
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 })
  }

  // 获取后端 API 地址
  const apiBaseUrl = env.API_BASE_URL || 'https://api.momichan.xyz'
  const wsUrl = apiBaseUrl.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws'

  // 复制请求头
  const headers = new Headers(request.headers)
  headers.delete('host')

  try {
    // 转发 WebSocket 连接
    const response = await fetch(wsUrl, {
      method: 'GET',
      headers,
    })

    return response
  } catch (error) {
    console.error('[WebSocket Proxy] Error:', error)
    return new Response(
      JSON.stringify({
        error: 'WebSocket Proxy Error',
        message: 'Unable to establish WebSocket connection. Please try again later.',
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
