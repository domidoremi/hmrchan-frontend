function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

const AUTH_BOOTSTRAP_CLIENT_FINGERPRINT = 'auth-bootstrap-probe'
const AUTH_BOOTSTRAP_REQUEST_TIMEOUT_MS = 10_000
const AUTH_BOOTSTRAP_PROBE_INTERVAL_MS = 250
const textEncoder = new TextEncoder()
const AUTH_BOOTSTRAP_PROBE_DEFINITIONS = Object.freeze([
  Object.freeze({
    name: 'client-init',
    path: '/api/v1/client/init',
    method: 'POST',
    attachContract: false,
    body: Object.freeze({
      client_fingerprint: AUTH_BOOTSTRAP_CLIENT_FINGERPRINT,
      force_reissue: true,
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
  Object.freeze({
    name: 'passkeys-login-options',
    path: '/api/v1/auth/passkeys/login/options',
    method: 'POST',
    attachContract: true,
    body: Object.freeze({
      client_fingerprint: AUTH_BOOTSTRAP_CLIENT_FINGERPRINT,
    }),
  }),
  Object.freeze({
    name: 'google-start',
    path: '/api/v1/auth/google/start?intent=login&return_to=%2F',
    method: 'GET',
    attachContract: false,
    redirect: 'manual',
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

function canonicalizeQuery(search) {
  const raw = search.startsWith('?') ? search.slice(1) : search
  if (!raw) return ''

  const params = new URLSearchParams(raw)
  params.sort()
  return params.toString()
}

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hmacSha256Hex(secret, payload) {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(payload))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  )
}

function getRandomHex(length) {
  const bytes = new Uint8Array(Math.ceil(length / 2))
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length)
}

function extractBootstrapClientCredentials(payload) {
  const envelope = isRecord(payload?.data) ? payload.data : payload
  if (!isRecord(envelope)) {
    return null
  }

  const clientToken =
    typeof envelope.client_token === 'string' && envelope.client_token.trim()
      ? envelope.client_token.trim()
      : null
  const clientSecret =
    typeof envelope.client_secret === 'string' && envelope.client_secret.trim()
      ? envelope.client_secret.trim()
      : null

  if (!clientToken || !clientSecret) {
    return null
  }

  return {
    clientToken,
    clientSecret,
  }
}

async function attachProbeSignatureHeaders(headers, baseUrl, probe, requestBody, credentials) {
  if (!credentials?.clientToken || !credentials?.clientSecret) {
    return
  }

  const parsedUrl = new URL(probe.path, baseUrl)
  const method = probe.method.toUpperCase()
  if (method === 'GET' || parsedUrl.pathname === '/api/v1/client/init') {
    return
  }

  const bodyBytes = requestBody ? textEncoder.encode(requestBody) : new Uint8Array()
  const timestamp = Math.floor(Date.now() / 1000)
  const nonce = getRandomHex(32)
  const contentHash = await sha256Hex(bodyBytes)
  const payload = [
    method,
    parsedUrl.pathname,
    canonicalizeQuery(parsedUrl.search),
    contentHash.toLowerCase(),
    String(timestamp),
    nonce,
    credentials.clientToken,
  ].join('|')

  headers.set('X-Client-Token', credentials.clientToken)
  headers.set('X-Timestamp', String(timestamp))
  headers.set('X-Nonce', nonce)
  headers.set('X-Content-SHA256', contentHash)
  headers.set('X-Signature-Version', '2')
  headers.set('X-Signature', await hmacSha256Hex(credentials.clientSecret, payload))
}

function attachProbeBrowserContextHeaders(headers, baseUrl, probe) {
  if (probe.method.toUpperCase() === 'GET') {
    return
  }

  const origin = new URL(baseUrl).origin
  const parsedUrl = new URL(probe.path, baseUrl)
  headers.set('Origin', origin)

  if (parsedUrl.pathname.startsWith('/api/v1/auth/')) {
    headers.set('Referer', `${origin}/`)
  }
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
      typeof payload.error === 'string' ? payload.error : null,
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

  if (probe.code === 'UPSTREAM_TIMEOUT' || probe.code === 'UPSTREAM_UNREACHABLE') {
    return 'upstream-unreachable'
  }

  if (probe.path === '/api/v1/client/init' && probe.status === 404) {
    return 'client-init-missing'
  }

  if (probe.path === '/api/v1/client/init' && probe.status >= 500) {
    return 'client-init-5xx'
  }

  if (
    probe.status === 426 &&
    (probe.code === 'CLIENT_CONTRACT_MISMATCH' ||
      probe.code === 'CLIENT_UPGRADE_REQUIRED' ||
      probe.path === '/api/v1/client/init' ||
      probe.path === '/api/v1/auth/session:resolve' ||
      probe.path === '/api/v1/auth/login')
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

  if (probe.path === '/api/v1/auth/passkeys/login/options' && probe.status === 403) {
    return 'passkeys-login-forbidden'
  }

  if (
    probe.path === '/api/v1/auth/passkeys/login/options' &&
    probe.status === 503 &&
    probe.code === 'SIGNATURE_VERIFIER_UNAVAILABLE'
  ) {
    return null
  }

  if (probe.path === '/api/v1/auth/passkeys/login/options' && probe.status >= 500) {
    return 'passkeys-login-5xx'
  }

  if (probe.path.startsWith('/api/v1/auth/google/start') && probe.status === 404) {
    return 'google-start-missing'
  }

  if (
    probe.path.startsWith('/api/v1/auth/google/start') &&
    probe.status === 503 &&
    probe.code === 'GOOGLE_AUTH_DISABLED'
  ) {
    return null
  }

  if (probe.path.startsWith('/api/v1/auth/google/start') && probe.status >= 500) {
    return 'google-start-5xx'
  }

  return null
}

function getProbeKey(probe) {
  try {
    const url = new URL(probe.path, 'https://local.invalid')
    return `${probe.method?.toUpperCase?.() ?? 'GET'} ${url.pathname}`
  } catch {
    return `${probe.method?.toUpperCase?.() ?? 'GET'} ${probe.path}`
  }
}

export function getLatestAuthBootstrapProbes(probes) {
  const latest = new Map()
  for (const probe of probes) {
    latest.set(getProbeKey(probe), probe)
  }
  return [...latest.values()]
}

export function findFatalAuthBootstrapProbe(probes) {
  probes = getLatestAuthBootstrapProbes(probes)
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

export function isLocalAuditEnvironmentBlockedProbe(probe) {
  return (
    classifyAuthBootstrapProbe(probe) === 'upstream-unreachable' &&
    (probe.code === 'UPSTREAM_TIMEOUT' || probe.code === 'UPSTREAM_UNREACHABLE')
  )
}

export function findLocalAuditEnvironmentBlockedProbe(probes) {
  return (
    getLatestAuthBootstrapProbes(probes).find((probe) =>
      isLocalAuditEnvironmentBlockedProbe(probe)
    ) ?? null
  )
}

function shouldStopAuthBootstrapProbes(probe) {
  if (probe.path !== '/api/v1/client/init') {
    return false
  }

  return [
    'upstream-tunnel-unavailable',
    'upstream-unreachable',
    'client-init-missing',
    'client-init-5xx',
    'client-contract-mismatch',
    'bff-not-configured',
  ].includes(classifyAuthBootstrapProbe(probe))
}

export function formatLocalAuditEnvironmentBlockedProbe(probe) {
  const summary = buildAuthBootstrapProbeSummary(probe)
  return `Local audit environment blocked because Docker/local backend upstream is unreachable from the preview (${summary}). Start Docker Desktop and the local backend stack, or set LOCAL_AUDIT_AUTO_API_BRIDGE=false with reachable local origins before rerunning.`
}

export function formatFatalAuthBootstrapProbe(probe) {
  const summary = buildAuthBootstrapProbeSummary(probe)

  switch (probe.kind) {
    case 'upstream-tunnel-unavailable':
      return `Auth bootstrap blocked because the API upstream is unavailable at the edge (Cloudflare Tunnel 1033) (${summary}).`
    case 'upstream-unreachable':
      return `Auth bootstrap blocked because the API upstream is unreachable from the local preview (${summary}).`
    case 'client-init-missing':
      return `Auth bootstrap blocked: controlled site is missing the live public route for client init (${summary}).`
    case 'client-init-5xx':
      return `Auth bootstrap blocked because client init returned an upstream 5xx (${summary}).`
    case 'client-contract-mismatch':
      return `Auth bootstrap blocked by client contract mismatch (${summary}).`
    case 'bff-not-configured':
      return `Auth bootstrap blocked because Pages BFF environment is not configured (${summary}).`
    case 'session-resolve-5xx':
      return `Auth bootstrap blocked because session resolve returned an upstream 5xx (${summary}).`
    case 'login-5xx':
      return `Auth bootstrap blocked because login returned an upstream 5xx (${summary}).`
    case 'passkeys-login-forbidden':
      return `Auth bootstrap blocked because passkeys/login/options returned a raw forbidden response instead of an app-level payload (${summary}).`
    case 'passkeys-login-5xx':
      return `Auth bootstrap blocked because passkeys/login/options returned an upstream 5xx (${summary}).`
    case 'google-start-missing':
      return `Auth bootstrap blocked because Google start is missing from the published auth surface (${summary}).`
    case 'google-start-5xx':
      return `Auth bootstrap blocked because Google start returned an upstream 5xx (${summary}).`
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
    ['/api/v1/auth/passkeys/login/options', { method: 'POST', attachContract: true }],
    [
      '/api/v1/auth/google/start?intent=login&return_to=%2F',
      { method: 'GET', attachContract: false, redirect: 'manual' },
    ],
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

    if (
      !('redirect' in expectation) &&
      (!isRecord(probe.body) || probe.body.client_fingerprint !== AUTH_BOOTSTRAP_CLIENT_FINGERPRINT)
    ) {
      issues.push({
        code: 'auth-bootstrap-fingerprint-mismatch',
        message: `${path} must send a stable client_fingerprint probe payload`,
      })
    }

    if ('redirect' in expectation && probe.redirect !== expectation.redirect) {
      issues.push({
        code: 'auth-bootstrap-redirect-mismatch',
        message: `${path} should use redirect=${expectation.redirect}`,
      })
    }
  }

  return issues
}

export async function probeAuthBootstrapEndpoint(baseUrl, probe, options = {}) {
  const headers = new Headers({
    Accept: 'application/json',
  })
  headers.set(
    'X-Client-Fingerprint',
    options.clientFingerprint ?? AUTH_BOOTSTRAP_CLIENT_FINGERPRINT
  )

  if (probe.method !== 'GET') {
    headers.set('Content-Type', 'application/json')
  }

  const contractVersion = options.contractVersion?.trim()
  if (probe.attachContract !== false && contractVersion) {
    headers.set('X-Client-Contract-Version', contractVersion)
  }

  const requestBody =
    probe.body == null || typeof probe.body === 'string'
      ? (probe.body ?? null)
      : JSON.stringify(probe.body)

  attachProbeBrowserContextHeaders(headers, baseUrl, probe)
  await attachProbeSignatureHeaders(headers, baseUrl, probe, requestBody, options.clientCredentials)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), AUTH_BOOTSTRAP_REQUEST_TIMEOUT_MS)
  let response
  let rawBody = ''
  try {
    response = await fetch(new URL(probe.path, baseUrl).toString(), {
      method: probe.method,
      headers,
      body: requestBody,
      redirect: probe.redirect ?? 'follow',
      signal: controller.signal,
    })

    rawBody = await response.text()
  } catch (error) {
    clearTimeout(timer)
    return {
      path: probe.path,
      method: probe.method,
      status: 503,
      ok: false,
      code:
        error instanceof Error && error.name === 'AbortError'
          ? 'UPSTREAM_TIMEOUT'
          : 'UPSTREAM_UNREACHABLE',
      message:
        error instanceof Error && error.name === 'AbortError'
          ? `Auth bootstrap probe timed out after ${AUTH_BOOTSTRAP_REQUEST_TIMEOUT_MS}ms`
          : error instanceof Error
            ? error.message
            : String(error),
      body: null,
    }
  } finally {
    clearTimeout(timer)
  }
  let parsedBody = null
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : null
  } catch {
    parsedBody = null
  }

  const errorMeta = extractAuthBootstrapError(parsedBody, rawBody)
  const fallbackMessage = rawBody.trim().length > 0 ? rawBody.trim() : null

  return {
    path: probe.path,
    method: probe.method,
    status: response.status,
    ok: response.ok,
    code: errorMeta.code,
    message: response.ok ? null : (errorMeta.message ?? fallbackMessage),
    body: parsedBody,
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function probeAuthBootstrapEndpoints(baseUrl, options = {}) {
  const probes = getAuthBootstrapProbeDefinitions()
  const results = []
  let clientCredentials = options.clientCredentials ?? null
  const probeIntervalMs = options.probeIntervalMs ?? AUTH_BOOTSTRAP_PROBE_INTERVAL_MS

  for (const [index, probe] of probes.entries()) {
    const result = await probeAuthBootstrapEndpoint(baseUrl, probe, {
      ...options,
      clientFingerprint: options.clientFingerprint ?? AUTH_BOOTSTRAP_CLIENT_FINGERPRINT,
      clientCredentials,
    })
    results.push(result)

    if (probe.path === '/api/v1/client/init') {
      clientCredentials = extractBootstrapClientCredentials(result.body) ?? clientCredentials
    }

    if (shouldStopAuthBootstrapProbes(result)) {
      break
    }

    if (probeIntervalMs > 0 && index < probes.length - 1) {
      await sleep(probeIntervalMs)
    }
  }

  return results
}
