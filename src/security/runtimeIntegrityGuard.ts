import { reportClientEvent } from '@/utils/clientReporter'
import { enterRiskMode } from './runtimeState'

type Teardown = () => void

function isTrustedAssetSource(element: Element, url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin)
    if (parsed.origin === window.location.origin) return true

    // Cloudflare adds this nonced, SRI-protected beacon on production HTML.
    return (
      element instanceof HTMLScriptElement &&
      Boolean(element.nonce.trim()) &&
      parsed.origin === 'https://static.cloudflareinsights.com' &&
      /^\/beacon\.min\.js(?:\/v[a-f0-9]{32,64})?$/.test(parsed.pathname) &&
      !parsed.search &&
      !parsed.username &&
      !parsed.password
    )
  } catch {
    return false
  }
}

function hasIntegrityAttribute(element: Element): boolean {
  return Boolean(element.getAttribute('integrity')?.trim())
}

function collectMissingIntegrityAssets(): string[] {
  const selectors = ['script[src]', 'link[rel="modulepreload"][href]'].join(', ')

  return Array.from(document.querySelectorAll(selectors))
    .map((element) => {
      const href = element.getAttribute('src') ?? element.getAttribute('href') ?? ''
      return {
        href,
        valid: isTrustedAssetSource(element, href) && hasIntegrityAttribute(element),
      }
    })
    .filter((entry) => entry.href && !entry.valid)
    .map((entry) => entry.href)
}

function degrade(reason: string, detail?: Record<string, unknown>): void {
  enterRiskMode(reason, detail)
  reportClientEvent(
    'security.runtime_integrity.degraded',
    {
      reason,
      ...detail,
    },
    {
      category: 'security',
      requiresAnalyticsConsent: false,
      severity: 'warn',
    }
  )
}

export function initRuntimeIntegrityGuard(): Teardown {
  if (typeof window === 'undefined' || !import.meta.env.PROD) {
    return () => {}
  }

  const missingIntegrityAssets = collectMissingIntegrityAssets()
  if (missingIntegrityAssets.length > 0) {
    degrade('missing-integrity', {
      assetCount: missingIntegrityAssets.length,
      assets: missingIntegrityAssets.slice(0, 10),
    })
  }

  if (window.self !== window.top) {
    degrade('iframe-context')
  }

  const handleTamperSignal = (event: Event) => {
    const detail = (event as CustomEvent<Record<string, unknown>>).detail ?? {}
    degrade('tamper-signal', detail)
  }

  const handleSecurityPolicyViolation = (event: SecurityPolicyViolationEvent) => {
    degrade('csp-violation', {
      blockedURI: event.blockedURI,
      effectiveDirective: event.effectiveDirective,
      violatedDirective: event.violatedDirective,
    })
  }

  window.addEventListener('security:tamper-suspected', handleTamperSignal)
  document.addEventListener('securitypolicyviolation', handleSecurityPolicyViolation)

  return () => {
    window.removeEventListener('security:tamper-suspected', handleTamperSignal)
    document.removeEventListener('securitypolicyviolation', handleSecurityPolicyViolation)
  }
}
