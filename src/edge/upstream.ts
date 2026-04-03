export interface UpstreamRuntimeEnv {
  API_BASE_URL?: string
  VPC_API_ORIGIN?: string
}

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

export function resolveVpcOrigin(env?: UpstreamRuntimeEnv): string {
  return normalizeConfiguredUrl(env?.VPC_API_ORIGIN) ?? 'http://localhost:8000'
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
