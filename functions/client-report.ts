interface ClientReportPayload {
  kind?: 'error' | 'event' | 'performance'
  name?: string
  severity?: 'info' | 'warn' | 'error'
  category?: 'app' | 'security'
  timestamp?: string
  path?: string
  href?: string
  buildHash?: string
  buildTime?: string
  requestId?: string
  securityLevel?: 'public' | 'authenticated' | 'sensitive'
  riskMode?: 'normal' | 'degraded'
  data?: Record<string, unknown>
  message?: string
  stack?: string
}

type ClientReportContext = {
  request: Request
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
    ...(typeof payload['timestamp'] === 'string' ? { timestamp: payload['timestamp'] } : {}),
    ...(typeof payload['path'] === 'string' ? { path: payload['path'].slice(0, 500) } : {}),
    ...(typeof payload['href'] === 'string' ? { href: payload['href'].slice(0, 500) } : {}),
    ...(typeof payload['buildHash'] === 'string'
      ? { buildHash: payload['buildHash'].slice(0, 120) }
      : {}),
    ...(typeof payload['buildTime'] === 'string'
      ? { buildTime: payload['buildTime'].slice(0, 120) }
      : {}),
    ...(typeof payload['requestId'] === 'string'
      ? { requestId: payload['requestId'].slice(0, 120) }
      : {}),
    securityLevel:
      payload['securityLevel'] === 'authenticated' || payload['securityLevel'] === 'sensitive'
        ? payload['securityLevel']
        : 'public',
    riskMode: payload['riskMode'] === 'degraded' ? 'degraded' : 'normal',
    ...(isRecord(payload['data']) ? { data: payload['data'] } : {}),
    ...(typeof payload['message'] === 'string'
      ? { message: payload['message'].slice(0, 1000) }
      : {}),
    ...(typeof payload['stack'] === 'string' ? { stack: payload['stack'].slice(0, 4000) } : {}),
  }
}

export async function onRequest(context: ClientReportContext): Promise<Response> {
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

  try {
    const payload = normalizePayload(await request.json())
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
      cfRay: request.headers.get('cf-ray') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
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
  } catch {
    return new Response('Bad Request', {
      status: 400,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }
}
