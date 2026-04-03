import { reportClientEvent } from '@/utils/clientReporter'
import { enterRiskMode } from './runtimeState'

type Teardown = () => void

function isSameOriginAsset(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin)
    return parsed.origin === window.location.origin
  } catch {
    return false
  }
}

function hasIntegrityAttribute(element: Element): boolean {
  return Boolean(element.getAttribute('integrity')?.trim())
}

function collectMissingIntegrityAssets(): string[] {
  const selectors = [
    'script[src]',
    'link[rel="stylesheet"][href]',
    'link[rel="modulepreload"][href]',
  ].join(', ')

  return Array.from(document.querySelectorAll(selectors))
    .map((element) => {
      const href = element.getAttribute('src') ?? element.getAttribute('href') ?? ''
      return {
        href,
        valid: isSameOriginAsset(href) && hasIntegrityAttribute(element),
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
