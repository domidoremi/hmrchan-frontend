/**
 * Cloudflare Pages Function - Uploads 代理
 *
 * `/uploads/*` 仅保留为 edge 兼容层。
 * 现役公开资源 contract 已迁移到 storage-backed public URL，
 * 因此前端不应再主动生成或依赖这些旧路径。
 */

import { resolveConfiguredApiBaseUrl } from '../../src/edge/upstream'
import { buildBufferedResponse } from '../../src/edge/bufferedResponse'
import { hasMediaAuthContext } from '../api/mediaCachePolicy'

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
  const hasAuthContext = hasMediaAuthContext(request.headers)

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

  // 构建目标 URL
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

    // Authenticated legacy uploads may vary by caller and must never enter a shared cache.
    if (response.ok) {
      responseHeaders.set(
        'Cache-Control',
        hasAuthContext
          ? 'private, no-store'
          : 'public, max-age=86400, stale-while-revalidate=604800'
      )
      if (hasAuthContext) {
        responseHeaders.append('Vary', 'Authorization')
        responseHeaders.append('Vary', 'Cookie')
      }
    }

    // 移除可能导致问题的头
    responseHeaders.delete('content-encoding')
    responseHeaders.delete('transfer-encoding')

    return await buildBufferedResponse(response, responseHeaders, request.method)
  } catch (error) {
    console.error('[Uploads Proxy] Error:', error)
    return new Response('Not Found', { status: 404 })
  }
}
