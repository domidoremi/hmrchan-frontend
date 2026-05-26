import { describe, expect, it, vi } from 'vitest'

import {
  classifyAuthBootstrapProbe,
  findFatalAuthBootstrapProbe,
  isAuthBootstrapChallengeRequiredPayload,
  probeAuthBootstrapEndpoints,
} from '../../../scripts/lib/auth-bootstrap.js'

describe('auth bootstrap probe classification', () => {
  it('treats Turnstile challenge responses as app-level auth bootstrap state', () => {
    const payload = {
      success: false,
      error: {
        code: 'CHALLENGE_REQUIRED',
        message: 'Human verification required',
        challenge_required: true,
      },
    }

    expect(isAuthBootstrapChallengeRequiredPayload(payload)).toBe(true)
    expect(
      classifyAuthBootstrapProbe({
        path: '/api/v1/auth/passkeys/login/options',
        method: 'POST',
        status: 403,
        code: 'CHALLENGE_REQUIRED',
        message: 'Human verification required',
        body: payload,
      })
    ).toBeNull()
  })

  it('still flags non-challenge passkey option 403 responses as raw forbidden failures', () => {
    expect(
      classifyAuthBootstrapProbe({
        path: '/api/v1/auth/passkeys/login/options',
        method: 'POST',
        status: 403,
        code: 'ACCOUNT_LOCKED',
        message: 'Account cannot sign in.',
        body: {
          code: 'ACCOUNT_LOCKED',
          message: 'Account cannot sign in.',
        },
      })
    ).toBe('passkeys-login-forbidden')
  })

  it('keeps existing signing credentials when client init is rate limited', async () => {
    const requests: Request[] = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      requests.push(request)

      if (new URL(request.url).pathname === '/api/v1/client/init') {
        return new Response(JSON.stringify({ detail: { code: 'RATE_LIMITED' } }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    await probeAuthBootstrapEndpoints('https://next.momichan.xyz', {
      clientCredentials: {
        clientToken: 'existing-token',
        clientSecret: 'existing-secret',
      },
      clientFingerprint: 'existing-fingerprint',
      contractVersion: '2026-04-13.p1',
    })

    const passkeyRequest = requests.find(
      (request) => new URL(request.url).pathname === '/api/v1/auth/passkeys/login/options'
    )
    expect(passkeyRequest?.headers.get('X-Client-Token')).toBe('existing-token')
    expect(passkeyRequest?.headers.get('X-Signature')).toBeTruthy()
  })

  it('attaches origin CSRF material to auth facade mutation probes', async () => {
    const requests: Request[] = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      requests.push(request)

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    await probeAuthBootstrapEndpoints('http://127.0.0.1:4173', {
      clientFingerprint: 'csrf-fingerprint',
      contractVersion: '2026-04-13.p1',
      originCsrfToken: 'csrf-token-1',
      probeIntervalMs: 0,
    })

    const clientInitRequest = requests.find(
      (request) => new URL(request.url).pathname === '/api/v1/client/init'
    )
    const sessionResolveRequest = requests.find(
      (request) => new URL(request.url).pathname === '/api/v1/auth/session:resolve'
    )
    const passkeyRequest = requests.find(
      (request) => new URL(request.url).pathname === '/api/v1/auth/passkeys/login/options'
    )

    expect(clientInitRequest?.headers.has('X-Origin-CSRF')).toBe(false)
    expect(sessionResolveRequest?.headers.get('X-Origin-CSRF')).toBe('csrf-token-1')
    expect(sessionResolveRequest?.headers.get('Cookie')).toContain(
      '__Host-momi_origin_csrf=csrf-token-1'
    )
    expect(passkeyRequest?.headers.get('X-Origin-CSRF')).toBe('csrf-token-1')
    expect(passkeyRequest?.headers.get('Cookie')).toContain('__Host-momi_origin_csrf=csrf-token-1')
  })

  it('stops probing after client init reports a tunnel outage', async () => {
    const requests: Request[] = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      requests.push(request)

      return new Response(
        '<html><title>Cloudflare Tunnel error</title><body>Error 1033</body></html>',
        {
          status: 530,
          headers: { 'Content-Type': 'text/html' },
        }
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const probes = await probeAuthBootstrapEndpoints('https://next.momichan.xyz', {
      clientFingerprint: 'existing-fingerprint',
      contractVersion: '2026-04-13.p1',
      probeIntervalMs: 0,
    })

    expect(probes).toHaveLength(1)
    expect(requests).toHaveLength(1)
    expect(new URL(requests[0]!.url).pathname).toBe('/api/v1/client/init')
    expect(findFatalAuthBootstrapProbe(probes)?.kind).toBe('upstream-tunnel-unavailable')
  })

  it('does not report a derived passkey signature failure when client init is rate limited', () => {
    expect(
      findFatalAuthBootstrapProbe([
        {
          path: '/api/v1/client/init',
          method: 'POST',
          status: 429,
          code: 'RATE_LIMITED',
          message: 'Too many client init attempts.',
        },
        {
          path: '/api/v1/auth/passkeys/login/options',
          method: 'POST',
          status: 403,
          code: 'REQUEST_SIGNATURE_REQUIRED',
          message: 'Request signature is required',
          body: {
            detail: {
              code: 'REQUEST_SIGNATURE_REQUIRED',
              message: 'Request signature is required',
            },
          },
        },
      ])
    ).toBeNull()
  })

  it('treats bare client init 429 responses as rate limiting', () => {
    expect(
      findFatalAuthBootstrapProbe([
        {
          path: '/api/v1/client/init',
          method: 'POST',
          status: 429,
          code: null,
          message: null,
        },
        {
          path: '/api/v1/auth/passkeys/login/options',
          method: 'POST',
          status: 403,
          code: 'REQUEST_SIGNATURE_REQUIRED',
          message: 'Request signature is required',
          body: {
            detail: {
              code: 'REQUEST_SIGNATURE_REQUIRED',
              message: 'Request signature is required',
            },
          },
        },
      ])
    ).toBeNull()
  })

  it('still reports passkey signature failures when client init was not rate limited', () => {
    expect(
      findFatalAuthBootstrapProbe([
        {
          path: '/api/v1/client/init',
          method: 'POST',
          status: 200,
          code: null,
          message: null,
        },
        {
          path: '/api/v1/auth/passkeys/login/options',
          method: 'POST',
          status: 403,
          code: 'REQUEST_SIGNATURE_REQUIRED',
          message: 'Request signature is required',
          body: {
            detail: {
              code: 'REQUEST_SIGNATURE_REQUIRED',
              message: 'Request signature is required',
            },
          },
        },
      ])?.kind
    ).toBe('passkeys-login-forbidden')
  })
})
