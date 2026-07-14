import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('clientReporter', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_ENABLE_CLIENT_REPORTS', 'true')
    window.history.replaceState(
      {},
      '',
      '/reset-password?token=reset-secret#access_token=fragment-secret'
    )
  })

  it('reports pathname-only telemetry with redacted data and no referrer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const { reportClientEvent } = await import('../clientReporter')

    reportClientEvent(
      'security.callback.failed',
      {
        token: 'nested-secret',
        refreshToken: 'camel-case-secret',
        authorizationHeader: 'Bearer bearer-secret-token',
        detail: {
          callbackUrl: 'https://momichan.com/auth/callback?handoff_code=handoff-secret',
        },
      },
      { category: 'security' }
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const payload = JSON.parse(String(init.body)) as Record<string, unknown>

    expect(payload['path']).toBe('/reset-password')
    expect(payload).not.toHaveProperty('href')
    expect(JSON.stringify(payload)).not.toContain('reset-secret')
    expect(JSON.stringify(payload)).not.toContain('fragment-secret')
    expect(JSON.stringify(payload)).not.toContain('nested-secret')
    expect(JSON.stringify(payload)).not.toContain('camel-case-secret')
    expect(JSON.stringify(payload)).not.toContain('bearer-secret-token')
    expect(JSON.stringify(payload)).not.toContain('handoff-secret')
    expect(init.referrerPolicy).toBe('no-referrer')
    expect(init.keepalive).toBe(true)
  })
})
