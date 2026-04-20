function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

const AUTH_BOOTSTRAP_CLIENT_FINGERPRINT = 'auth-bootstrap-probe'
const AUTH_BOOTSTRAP_PROBE_DEFINITIONS = Object.freeze([
  Object.freeze({
    name: 'client-init',
    path: '/api/v1/client/init',
    method: 'POST',
    attachContract: false,
    body: Object.freeze({
      client_fingerprint: AUTH_BOOTSTRAP_CLIENT_FINGERPRINT,
    }),
  }),
  Object.freeze({
    name: 'session-resolve',
    path: '/api/v1/auth/session:resolve',
    method: 'POST',
    attachContract: true,
    body: Object.freeze({
      client_fingerprint: AUTH_BOOTSTRAP_CLIENT_FINGERPRINT,
    }),
  }),
  Object.freeze({
    name: 'login',
    path: '/api/v1/auth/login',
    method: 'POST',
    attachContract: true,
    body: Object.freeze({
      username: 'invalid-smoke-user',
      password: 'invalid-smoke-password',
      client_fingerprint: AUTH_BOOTSTRAP_CLIENT_FINGERPRINT,
    }),
  }),
])

function pickNonEmptyString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }
  return null
}

function extractHtmlTitle(rawBody) {
  const titleMatch = String(rawBody ?? '').match(/<title>(.*?)<\/title>/i)
  return titleMatch?.[1]?.trim() || null
}

function isCloudflareTunnelError(rawBody) {
  const normalized = String(rawBody ?? '')
  return (
    /Cloudflare Tunnel error/i.test(normalized) ||
    /\bError\s*1033\b/i.test(normalized) ||
    /configured as a Cloudflare Tunnel/i.test(normalized)
  )
}

function summarizeRawBody(rawBody) {
  const trimmed = String(rawBody ?? '').trim()
  if (!trimmed) {
    return null
  }

  if (isCloudflareTunnelError(trimmed)) {
    return 'Cloudflare Tunnel error (1033)'
  }

  const htmlTitle = extractHtmlTitle(trimmed)
  if (htmlTitle) {
    return htmlTitle
  }

  return trimmed.length > 240 ? `${trimmed.slice(0, 237)}...` : trimmed
}

export function extractAuthBootstrapError(payload, rawBody = '') {
  if (!isRecord(payload)) {
    const summarizedBody = summarizeRawBody(rawBody)
    return {
      code: isCloudflareTunnelError(rawBody) ? 'UPSTREAM_TUNNEL_UNAVAILABLE' : null,
      message: summarizedBody,
      detail: null,
    }
  }

  const detail = isRecord(payload.detail) ? payload.detail : null
  const error = isRecord(payload.error) ? payload.error : null
  const details = isRecord(payload.details) ? payload.details : null

  return {
    code: pickNonEmptyString(
      payload.code,
      detail?.code,
      error?.code,
      details?.code,
      isCloudflareTunnelError(rawBody) ? 'UPSTREAM_TUNNEL_UNAVAILABLE' : null
    ),
    message: pickNonEmptyString(
      payload.message,
      detail?.message,
      error?.message,
      detail?.detail,
      payload.detail,
      summarizeRawBody(rawBody)
    ),
    detail: detail ?? details ?? error ?? null,
  }
}

export function buildAuthBootstrapProbeSummary(probe) {
  const codePart = probe.code ? ` ${probe.code}` : ''
  const messagePart = probe.message ? ` ${probe.message}` : ''
  return `${probe.method} ${probe.path} -> HTTP ${probe.status}${codePart}${messagePart}`.trim()
}

export function classifyAuthBootstrapProbe(probe) {
  if (
    probe.code === 'UPSTREAM_TUNNEL_UNAVAILABLE' ||
    /Cloudflare Tunnel error/i.test(String(probe.message ?? ''))
  ) {
    return 'upstream-tunnel-unavailable'
  }

  if (probe.path === '/api/v1/client/init' && probe.status === 404) {
    return 'client-init-missing'
  }

  if (
    probe.status === 426 &&
    (
      probe.code === 'CLIENT_CONTRACT_MISMATCH' ||
      probe.code === 'CLIENT_UPGRADE_REQUIRED' ||
      probe.path === '/api/v1/client/init' ||
      probe.path === '/api/v1/auth/session:resolve' ||
      probe.path === '/api/v1/auth/login'
    )
  ) {
    return 'client-contract-mismatch'
  }

  if (probe.code === 'BFF_NOT_CONFIGURED') {
    return 'bff-not-configured'
  }

  if (probe.path === '/api/v1/auth/session:resolve' && probe.status >= 500) {
    return 'session-resolve-5xx'
  }

  if (probe.path === '/api/v1/auth/login' && probe.status >= 500) {
    return 'login-5xx'
  }

  return null
}

export function findFatalAuthBootstrapProbe(probes) {
  for (const probe of probes) {
    const kind = classifyAuthBootstrapProbe(probe)
    if (kind) {
      return {
        ...probe,
        kind,
      }
    }
  }

  return null
}

export function formatFatalAuthBootstrapProbe(probe) {
  const summary = buildAuthBootstrapProbeSummary(probe)

  switch (probe.kind) {
    case 'upstream-tunnel-unavailable':
      return `Auth bootstrap blocked because the API upstream is unavailable at the edge (Cloudflare Tunnel 1033) (${summary}).`
    case 'client-init-missing':
      return `Auth bootstrap blocked: controlled site is missing the live public route for client init (${summary}).`
    case 'client-contract-mismatch':
      return `Auth bootstrap blocked by client contract mismatch (${summary}).`
    case 'bff-not-configured':
      return `Auth bootstrap blocked because Pages BFF environment is not configured (${summary}).`
    case 'session-resolve-5xx':
      return `Auth bootstrap blocked because session resolve returned an upstream 5xx (${summary}).`
    case 'login-5xx':
      return `Auth bootstrap blocked because login returned an upstream 5xx (${summary}).`
    default:
      return `Auth bootstrap failed (${summary}).`
  }
}

export function getAuthBootstrapProbeDefinitions() {
  return AUTH_BOOTSTRAP_PROBE_DEFINITIONS.map((probe) => ({
    ...probe,
    body: probe.body ? { ...probe.body } : null,
  }))
}

export function validateAuthBootstrapContract() {
  const issues = []
  const definitions = getAuthBootstrapProbeDefinitions()
  const requiredPaths = new Map([
    ['/api/v1/client/init', { method: 'POST', attachContract: false }],
    ['/api/v1/auth/session:resolve', { method: 'POST', attachContract: true }],
    ['/api/v1/auth/login', { method: 'POST', attachContract: true }],
  ])

  for (const [path, expectation] of requiredPaths.entries()) {
    const probe = definitions.find((entry) => entry.path === path)
    if (!probe) {
      issues.push({
        code: 'missing-auth-bootstrap-probe',
        message: `Missing auth bootstrap probe for ${path}`,
      })
      continue
    }

    if (probe.method !== expectation.method) {
      issues.push({
        code: 'auth-bootstrap-method-mismatch',
        message: `${path} should use ${expectation.method}, got ${probe.method}`,
      })
    }

    if (Boolean(probe.attachContract) !== expectation.attachContract) {
      issues.push({
        code: 'auth-bootstrap-contract-mismatch',
        message: `${path} should ${expectation.attachContract ? 'attach' : 'skip'} the client contract header`,
      })
    }

    if (!isRecord(probe.body) || probe.body.client_fingerprint !== AUTH_BOOTSTRAP_CLIENT_FINGERPRINT) {
      issues.push({
        code: 'auth-bootstrap-fingerprint-mismatch',
        message: `${path} must send a stable client_fingerprint probe payload`,
      })
    }
  }

  return issues
}

export async function probeAuthBootstrapEndpoint(baseUrl, probe, options = {}) {
  const headers = new Headers({
    Accept: 'application/json',
  })

  if (probe.method !== 'GET') {
    headers.set('Content-Type', 'application/json')
  }

  const contractVersion = options.contractVersion?.trim()
  if (probe.attachContract !== false && contractVersion) {
    headers.set('X-Client-Contract-Version', contractVersion)
  }

  const requestBody =
    probe.body == null || typeof probe.body === 'string' ? probe.body ?? null : JSON.stringify(probe.body)

  const response = await fetch(new URL(probe.path, baseUrl).toString(), {
    method: probe.method,
    headers,
    body: requestBody,
  })

  const rawBody = await response.text()
  let parsedBody = null
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : null
  } catch {
    parsedBody = null
  }

  const errorMeta = extractAuthBootstrapError(parsedBody, rawBody)

  return {
    path: probe.path,
    method: probe.method,
    status: response.status,
    ok: response.ok,
    code: errorMeta.code,
    message: errorMeta.message ?? (rawBody.trim().length > 0 ? rawBody.trim() : null),
    body: parsedBody,
  }
}

export async function probeAuthBootstrapEndpoints(baseUrl, options = {}) {
  return Promise.all(
    getAuthBootstrapProbeDefinitions().map((probe) =>
      probeAuthBootstrapEndpoint(baseUrl, probe, options)
    )
  )
}
