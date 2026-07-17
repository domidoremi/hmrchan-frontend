export function normalizeProxyTarget(
  rawTarget: string | undefined,
  fallbackTarget: string
): string {
  const target = rawTarget?.trim().replace(/\/+$/, '')
  if (!target || target === '/api') return fallbackTarget.replace(/\/+$/, '')
  return target
}
