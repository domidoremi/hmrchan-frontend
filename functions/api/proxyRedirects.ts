export function safelyParseUrl(value: string, base?: string): URL | null {
  try {
    return base ? new URL(value, base) : new URL(value)
  } catch {
    return null
  }
}

export function sanitizeSameOriginRelativePath(value: unknown, fallback = '/profile'): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return fallback
  if (value.startsWith('//')) return fallback
  return value
}
