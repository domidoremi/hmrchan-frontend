const IGNORED_OPTIONAL_ENDPOINTS = ['/client-report']

interface HealthFilterOptions {
  allowLocalPreviewApiNoise?: boolean
  baseOrigin?: string
}

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

export function isIgnoredOptionalEndpoint(urlOrText: string): boolean {
  const normalized = normalizeText(urlOrText)

  return IGNORED_OPTIONAL_ENDPOINTS.some((path) => normalized.includes(path))
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
  return isIgnoredOptionalEndpoint(normalized) || isLocalPreviewApiNoise(url, options)
}
