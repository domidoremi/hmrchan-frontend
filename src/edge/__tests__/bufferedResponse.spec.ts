import { describe, expect, it } from 'vitest'

import {
  buildBufferedResponse,
  shouldOmitResponseBody,
  toBufferedResponseBody,
} from '@/edge/bufferedResponse'

describe('bufferedResponse helpers', () => {
  it('buffers regular response bodies before returning a new response', async () => {
    const upstream = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await buildBufferedResponse(upstream, new Headers(upstream.headers), 'GET')

    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('omits response bodies for HEAD requests and bodyless status codes', async () => {
    const okResponse = new Response('payload', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
    const noContentResponse = new Response(null, {
      status: 204,
    })

    expect(shouldOmitResponseBody('HEAD', okResponse.status)).toBe(true)
    expect(shouldOmitResponseBody('GET', noContentResponse.status)).toBe(true)

    await expect(toBufferedResponseBody(okResponse, 'HEAD')).resolves.toBeNull()
    await expect(toBufferedResponseBody(noContentResponse, 'GET')).resolves.toBeNull()
  })
})
