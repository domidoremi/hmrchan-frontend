interface CspReportEnvelope {
  'csp-report'?: Record<string, unknown>
  body?: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export async function onRequest(context: { request: Request }): Promise<Response> {
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
    const payload = (await request.json()) as CspReportEnvelope
    const report = isRecord(payload?.['csp-report'])
      ? payload['csp-report']
      : isRecord(payload?.body)
        ? payload.body
        : null

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
        cfRay: request.headers.get('cf-ray') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      })
    )

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
