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
      path: '',
    }
  }

  return {
    path: window.location.pathname,
  }
}

const SENSITIVE_DATA_KEYS = new Set([
  'access_token',
  'api_key',
  'authorization',
  'authorization_header',
  'client_secret',
  'code',
  'code_verifier',
  'cookie',
  'credential',
  'csrf_token',
  'handoff_code',
  'id_token',
  'password',
  'private_key',
  'refresh_token',
  'secret',
  'session',
  'session_id',
  'state',
  'token',
])

const SENSITIVE_QUERY_PATTERN =
  /([?&#](?:access_token|api_key|authorization|client_secret|code|code_verifier|credential|csrf_token|handoff_code|id_token|password|private_key|refresh_token|secret|session|session_id|state|token)=)[^&#\s"'<>]*/gi
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi

function sanitizeText(value: string, maxLength: number): string {
  return value
    .replace(SENSITIVE_QUERY_PATTERN, '$1[redacted]')
    .replace(BEARER_PATTERN, 'Bearer [redacted]')
    .slice(0, maxLength)
}

function isSensitiveDataKey(key: string): boolean {
  return SENSITIVE_DATA_KEYS.has(
    key
      .trim()
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
  )
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeText(value.message, 400),
      stack: value.stack ? sanitizeText(value.stack, 4000) : undefined,
    }
  }

  if (Array.isArray(value)) {
    if (depth >= 3) return '[truncated]'
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1))
  }

  if (value && typeof value === 'object') {
    if (depth >= 3) return '[truncated]'
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 40)
        .map(([key, item]) => [
          key,
          isSensitiveDataKey(key) ? '[redacted]' : sanitizeValue(item, depth + 1),
        ])
    )
  }

  if (typeof value === 'string') {
    return sanitizeText(value, 400)
  }

  return value
}

function sanitizeData(data?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!data) return undefined
  return Object.fromEntries(
    Object.entries(data)
      .slice(0, 40)
      .map(([key, value]) => [key, isSensitiveDataKey(key) ? '[redacted]' : sanitizeValue(value)])
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
    buildHash: typeof __BUILD_HASH__ === 'string' ? __BUILD_HASH__ : 'unknown',
    buildTime: typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : '',
    requestId: options.requestId,
    securityLevel: options.securityLevel ?? runtimeSecurity.currentSecurityLevel,
    riskMode: options.riskMode ?? runtimeSecurity.riskMode,
    data: sanitizeData(data),
    message: normalizedError ? sanitizeText(normalizedError.message, 1000) : undefined,
    stack: normalizedError?.stack ? sanitizeText(normalizedError.stack, 4000) : undefined,
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

  void fetch(REPORT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
    keepalive: true,
    referrerPolicy: 'no-referrer',
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
