const PAGES_PREVIEW_SUFFIX = '.pages.dev'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

export function getRuntimeHostname(): string {
  if (typeof window === 'undefined') return ''
  return window.location.hostname.trim().toLowerCase()
}

export function isPagesPreviewHost(hostname = getRuntimeHostname()): boolean {
  return hostname.endsWith(PAGES_PREVIEW_SUFFIX)
}

export function isLocalRuntimeHost(hostname = getRuntimeHostname()): boolean {
  return LOCAL_HOSTS.has(hostname)
}

export function shouldEnableCloudflareAnalytics(hostname = getRuntimeHostname()): boolean {
  return !isPagesPreviewHost(hostname)
}

export function getPreferredPreviewLocale(hostname = getRuntimeHostname()): 'zh-CN' | null {
  return isPagesPreviewHost(hostname) ? 'zh-CN' : null
}
