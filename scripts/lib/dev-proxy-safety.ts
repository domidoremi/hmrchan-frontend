export const DEFAULT_LOCAL_API_PROXY_TARGET = 'http://127.0.0.1:8000'

function parseTarget(target: string): URL {
  return new URL(target)
}

export function isProductionApiProxyTarget(target: string): boolean {
  const hostname = parseTarget(target).hostname.toLowerCase()
  return hostname === 'api.momichan.com' || hostname.endsWith('.api.momichan.com')
}

export function isLoopbackProxyTarget(target: string): boolean {
  const hostname = parseTarget(target).hostname.toLowerCase()
  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]'
}

export function assertDevProxyTargetsAllowed(
  targets: readonly string[],
  allowProductionProxy: boolean
): void {
  if (allowProductionProxy) return

  const productionTargets = targets.filter(isProductionApiProxyTarget)
  if (productionTargets.length === 0) return

  throw new Error(
    `Development proxy refuses production API target(s): ${[...new Set(productionTargets)].join(', ')}. ` +
      'Set ALLOW_PRODUCTION_API_PROXY=true only for an intentional production rehearsal.'
  )
}

export function shouldDowngradeSecureCookies(
  target: string,
  allowRemoteCookieDowngrade: boolean
): boolean {
  return isLoopbackProxyTarget(target) || allowRemoteCookieDowngrade
}

export function rewriteDevProxyCookies(
  cookies: readonly string[],
  target: string,
  allowRemoteCookieDowngrade: boolean
): string[] {
  if (!shouldDowngradeSecureCookies(target, allowRemoteCookieDowngrade)) {
    return [...cookies]
  }

  return cookies.map((cookie) => cookie.replace(/;\s*Secure/gi, ''))
}
