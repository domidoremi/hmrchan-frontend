/**
 * Cloudflare Pages Function - uploads proxy.
 *
 * `/uploads/*` remains only as an edge compatibility layer. Active public resource contracts use
 * storage-backed public URLs, so frontend code must not generate or depend on these legacy paths.
 */

import { resolveConfiguredApiBaseUrl } from '../../src/edge/upstream'
import { buildBufferedResponse } from '../../src/edge/bufferedResponse'

interface Env {
  API_BASE_URL?: string
  STORAGE_PUBLIC_BASE_URL?: string
}

type CFPagesContext = {
  request: Request
  env: Env
  params: { path?: string | string[] }
}

export async function onRequest(context: CFPagesContext): Promise<Response> {
  const { request, env, params } = context
  const path = Array.isArray(params.path) ? params.path.join('/') : params.path || ''

  if (path.startsWith('avatars/')) {
    const storagePublicBaseUrl = env.STORAGE_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '')
    if (!storagePublicBaseUrl) {
      return new Response('Retired avatar URL compatibility is not configured', { status: 503 })
    }

    return new Response(null, {
      status: 307,
      headers: {
        Location: `${storagePublicBaseUrl}/uploads/${path}`,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    })
  }

  // Non-avatar upload paths are still proxied for legacy compatibility.
  const apiBaseUrl = resolveConfiguredApiBaseUrl(env)
  if (!apiBaseUrl) {
    return new Response('Uploads proxy is not configured', { status: 500 })
  }

  const targetUrl = `${apiBaseUrl}/uploads/${path}`

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

    const responseHeaders = new Headers(response.headers)

    if (response.ok) {
      responseHeaders.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
    }

    responseHeaders.delete('content-encoding')
    responseHeaders.delete('transfer-encoding')

    return await buildBufferedResponse(response, responseHeaders, request.method)
  } catch (error) {
    console.error('[Uploads Proxy] Error:', error)
    return new Response('Not Found', { status: 404 })
  }
}
