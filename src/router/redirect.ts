export function resolveRedirectTarget(value: unknown, fallback = '/profile'): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return fallback
  if (value.startsWith('//')) return fallback
  return value
}
