import { canTrackAnalytics, canTrackPerformance } from './analyticsConsent'
import { getRuntimeSecurityState, type RiskMode, type SecurityLevel } from '@/security/runtimeState'

type ReportKind = 'error' | 'event' | 'performance'
type ReportSeverity = 'info' | 'warn' | 'error'
type ReportCategory = 'app' | 'security'

interface ReportOptions {
  requiresAnalyticsConsent?: boolean
  severity?: ReportSeverity
  category?: ReportCategory
  requestId?: string
  securityLevel?: SecurityLevel
  riskMode?: RiskMode
}

interface ClientReportPayload {
  kind: ReportKind
  name: string
  severity: ReportSeverity
  category: ReportCategory
  timestamp: string
  path: string
  href: string
  buildHash: string
  buildTime: string
  requestId?: string
  securityLevel: SecurityLevel
  riskMode: RiskMode
  data?: Record<string, unknown>
  message?: string
  stack?: string
}

const REPORT_ENDPOINT = '/client-report'
const REPORTING_PREVIEW_BYPASSED =
  import.meta.env.PROD && import.meta.env['VITE_DISABLE_PREVIEW_PROXY'] === 'true'
const REPORTING_ENABLED =
  (!REPORTING_PREVIEW_BYPASSED && import.meta.env.PROD) ||
  import.meta.env['VITE_ENABLE_CLIENT_REPORTS'] === 'true'

function getRuntimeInfo() {
  if (typeof window === 'undefined') {
    return {
      href: '',
      path: '',
    }
  }

  return {
    href: window.location.href,
    path: window.location.pathname + window.location.search + window.location.hash,
  }
}

function sanitizeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    }
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 40)
        .map(([key, item]) => [key, sanitizeValue(item)])
    )
  }

  if (typeof value === 'string') {
    return value.slice(0, 400)
  }

  return value
}

function sanitizeData(data?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!data) return undefined
  return Object.fromEntries(
    Object.entries(data)
      .slice(0, 40)
      .map(([key, value]) => [key, sanitizeValue(value)])
  )
}

function buildPayload(
  kind: ReportKind,
  name: string,
  options: ReportOptions,
  data?: Record<string, unknown>,
  error?: unknown
): ClientReportPayload {
  const runtimeInfo = getRuntimeInfo()
  const runtimeSecurity = getRuntimeSecurityState()
  const normalizedError = error instanceof Error ? error : null

  return {
    kind,
    name,
    severity: options.severity ?? (kind === 'error' ? 'error' : 'info'),
    category: options.category ?? 'app',
    timestamp: new Date().toISOString(),
    path: runtimeInfo.path,
    href: runtimeInfo.href,
    buildHash: typeof __BUILD_HASH__ === 'string' ? __BUILD_HASH__ : 'unknown',
    buildTime: typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : '',
    requestId: options.requestId,
    securityLevel: options.securityLevel ?? runtimeSecurity.currentSecurityLevel,
    riskMode: options.riskMode ?? runtimeSecurity.riskMode,
    data: sanitizeData(data),
    message: normalizedError?.message,
    stack: normalizedError?.stack?.slice(0, 4000),
  }
}

function canSend(kind: ReportKind, options: ReportOptions): boolean {
  if (!REPORTING_ENABLED) return false
  if (options.category === 'security') return true
  if (options.requiresAnalyticsConsent === false) return true
  if (kind === 'performance') return canTrackPerformance()
  if (!canTrackAnalytics()) return false
  return true
}

function sendPayload(payload: ClientReportPayload): void {
  const body = JSON.stringify(payload)

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([body], { type: 'application/json' })
    const sent = navigator.sendBeacon(REPORT_ENDPOINT, blob)
    if (sent) return
  }

  void fetch(REPORT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
    keepalive: true,
  }).catch(() => {
    // Reporting must stay silent on failure.
  })
}

export function reportClientEvent(
  name: string,
  data?: Record<string, unknown>,
  options: ReportOptions = {}
): void {
  if (!canSend('event', options)) return
  sendPayload(buildPayload('event', name, options, data))
}

export function reportClientError(
  name: string,
  error: unknown,
  data?: Record<string, unknown>,
  options: ReportOptions = {}
): void {
  if (!canSend('error', options)) return
  sendPayload(buildPayload('error', name, { ...options, severity: 'error' }, data, error))
}

export function reportClientPerformance(
  name: string,
  data?: Record<string, unknown>,
  options: ReportOptions = {}
): void {
  if (!canSend('performance', options)) return
  sendPayload(buildPayload('performance', name, options, data))
}
