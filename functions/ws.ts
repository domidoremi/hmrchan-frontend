import { buildWebSocketUpstreamUrl, resolveConfiguredApiBaseUrl } from '../src/edge/upstream'

// Upgrades same-origin /ws requests to the configured backend WebSocket.

interface Env {
  API_BASE_URL?: string
}

interface Context {
  request: Request
  env: Env
}

export async function onRequest(context: Context): Promise<Response> {
  const { request, env } = context

  const upgradeHeader = request.headers.get('Upgrade')
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 })
  }

  const apiBaseUrl = resolveConfiguredApiBaseUrl(env)
  if (!apiBaseUrl) {
    return new Response('WebSocket proxy is not configured', { status: 500 })
  }

  const wsUrl = buildWebSocketUpstreamUrl(apiBaseUrl)

  const headers = new Headers(request.headers)
  headers.delete('host')

  try {
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
      }
    )
  }
}
