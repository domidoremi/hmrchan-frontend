import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  findFatalAuthBootstrapProbe,
  getAuthBootstrapProbeDefinitions,
  probeAuthBootstrapEndpoint,
  validateAuthBootstrapContract,
} from '../../../scripts/lib/auth-bootstrap.js'

describe('auth bootstrap probes', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('covers login, passwordless, google start, and session bootstrap routes', () => {
    const definitions = getAuthBootstrapProbeDefinitions()
    const pathMap = new Map(definitions.map((probe) => [probe.path, probe]))

    expect(pathMap.get('/api/v1/client/init')).toMatchObject({
      method: 'POST',
      attachContract: false,
    })
    expect(pathMap.get('/api/v1/auth/session:resolve')).toMatchObject({
      method: 'POST',
      attachContract: true,
    })
    expect(pathMap.get('/api/v1/auth/login')).toMatchObject({
      method: 'POST',
      attachContract: true,
    })
    expect(pathMap.get('/api/v1/auth/passwordless/options')).toMatchObject({
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

    const result = await probeAuthBootstrapEndpoint('https://momichan.xyz', definition!, {
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

  it('treats passwordless 403 and google start 404 as fatal bootstrap regressions', () => {
    const probes = [
      {
        path: '/api/v1/auth/passwordless/options',
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

    const passwordlessFatal = findFatalAuthBootstrapProbe([probes[0]])
    const googleFatal = findFatalAuthBootstrapProbe([probes[1]])

    expect(passwordlessFatal).toMatchObject({
      kind: 'passwordless-forbidden',
      path: '/api/v1/auth/passwordless/options',
    })
    expect(googleFatal).toMatchObject({
      kind: 'google-start-missing',
      path: '/api/v1/auth/google/start',
    })
  })
})
