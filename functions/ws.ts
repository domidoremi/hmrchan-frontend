/**
 * Cloudflare Pages Function - WebSocket proxy.
 *
 * Proxies /ws requests to the backend WebSocket server.
 */

import { buildWebSocketUpstreamUrl, resolveConfiguredApiBaseUrl } from '../src/edge/upstream'

interface Env {
  API_BASE_URL?: string
}

interface Context {
  request: Request
  env: Env
}

export async function onRequest(context: Context): Promise<Response> {
  const { request, env } = context

  // Require a WebSocket upgrade request.
  const upgradeHeader = request.headers.get('Upgrade')
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 })
  }

  // Resolve the configured backend API address.
  const apiBaseUrl = resolveConfiguredApiBaseUrl(env)
  if (!apiBaseUrl) {
    return new Response('WebSocket proxy is not configured', { status: 500 })
  }

  const wsUrl = buildWebSocketUpstreamUrl(apiBaseUrl)

  // Copy request headers without the original host.
  const headers = new Headers(request.headers)
  headers.delete('host')

  try {
    // Forward the WebSocket connection.
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
