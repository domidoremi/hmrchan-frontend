import {
  TelemetryPayloadTooLargeError,
  hasAllowedContentType,
  readBoundedJsonBody,
  sanitizeTelemetryText,
  sanitizeTelemetryUrl,
} from './_shared/telemetry'

interface CspReportEnvelope {
  'csp-report'?: Record<string, unknown>
  body?: Record<string, unknown>
}

const CSP_CONTENT_TYPES = new Set([
  'application/csp-report',
  'application/json',
  'application/reports+json',
])

const CSP_STRING_FIELDS = new Set([
  'disposition',
  'effective-directive',
  'original-policy',
  'script-sample',
  'violated-directive',
])
const CSP_URL_FIELDS = new Set(['blocked-uri', 'document-uri', 'referrer', 'source-file'])
const CSP_NUMBER_FIELDS = new Set(['column-number', 'line-number', 'status-code'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeCspReport(payload: unknown): Record<string, unknown> | null {
  const envelope = Array.isArray(payload) ? payload[0] : payload
  if (!isRecord(envelope)) return null

  const candidate = isRecord(envelope['csp-report'])
    ? envelope['csp-report']
    : isRecord(envelope['body'])
      ? envelope['body']
      : null
  if (!candidate) return null

  const report: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(candidate)) {
    if (CSP_STRING_FIELDS.has(key) && typeof value === 'string') {
      report[key] = sanitizeTelemetryText(value, key === 'original-policy' ? 2000 : 500)
    } else if (CSP_URL_FIELDS.has(key) && typeof value === 'string') {
      report[key] = sanitizeTelemetryUrl(value)
    } else if (CSP_NUMBER_FIELDS.has(key) && typeof value === 'number' && Number.isFinite(value)) {
      report[key] = value
    }
  }

  return Object.keys(report).length > 0 ? report : null
}

export async function onRequest(
  context: EventContext<unknown, string, unknown>
): Promise<Response> {
  const { request } = context

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        Allow: 'POST',
        'Cache-Control': 'no-store',
      },
    })
  }

  if (!hasAllowedContentType(request, CSP_CONTENT_TYPES)) {
    return new Response('Unsupported Media Type', {
      status: 415,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  try {
    const payload = (await readBoundedJsonBody(request)) as CspReportEnvelope
    const report = normalizeCspReport(payload)

    if (!report) {
      return new Response('Bad Request', {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      })
    }

    console.warn(
      '[csp-report]',
      JSON.stringify({
        report,
        cfRay: sanitizeTelemetryText(request.headers.get('cf-ray') ?? '', 120) || undefined,
        userAgent: sanitizeTelemetryText(request.headers.get('user-agent') ?? '', 300) || undefined,
      })
    )

    return new Response(null, {
      status: 204,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (error instanceof TelemetryPayloadTooLargeError) {
      return new Response('Payload Too Large', {
        status: 413,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    return new Response('Bad Request', {
      status: 400,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }
}
