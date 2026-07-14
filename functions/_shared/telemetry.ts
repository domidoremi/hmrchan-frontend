export const MAX_TELEMETRY_BODY_BYTES = 16 * 1024

const SENSITIVE_KEYS = new Set([
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

export class TelemetryPayloadTooLargeError extends Error {
  constructor() {
    super('Telemetry payload is too large')
    this.name = 'TelemetryPayloadTooLargeError'
  }
}

function normalizeKey(key: string): string {
  return key
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
}

export function isSensitiveTelemetryKey(key: string): boolean {
  return SENSITIVE_KEYS.has(normalizeKey(key))
}

export function sanitizeTelemetryText(value: string, maxLength: number): string {
  return value
    .replace(SENSITIVE_QUERY_PATTERN, '$1[redacted]')
    .replace(BEARER_PATTERN, 'Bearer [redacted]')
    .slice(0, maxLength)
}

export function sanitizeTelemetryPath(value: string, maxLength = 500): string {
  try {
    const parsed = new URL(value, 'https://telemetry.invalid')
    return parsed.pathname.slice(0, maxLength)
  } catch {
    return value.split(/[?#]/u, 1)[0]!.slice(0, maxLength)
  }
}

export function sanitizeTelemetryUrl(value: string, maxLength = 500): string {
  const redacted = sanitizeTelemetryText(value, maxLength * 2)

  try {
    const parsed = new URL(redacted)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return redacted.slice(0, maxLength)
    }

    parsed.username = ''
    parsed.password = ''
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString().slice(0, maxLength)
  } catch {
    return redacted.slice(0, maxLength)
  }
}

export function sanitizeTelemetryValue(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string') return sanitizeTelemetryText(value, 400)
  if (depth >= 3) return '[truncated]'

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeTelemetryValue(item, depth + 1))
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 30)
        .map(([key, item]) => [
          key.slice(0, 80),
          isSensitiveTelemetryKey(key) ? '[redacted]' : sanitizeTelemetryValue(item, depth + 1),
        ])
    )
  }

  return undefined
}

export function hasAllowedContentType(request: Request, allowed: ReadonlySet<string>): boolean {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
  return Boolean(contentType && allowed.has(contentType))
}

export function isSameOriginTelemetryRequest(request: Request): boolean {
  const fetchSite = request.headers.get('sec-fetch-site')?.trim().toLowerCase()
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return false

  const origin = request.headers.get('origin')
  if (!origin) return true

  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

export async function readBoundedJsonBody(
  request: Request,
  maxBytes = MAX_TELEMETRY_BODY_BYTES
): Promise<unknown> {
  const contentLength = request.headers.get('content-length')
  if (contentLength) {
    const parsedLength = Number(contentLength)
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      throw new TelemetryPayloadTooLargeError()
    }
  }

  if (!request.body) return null

  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let totalBytes = 0
  let raw = ''

  try {
    while (true) {
      const result = await reader.read()
      if (result.done) break

      totalBytes += result.value.byteLength
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined)
        throw new TelemetryPayloadTooLargeError()
      }

      raw += decoder.decode(result.value, { stream: true })
    }

    raw += decoder.decode()
  } finally {
    reader.releaseLock()
  }

  return JSON.parse(raw)
}
