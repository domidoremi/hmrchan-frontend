import { afterEach, describe, expect, it, vi } from 'vitest'

import { onRequest as handleClientReport } from '../client-report'
import { onRequest as handleCspReport } from '../csp-report'

function createContext(request: Request) {
  return { request } as never
}

describe('telemetry Functions', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('bounds and redacts client report fields before logging', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const request = new Request('https://momichan.com/client-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://momichan.com',
        'Sec-Fetch-Site': 'same-origin',
      },
      body: JSON.stringify({
        kind: 'error',
        name: 'callback.failure',
        path: '/auth/callback?handoff_code=top-secret',
        href: 'https://momichan.com/auth/callback?handoff_code=ignored-secret',
        data: {
          token: 'nested-secret',
          accessToken: 'camel-case-secret',
          callback: 'OAuth callback failed at /auth/callback?code=oauth-code-secret',
          nested: { one: { two: { three: { four: 'bounded' } } } },
        },
      }),
    })

    const response = await handleClientReport(createContext(request))

    expect(response.status).toBe(204)
    const logged = String(error.mock.calls[0]?.[1])
    expect(logged).toContain('"path":"/auth/callback"')
    expect(logged).toContain('[redacted]')
    expect(logged).not.toContain('top-secret')
    expect(logged).not.toContain('ignored-secret')
    expect(logged).not.toContain('nested-secret')
    expect(logged).not.toContain('camel-case-secret')
    expect(logged).not.toContain('oauth-code-secret')
  })

  it('rejects cross-origin, non-JSON, and oversized client reports', async () => {
    const crossOrigin = await handleClientReport(
      createContext(
        new Request('https://momichan.com/client-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'https://evil.example',
          },
          body: '{}',
        })
      )
    )
    expect(crossOrigin.status).toBe(403)

    const plainText = await handleClientReport(
      createContext(
        new Request('https://momichan.com/client-report', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: '{}',
        })
      )
    )
    expect(plainText.status).toBe(415)

    const oversized = await handleClientReport(
      createContext(
        new Request('https://momichan.com/client-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'event', name: 'large', data: 'x'.repeat(17 * 1024) }),
        })
      )
    )
    expect(oversized.status).toBe(413)
  })

  it('allowlists CSP fields and removes URL query material', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const response = await handleCspReport(
      createContext(
        new Request('https://momichan.com/csp-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/csp-report' },
          body: JSON.stringify({
            'csp-report': {
              'document-uri': 'https://momichan.com/reset-password?token=secret',
              'violated-directive': 'script-src-elem',
              'line-number': 12,
              attackerControlled: { huge: 'x'.repeat(10_000) },
            },
          }),
        })
      )
    )

    expect(response.status).toBe(204)
    const logged = String(warn.mock.calls[0]?.[1])
    expect(logged).toContain('https://momichan.com/reset-password')
    expect(logged).not.toContain('secret')
    expect(logged).not.toContain('attackerControlled')
  })

  it('rejects oversized CSP reports', async () => {
    const response = await handleCspReport(
      createContext(
        new Request('https://momichan.com/csp-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/csp-report' },
          body: JSON.stringify({
            'csp-report': { 'script-sample': 'x'.repeat(17 * 1024) },
          }),
        })
      )
    )

    expect(response.status).toBe(413)
  })
})
