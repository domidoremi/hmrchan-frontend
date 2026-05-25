const IGNORED_OPTIONAL_ENDPOINTS = ['/client-report']
const IGNORED_THIRD_PARTY_HEALTH_ENDPOINTS = [
  'https://challenges.cloudflare.com/cdn-cgi/challenge-platform/',
]

interface HealthFilterOptions {
  allowLocalPreviewApiNoise?: boolean
  baseOrigin?: string
}

const LOCAL_PREVIEW_ENVIRONMENT_BLOCKER_PATTERN =
  /(?:\b530\b|UPSTREAM_TIMEOUT|UPSTREAM_UNREACHABLE|upstream unavailable|upstream is unavailable|upstream returned|client-report unavailable|\/client-report)/i

function normalizeText(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeOrigin(value?: string): string {
  if (!value) return ''

  try {
    return new URL(value).origin.toLowerCase()
  } catch {
    return ''
  }
}

function isLocalPreviewApiNoise(urlOrText: string, options?: HealthFilterOptions): boolean {
  if (!options?.allowLocalPreviewApiNoise) return false

  const normalized = normalizeText(urlOrText)
  if (!normalized.includes('/api/')) return false

  const baseOrigin = normalizeOrigin(options.baseOrigin)
  if (!baseOrigin) return true

  try {
    return new URL(urlOrText).origin.toLowerCase() === baseOrigin
  } catch {
    return true
  }
}

export function isLocalPreviewEnvironmentBlocker(
  urlOrText: string,
  options?: HealthFilterOptions
): boolean {
  if (!options?.allowLocalPreviewApiNoise) return false

  const normalized = normalizeText(urlOrText)
  if (!LOCAL_PREVIEW_ENVIRONMENT_BLOCKER_PATTERN.test(urlOrText)) return false
  if (normalized.includes('/client-report')) return true
  if (!normalized.includes('/api/') && !normalized.includes('upstream')) return false

  const baseOrigin = normalizeOrigin(options.baseOrigin)
  if (!baseOrigin) return true

  try {
    return new URL(urlOrText).origin.toLowerCase() === baseOrigin
  } catch {
    return true
  }
}

export function isIgnoredOptionalEndpoint(urlOrText: string): boolean {
  const normalized = normalizeText(urlOrText)

  return IGNORED_OPTIONAL_ENDPOINTS.some((path) => normalized.includes(path))
}

function isIgnoredThirdPartyHealthEndpoint(urlOrText: string): boolean {
  const normalized = normalizeText(urlOrText)

  return IGNORED_THIRD_PARTY_HEALTH_ENDPOINTS.some((prefix) => normalized.includes(prefix))
}

export function shouldIgnoreConsoleError(
  text: string,
  includeApiErrors: boolean,
  locationUrl?: string | null,
  options?: HealthFilterOptions
): boolean {
  if (includeApiErrors) return false

  const normalized = normalizeText(text)
  const normalizedLocation = normalizeText(locationUrl ?? '')
  if (!normalized.includes('failed to load resource')) return false

  return (
    isIgnoredOptionalEndpoint(normalized) ||
    isIgnoredOptionalEndpoint(normalizedLocation) ||
    isIgnoredThirdPartyHealthEndpoint(normalized) ||
    isIgnoredThirdPartyHealthEndpoint(normalizedLocation) ||
    isLocalPreviewEnvironmentBlocker(text, options) ||
    isLocalPreviewEnvironmentBlocker(locationUrl ?? '', options) ||
    isLocalPreviewApiNoise(text, options) ||
    isLocalPreviewApiNoise(locationUrl ?? '', options)
  )
}

export function shouldIgnoreRequestIssue(
  url: string,
  includeApiErrors: boolean,
  options?: HealthFilterOptions
): boolean {
  if (includeApiErrors) return false

  const normalized = normalizeText(url)
  return (
    isIgnoredOptionalEndpoint(normalized) ||
    isIgnoredThirdPartyHealthEndpoint(normalized) ||
    isLocalPreviewEnvironmentBlocker(url, options) ||
    isLocalPreviewApiNoise(url, options)
  )
}
