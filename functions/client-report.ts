interface ClientReportPayload {
  kind?: 'error' | 'event' | 'performance'
  name?: string
  severity?: 'info' | 'warn' | 'error'
  timestamp?: string
  path?: string
  href?: string
  buildHash?: string
  buildTime?: string
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
    timestamp: typeof payload['timestamp'] === 'string' ? payload['timestamp'] : undefined,
    path: typeof payload['path'] === 'string' ? payload['path'].slice(0, 500) : undefined,
    href: typeof payload['href'] === 'string' ? payload['href'].slice(0, 500) : undefined,
    buildHash:
      typeof payload['buildHash'] === 'string' ? payload['buildHash'].slice(0, 120) : undefined,
    buildTime:
      typeof payload['buildTime'] === 'string' ? payload['buildTime'].slice(0, 120) : undefined,
    data: isRecord(payload['data']) ? payload['data'] : undefined,
    message: typeof payload['message'] === 'string' ? payload['message'].slice(0, 1000) : undefined,
    stack: typeof payload['stack'] === 'string' ? payload['stack'].slice(0, 4000) : undefined,
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
