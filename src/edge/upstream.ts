export interface UpstreamRuntimeEnv {
  API_BASE_URL?: string
  VPC_API_ORIGIN?: string
  VPC_IDENTITY_API_ORIGIN?: string
  VPC_COMMUNITY_API_ORIGIN?: string
  VPC_CONTENT_API_ORIGIN?: string
}

export type UpstreamDomain = 'identity' | 'community' | 'content'

function normalizeConfiguredUrl(value: string | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.replace(/\/+$/, '')
}

export function resolveConfiguredApiBaseUrl(env?: UpstreamRuntimeEnv): string | null {
  return normalizeConfiguredUrl(env?.API_BASE_URL)
}

export function resolveRequiredApiBaseUrl(env?: UpstreamRuntimeEnv): string {
  const apiBaseUrl = resolveConfiguredApiBaseUrl(env)
  if (!apiBaseUrl) {
    throw new Error('API_BASE_URL is required')
  }

  return apiBaseUrl
}

function normalizeApiPath(path: string): string {
  const trimmed = path.trim()
  if (!trimmed) return '/'
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      return new URL(trimmed).pathname
    } catch {
      return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
    }
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export function resolveUpstreamDomain(path: string): UpstreamDomain {
  const normalizedPath = normalizeApiPath(path)

  if (/^\/api\/v1\/posts\/[^/]+\/comments(?:\/)?$/i.test(normalizedPath)) {
    return 'community'
  }

  if (normalizedPath === '/api/v1/community/highlights') {
    return 'content'
  }

  if (
    normalizedPath.startsWith('/api/v1/client') ||
    normalizedPath.startsWith('/api/v1/auth') ||
    normalizedPath.startsWith('/api/v1/preferences') ||
    normalizedPath.startsWith('/api/v1/users/me') ||
    normalizedPath.startsWith('/api/v1/devices') ||
    normalizedPath.startsWith('/api/v1/account') ||
    normalizedPath.startsWith('/api/v1/2fa') ||
    normalizedPath.startsWith('/api/v1/email') ||
    normalizedPath.startsWith('/api/v1/upload/avatar') ||
    normalizedPath.startsWith('/api/v1/audit') ||
    normalizedPath.startsWith('/uploads/avatars')
  ) {
    return 'identity'
  }

  if (
    normalizedPath.startsWith('/api/v1/favorites') ||
    normalizedPath.startsWith('/api/v1/community') ||
    normalizedPath.startsWith('/api/v1/comments') ||
    normalizedPath.startsWith('/api/v1/comment-images') ||
    normalizedPath.startsWith('/api/v1/discussions') ||
    normalizedPath.startsWith('/api/v1/relations') ||
    normalizedPath.startsWith('/api/v1/history') ||
    normalizedPath.startsWith('/api/v1/reports') ||
    normalizedPath.startsWith('/api/v1/inbox') ||
    normalizedPath.startsWith('/api/v1/feedback') ||
    normalizedPath.startsWith('/api/v1/contact/send') ||
    normalizedPath.startsWith('/uploads/comment_images')
  ) {
    return 'community'
  }

  return 'content'
}

export function resolveVpcOriginForPath(path: string, env?: UpstreamRuntimeEnv): string {
  const fallbackOrigin = normalizeConfiguredUrl(env?.VPC_API_ORIGIN) ?? 'http://localhost:8000'
  const upstreamDomain = resolveUpstreamDomain(path)

  if (upstreamDomain === 'identity') {
    return normalizeConfiguredUrl(env?.VPC_IDENTITY_API_ORIGIN) ?? fallbackOrigin
  }

  if (upstreamDomain === 'community') {
    return normalizeConfiguredUrl(env?.VPC_COMMUNITY_API_ORIGIN) ?? fallbackOrigin
  }

  return normalizeConfiguredUrl(env?.VPC_CONTENT_API_ORIGIN) ?? fallbackOrigin
}

export function resolveVpcOrigin(env?: UpstreamRuntimeEnv): string {
  return resolveVpcOriginForPath('/api/v1/auth/me', env)
}

export function buildWebSocketUpstreamUrl(apiBaseUrl: string, pathname = '/ws'): string {
  const target = new URL(apiBaseUrl)
  const basePath = target.pathname.replace(/\/+$/, '')
  target.protocol = target.protocol === 'https:' ? 'wss:' : 'ws:'
  target.pathname = `${basePath}${pathname.startsWith('/') ? pathname : `/${pathname}`}`
  target.search = ''
  target.hash = ''
  return target.toString()
}
