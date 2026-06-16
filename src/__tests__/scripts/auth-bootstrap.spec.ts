import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildAuthBootstrapProbeSummary,
  classifyAuthBootstrapProbe,
  extractAuthBootstrapError,
  findFatalAuthBootstrapProbe,
  getLatestAuthBootstrapProbes,
  findLocalAuditEnvironmentBlockedProbe,
  formatFatalAuthBootstrapProbe,
  formatLocalAuditEnvironmentBlockedProbe,
  getAuthBootstrapProbeDefinitions,
  probeAuthBootstrapEndpoint,
  probeAuthBootstrapEndpoints,
  validateAuthBootstrapContract,
} from '../../../scripts/lib/auth-bootstrap.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function listFiles(root: string): string[] {
  const files: string[] = []

  for (const entry of readdirSync(root)) {
    const path = join(root, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue
      files.push(...listFiles(path))
      continue
    }
    files.push(path)
  }

  return files
}

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
        status: 503,
        code: 'UPSTREAM_UNREACHABLE',
        message: 'connect ECONNREFUSED 127.0.0.1:19081',
      })
    ).toBe('upstream-unreachable')

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
        path: '/api/v1/client/init',
        method: 'POST',
        status: 500,
        code: 'SERVICE_UNAVAILABLE',
      })
    ).toBe('client-init-5xx')

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
        path: '/api/v1/auth/passkeys/login/options',
        method: 'POST',
        status: 403,
      })
    ).toBe('passkeys-login-forbidden')

    expect(
      classifyAuthBootstrapProbe({
        path: '/api/v1/auth/passkeys/login/options',
        method: 'POST',
        status: 503,
        code: 'SIGNATURE_VERIFIER_UNAVAILABLE',
        message: 'Request integrity verification unavailable',
      })
    ).toBeNull()

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

  it('uses the latest probe per endpoint when classifying local audit blockers', () => {
    const probes = [
      {
        path: '/api/v1/client/init',
        method: 'POST',
        status: 503,
        code: 'UPSTREAM_TIMEOUT',
        message: 'timed out',
      },
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
        status: 401,
        code: null,
        message: 'Incorrect username or password',
      },
      {
        path: '/api/v1/auth/passkeys/login/options',
        method: 'POST',
        status: 503,
        code: 'SIGNATURE_VERIFIER_UNAVAILABLE',
        message: 'Request integrity verification unavailable',
      },
    ]

    expect(getLatestAuthBootstrapProbes(probes)).toHaveLength(3)
    expect(findLocalAuditEnvironmentBlockedProbe(probes)).toBeNull()
    expect(findFatalAuthBootstrapProbe(probes)).toBeNull()
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

  it('formats local upstream reachability failures as bootstrap blockers', () => {
    const fatalProbe = findFatalAuthBootstrapProbe([
      {
        path: '/api/v1/client/init',
        method: 'POST',
        status: 503,
        code: 'UPSTREAM_UNREACHABLE',
        message: 'connect ECONNREFUSED 127.0.0.1:19081',
      },
    ])

    expect(fatalProbe).toEqual({
      path: '/api/v1/client/init',
      method: 'POST',
      status: 503,
      code: 'UPSTREAM_UNREACHABLE',
      message: 'connect ECONNREFUSED 127.0.0.1:19081',
      kind: 'upstream-unreachable',
    })
    expect(formatFatalAuthBootstrapProbe(fatalProbe!)).toContain(
      'API upstream is unreachable from the local preview'
    )
  })

  it('formats local audit upstream timeouts as environment blockers', () => {
    const blockedProbe = findLocalAuditEnvironmentBlockedProbe([
      {
        path: '/api/v1/client/init',
        method: 'POST',
        status: 503,
        code: 'UPSTREAM_TIMEOUT',
        message: 'Auth bootstrap probe timed out after 10000ms',
      },
    ])

    expect(blockedProbe).toMatchObject({
      path: '/api/v1/client/init',
      code: 'UPSTREAM_TIMEOUT',
    })
    expect(formatLocalAuditEnvironmentBlockedProbe(blockedProbe!)).toContain(
      'Local audit environment blocked because Docker/local backend upstream is unreachable'
    )
  })

  it('formats client-init upstream 5xx failures as bootstrap blockers', () => {
    const fatalProbe = findFatalAuthBootstrapProbe([
      {
        path: '/api/v1/client/init',
        method: 'POST',
        status: 500,
        code: 'SERVICE_UNAVAILABLE',
        message: 'Unable to process request. Please try again later.',
      },
    ])

    expect(fatalProbe).toEqual({
      path: '/api/v1/client/init',
      method: 'POST',
      status: 500,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Unable to process request. Please try again later.',
      kind: 'client-init-5xx',
    })
    expect(formatFatalAuthBootstrapProbe(fatalProbe!)).toContain(
      'client init returned an upstream 5xx'
    )
  })

  it('keeps the auth bootstrap probe contract aligned with public auth warmup endpoints', () => {
    const definitions = getAuthBootstrapProbeDefinitions()

    expect(validateAuthBootstrapContract()).toEqual([])
    expect(definitions.map((probe) => probe.path)).toEqual([
      '/api/v1/client/init',
      '/api/v1/auth/session:resolve',
      '/api/v1/auth/login',
      '/api/v1/auth/passkeys/login/options',
      '/api/v1/auth/google/start?intent=login&return_to=%2F',
    ])
    expect(definitions[0]).toMatchObject({
      method: 'POST',
      attachContract: false,
      body: {
        client_fingerprint: 'auth-bootstrap-probe',
        force_reissue: true,
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

  it('stops probing after a fatal client-init failure', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          code: 'UPSTREAM_UNREACHABLE',
          message: 'connect ECONNREFUSED 127.0.0.1:19081',
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const results = await probeAuthBootstrapEndpoints('https://momichan.com', {
      probeIntervalMs: 0,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(results).toEqual([
      expect.objectContaining({
        path: '/api/v1/client/init',
        method: 'POST',
        status: 503,
        code: 'UPSTREAM_UNREACHABLE',
      }),
    ])
  })

  it('does not copy successful credential payloads into probe summaries', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            client_token: 'probe-client-token',
            client_secret: 'probe-client-secret',
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await probeAuthBootstrapEndpoint(
      'https://momichan.com',
      getAuthBootstrapProbeDefinitions()[0]!,
      {
        probeIntervalMs: 0,
      }
    )

    expect(result.ok).toBe(true)
    expect(result.message).toBeNull()
    expect(buildAuthBootstrapProbeSummary(result)).not.toContain('probe-client-secret')
  })

  it('does not reference the retired public passwordless options facade', () => {
    const legacyPublicPath = ['/api/v1/auth', 'passwordless', 'options'].join('/')
    const offenders = ['src', 'functions', 'scripts']
      .map((path) => join(repoRoot, path))
      .flatMap(listFiles)
      .filter((path) => /\.(?:ts|tsx|vue|js|mjs|cjs)$/.test(path))
      .flatMap((path) => {
        const content = readFileSync(path, 'utf8')
        return content.includes(legacyPublicPath) ? [relative(repoRoot, path)] : []
      })

    expect(offenders).toEqual([])
  })
})
