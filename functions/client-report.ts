import {
  TelemetryPayloadTooLargeError,
  hasAllowedContentType,
  isSameOriginTelemetryRequest,
  readBoundedJsonBody,
  sanitizeTelemetryPath,
  sanitizeTelemetryText,
  sanitizeTelemetryValue,
} from './_shared/telemetry'

interface ClientReportPayload {
  kind?: 'error' | 'event' | 'performance'
  name?: string
  severity?: 'info' | 'warn' | 'error'
  category?: 'app' | 'security'
  timestamp?: string
  path?: string
  buildHash?: string
  buildTime?: string
  requestId?: string
  securityLevel?: 'public' | 'authenticated' | 'sensitive'
  riskMode?: 'normal' | 'degraded'
  data?: Record<string, unknown>
  message?: string
  stack?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizePayload(payload: unknown): ClientReportPayload | null {
  if (!isRecord(payload)) return null

  const kind = payload['kind']
  const name = payload['name']

  if (
    (kind !== 'error' && kind !== 'event' && kind !== 'performance') ||
    typeof name !== 'string' ||
    !name.trim()
  ) {
    return null
  }

  return {
    kind,
    name: name.trim().slice(0, 120),
    severity:
      payload['severity'] === 'warn' || payload['severity'] === 'error'
        ? payload['severity']
        : 'info',
    category: payload['category'] === 'security' ? 'security' : 'app',
    timestamp: typeof payload['timestamp'] === 'string' ? payload['timestamp'] : undefined,
    path: typeof payload['path'] === 'string' ? sanitizeTelemetryPath(payload['path']) : undefined,
    buildHash:
      typeof payload['buildHash'] === 'string' ? payload['buildHash'].slice(0, 120) : undefined,
    buildTime:
      typeof payload['buildTime'] === 'string' ? payload['buildTime'].slice(0, 120) : undefined,
    requestId:
      typeof payload['requestId'] === 'string' ? payload['requestId'].slice(0, 120) : undefined,
    securityLevel:
      payload['securityLevel'] === 'authenticated' || payload['securityLevel'] === 'sensitive'
        ? payload['securityLevel']
        : 'public',
    riskMode: payload['riskMode'] === 'degraded' ? 'degraded' : 'normal',
    data: isRecord(payload['data'])
      ? (sanitizeTelemetryValue(payload['data']) as Record<string, unknown>)
      : undefined,
    message:
      typeof payload['message'] === 'string'
        ? sanitizeTelemetryText(payload['message'], 1000)
        : undefined,
    stack:
      typeof payload['stack'] === 'string'
        ? sanitizeTelemetryText(payload['stack'], 4000)
        : undefined,
  }
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

  if (!isSameOriginTelemetryRequest(request)) {
    return new Response('Forbidden', {
      status: 403,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  if (!hasAllowedContentType(request, new Set(['application/json']))) {
    return new Response('Unsupported Media Type', {
      status: 415,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  try {
    const payload = normalizePayload(await readBoundedJsonBody(request))
    if (!payload) {
      return new Response('Bad Request', {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      })
    }

    const entry = {
      ...payload,
      cfRay: sanitizeTelemetryText(request.headers.get('cf-ray') ?? '', 120) || undefined,
      userAgent: sanitizeTelemetryText(request.headers.get('user-agent') ?? '', 300) || undefined,
    }

    if (payload.kind === 'error' || payload.severity === 'error') {
      console.error('[client-report]', JSON.stringify(entry))
    } else if (payload.severity === 'warn') {
      console.warn('[client-report]', JSON.stringify(entry))
    } else {
      console.log('[client-report]', JSON.stringify(entry))
    }

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
