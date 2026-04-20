import { describe, expect, it } from 'vitest'

import {
  buildAuthBootstrapProbeSummary,
  classifyAuthBootstrapProbe,
  extractAuthBootstrapError,
  findFatalAuthBootstrapProbe,
  formatFatalAuthBootstrapProbe,
  getAuthBootstrapProbeDefinitions,
  validateAuthBootstrapContract,
} from '../../../scripts/lib/auth-bootstrap.js'

describe('auth bootstrap helpers', () => {
  it('extracts error codes and messages from nested payloads', () => {
    expect(
      extractAuthBootstrapError({
        detail: {
          code: 'CLIENT_CONTRACT_MISMATCH',
          message: 'Contract mismatch',
        },
      })
    ).toEqual({
      code: 'CLIENT_CONTRACT_MISMATCH',
      message: 'Contract mismatch',
      detail: {
        code: 'CLIENT_CONTRACT_MISMATCH',
        message: 'Contract mismatch',
      },
    })

    expect(
      extractAuthBootstrapError({
        error: 'GOOGLE_AUTH_DISABLED',
        message: 'Google login is temporarily unavailable.',
      })
    ).toEqual({
      code: 'GOOGLE_AUTH_DISABLED',
      message: 'Google login is temporarily unavailable.',
      detail: null,
    })
  })

  it('extracts a tunnel-unavailable diagnostic from HTML edge failures', () => {
    expect(
      extractAuthBootstrapError(
        null,
        '<html><head><title>Page not found · MomiChan</title></head><body><h2>Cloudflare Tunnel error</h2><p>Error 1033</p></body></html>'
      )
    ).toEqual({
      code: 'UPSTREAM_TUNNEL_UNAVAILABLE',
      message: 'Cloudflare Tunnel error (1033)',
      detail: null,
    })
  })

  it('classifies known fatal auth bootstrap probes', () => {
    expect(
      classifyAuthBootstrapProbe({
        path: '/api/v1/client/init',
        method: 'POST',
        status: 404,
        code: 'UPSTREAM_TUNNEL_UNAVAILABLE',
        message: 'Cloudflare Tunnel error (1033)',
      })
    ).toBe('upstream-tunnel-unavailable')

    expect(
      classifyAuthBootstrapProbe({
        path: '/api/v1/client/init',
        method: 'POST',
        status: 404,
      })
    ).toBe('client-init-missing')

    expect(
      classifyAuthBootstrapProbe({
        path: '/api/v1/client/init',
        method: 'POST',
        status: 426,
        code: null,
      })
    ).toBe('client-contract-mismatch')

    expect(
      classifyAuthBootstrapProbe({
        path: '/api/v1/auth/session:resolve',
        method: 'POST',
        status: 426,
        code: 'CLIENT_CONTRACT_MISMATCH',
      })
    ).toBe('client-contract-mismatch')

    expect(
      classifyAuthBootstrapProbe({
        path: '/api/v1/auth/login',
        method: 'POST',
        status: 500,
        code: 'BFF_NOT_CONFIGURED',
      })
    ).toBe('bff-not-configured')

    expect(
      classifyAuthBootstrapProbe({
        path: '/api/v1/auth/login',
        method: 'POST',
        status: 503,
      })
    ).toBe('login-5xx')

    expect(
      classifyAuthBootstrapProbe({
        path: '/api/v1/auth/passwordless/options',
        method: 'POST',
        status: 403,
      })
    ).toBe('passwordless-forbidden')

    expect(
      classifyAuthBootstrapProbe({
        path: '/api/v1/auth/google/start?intent=login&return_to=%2F',
        method: 'GET',
        status: 404,
      })
    ).toBe('google-start-missing')

    expect(
      classifyAuthBootstrapProbe({
        path: '/api/v1/auth/google/start?intent=login&return_to=%2F',
        method: 'GET',
        status: 503,
        code: 'GOOGLE_AUTH_DISABLED',
        message: 'Google login is temporarily unavailable.',
      })
    ).toBeNull()
  })

  it('finds and formats the first fatal auth bootstrap probe', () => {
    const fatalProbe = findFatalAuthBootstrapProbe([
      {
        path: '/api/v1/client/init',
        method: 'POST',
        status: 200,
        code: null,
        message: null,
      },
      {
        path: '/api/v1/auth/login',
        method: 'POST',
        status: 500,
        code: 'BFF_NOT_CONFIGURED',
        message: 'Internal BFF origin or shared secret is not configured.',
      },
    ])

    expect(fatalProbe).toEqual({
      path: '/api/v1/auth/login',
      method: 'POST',
      status: 500,
      code: 'BFF_NOT_CONFIGURED',
      message: 'Internal BFF origin or shared secret is not configured.',
      kind: 'bff-not-configured',
    })

    expect(buildAuthBootstrapProbeSummary(fatalProbe!)).toBe(
      'POST /api/v1/auth/login -> HTTP 500 BFF_NOT_CONFIGURED Internal BFF origin or shared secret is not configured.'
    )
    expect(formatFatalAuthBootstrapProbe(fatalProbe!)).toContain(
      'Pages BFF environment is not configured'
    )
  })

  it('formats edge tunnel failures as upstream availability problems', () => {
    const fatalProbe = findFatalAuthBootstrapProbe([
      {
        path: '/api/v1/client/init',
        method: 'POST',
        status: 404,
        code: 'UPSTREAM_TUNNEL_UNAVAILABLE',
        message: 'Cloudflare Tunnel error (1033)',
      },
    ])

    expect(fatalProbe).toEqual({
      path: '/api/v1/client/init',
      method: 'POST',
      status: 404,
      code: 'UPSTREAM_TUNNEL_UNAVAILABLE',
      message: 'Cloudflare Tunnel error (1033)',
      kind: 'upstream-tunnel-unavailable',
    })
    expect(formatFatalAuthBootstrapProbe(fatalProbe!)).toContain(
      'API upstream is unavailable at the edge'
    )
  })

  it('keeps the auth bootstrap probe contract aligned with public auth warmup endpoints', () => {
    const definitions = getAuthBootstrapProbeDefinitions()

    expect(validateAuthBootstrapContract()).toEqual([])
    expect(definitions.map((probe) => probe.path)).toEqual([
      '/api/v1/client/init',
      '/api/v1/auth/session:resolve',
      '/api/v1/auth/login',
      '/api/v1/auth/passwordless/options',
      '/api/v1/auth/google/start?intent=login&return_to=%2F',
    ])
    expect(definitions[0]).toMatchObject({
      method: 'POST',
      attachContract: false,
      body: {
        client_fingerprint: 'auth-bootstrap-probe',
      },
    })
    expect(definitions[2]).toMatchObject({
      method: 'POST',
      attachContract: true,
      body: {
        username: 'invalid-smoke-user',
        password: 'invalid-smoke-password',
        client_fingerprint: 'auth-bootstrap-probe',
      },
    })
    expect(definitions[3]).toMatchObject({
      method: 'POST',
      attachContract: true,
      body: {
        client_fingerprint: 'auth-bootstrap-probe',
      },
    })
    expect(definitions[4]).toMatchObject({
      method: 'GET',
      attachContract: false,
      redirect: 'manual',
    })
  })
})
