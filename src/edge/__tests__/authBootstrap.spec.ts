import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  findFatalAuthBootstrapProbe,
  getAuthBootstrapProbeDefinitions,
  probeAuthBootstrapEndpoint,
  probeAuthBootstrapEndpoints,
  validateAuthBootstrapContract,
} from '../../../scripts/lib/auth-bootstrap.js'

describe('auth bootstrap probes', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('covers login, passkey login, google start, and session bootstrap routes', () => {
    const definitions = getAuthBootstrapProbeDefinitions()
    const pathMap = new Map(definitions.map((probe) => [probe.path, probe]))

    expect(pathMap.get('/api/v1/client/init')).toMatchObject({
      method: 'POST',
      attachContract: false,
      body: {
        client_fingerprint: 'auth-bootstrap-probe',
        force_reissue: true,
      },
    })
    expect(pathMap.get('/api/v1/auth/session:resolve')).toMatchObject({
      method: 'POST',
      attachContract: true,
    })
    expect(pathMap.get('/api/v1/auth/login')).toMatchObject({
      method: 'POST',
      attachContract: true,
    })
    expect(pathMap.get('/api/v1/auth/passkeys/login/options')).toMatchObject({
      method: 'POST',
      attachContract: true,
    })
    expect(pathMap.get('/api/v1/auth/google/start?intent=login&return_to=%2F')).toMatchObject({
      method: 'GET',
      attachContract: false,
      redirect: 'manual',
    })

    expect(validateAuthBootstrapContract()).toEqual([])
  })

  it('probes google start with manual redirect handling', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('', {
        status: 302,
        headers: {
          Location: 'https://accounts.google.com/o/oauth2/v2/auth',
        },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const definition = getAuthBootstrapProbeDefinitions().find(
      (probe) => probe.path === '/api/v1/auth/google/start?intent=login&return_to=%2F'
    )
    expect(definition).toBeTruthy()

    const result = await probeAuthBootstrapEndpoint('https://momichan.com', definition!, {
      contractVersion: '2026-04-13.p1',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        method: 'GET',
        redirect: 'manual',
      })
    )
    expect(result.status).toBe(302)
  })

  it('signs passkey login probes after client init returns request-integrity credentials', async () => {
    let passkeyLoginHeaders: Headers | null = null
    const fetchMock = vi
      .fn()
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)

        if (url === 'https://momichan.com/api/v1/client/init') {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                client_token: 'token-1',
                client_secret: 'secret-1',
              },
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          )
        }

        if (url === 'https://momichan.com/api/v1/auth/passkeys/login/options') {
          passkeyLoginHeaders = new Headers(init?.headers)
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      })
    vi.stubGlobal('fetch', fetchMock)

    const results = await probeAuthBootstrapEndpoints('https://momichan.com', {
      contractVersion: '2026-04-13.p1',
    })

    expect(results).toHaveLength(5)
    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(passkeyLoginHeaders?.get('X-Client-Token')).toBe('token-1')
    expect(passkeyLoginHeaders?.get('X-Client-Fingerprint')).toBe('auth-bootstrap-probe')
    expect(passkeyLoginHeaders?.get('Origin')).toBe('https://momichan.com')
    expect(passkeyLoginHeaders?.get('Referer')).toBe('https://momichan.com/')
    expect(passkeyLoginHeaders?.get('X-Signature-Version')).toBe('2')
    expect(passkeyLoginHeaders?.get('X-Signature')).toBeTruthy()
  })

  it('treats passkey login 403 and google start 404 as fatal bootstrap regressions', () => {
    const probes = [
      {
        path: '/api/v1/auth/passkeys/login/options',
        method: 'POST',
        status: 403,
        ok: false,
        code: null,
        message: 'forbidden',
        body: null,
      },
      {
        path: '/api/v1/auth/google/start',
        method: 'GET',
        status: 404,
        ok: false,
        code: null,
        message: 'Not found',
        body: null,
      },
    ]

    const passkeyLoginFatal = findFatalAuthBootstrapProbe([probes[0]])
    const googleFatal = findFatalAuthBootstrapProbe([probes[1]])

    expect(passkeyLoginFatal).toMatchObject({
      kind: 'passkeys-login-forbidden',
      path: '/api/v1/auth/passkeys/login/options',
    })
    expect(googleFatal).toMatchObject({
      kind: 'google-start-missing',
      path: '/api/v1/auth/google/start',
    })
  })

  it('does not treat signature verifier unavailability as a route regression', () => {
    const fatalProbe = findFatalAuthBootstrapProbe([
      {
        path: '/api/v1/auth/passkeys/login/options',
        method: 'POST',
        status: 503,
        ok: false,
        code: 'SIGNATURE_VERIFIER_UNAVAILABLE',
        message: 'Request integrity verification unavailable',
        body: null,
      },
    ])

    expect(fatalProbe).toBeNull()
  })
})
