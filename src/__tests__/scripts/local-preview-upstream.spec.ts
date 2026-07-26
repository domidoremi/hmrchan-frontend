import { describe, expect, it } from 'vitest'

import { rewriteLocalPreviewUpstreamOrigin } from '../../../scripts/lib/local-preview-upstream'

describe('local preview upstream origin parity', () => {
  it('maps loopback browser provenance to the production site origin', async () => {
    const request = new Request('http://127.0.0.1:19081/api/v1/client/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://127.0.0.1:48766',
        Referer: 'http://127.0.0.1:48766/login?return_to=%2F',
        'X-Client-Fingerprint': 'local-preview-test',
      },
      body: JSON.stringify({ client_fingerprint: 'local-preview-test' }),
    })

    const rewritten = rewriteLocalPreviewUpstreamOrigin(request, 'https://momichan.com')

    expect(rewritten).not.toBe(request)
    expect(rewritten.headers.get('Origin')).toBe('https://momichan.com')
    expect(rewritten.headers.get('Referer')).toBe('https://momichan.com/login?return_to=%2F')
    expect(rewritten.headers.get('X-Client-Fingerprint')).toBe('local-preview-test')
    expect(rewritten.method).toBe('POST')
    await expect(rewritten.json()).resolves.toEqual({
      client_fingerprint: 'local-preview-test',
    })
  })

  it('leaves non-loopback and origin-less requests unchanged', () => {
    const productionRequest = new Request('http://127.0.0.1:19081/api/v1/home', {
      headers: { Origin: 'https://momichan.com' },
    })
    const serviceRequest = new Request('http://127.0.0.1:19081/health/ready')

    expect(rewriteLocalPreviewUpstreamOrigin(productionRequest, 'https://momichan.com')).toBe(
      productionRequest
    )
    expect(rewriteLocalPreviewUpstreamOrigin(serviceRequest, 'https://momichan.com')).toBe(
      serviceRequest
    )
  })
})
