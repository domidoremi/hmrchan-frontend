const IGNORED_OPTIONAL_ENDPOINTS = ['/client-report']

function normalizeText(value: string): string {
  return value.trim().toLowerCase()
}

export function isIgnoredOptionalEndpoint(urlOrText: string): boolean {
  const normalized = normalizeText(urlOrText)

  return IGNORED_OPTIONAL_ENDPOINTS.some((path) => normalized.includes(path))
}

export function shouldIgnoreConsoleError(
  text: string,
  includeApiErrors: boolean,
  locationUrl?: string | null
): boolean {
  if (includeApiErrors) return false

  const normalized = normalizeText(text)
  const normalizedLocation = normalizeText(locationUrl ?? '')
  if (!normalized.includes('failed to load resource')) return false

  return (
    normalized.includes('503') ||
    normalized.includes('/api/') ||
    normalizedLocation.includes('/api/') ||
    isIgnoredOptionalEndpoint(normalized) ||
    isIgnoredOptionalEndpoint(normalizedLocation)
  )
}

export function shouldIgnoreRequestIssue(url: string, includeApiErrors: boolean): boolean {
  if (includeApiErrors) return false

  const normalized = normalizeText(url)
  return normalized.includes('/api/') || isIgnoredOptionalEndpoint(normalized)
}
