import { ApiError } from '@/api'

export type OIDCClientKind = 'web'

export interface OIDCTokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
  id_token?: string
  scope?: string
}

type PendingOIDCRequest = {
  state: string
  nonce: string
  codeVerifier: string
  redirectTo: string
  createdAt: number
}

type StoredOIDCSession = {
  clientKind: OIDCClientKind
  idToken?: string
  createdAt: number
}

export class OIDCAuthError extends Error {
  code: string
  status?: number

  constructor(message: string, code: string, status?: number) {
    super(message)
    this.name = 'OIDCAuthError'
    this.code = code
    this.status = status
  }
}

const OIDC_REQUEST_STORAGE_PREFIX = 'momi_oidc_request:'
const OIDC_SESSION_STORAGE_KEY = 'momi_oidc_session'
const DEFAULT_SCOPE = 'openid profile email'
const DEFAULT_AUTHORITY = 'https://auth.momichan.xyz'
const DEFAULT_REDIRECT_URI = 'https://momichan.xyz/auth/callback'
const DEFAULT_LOGOUT_REDIRECT_URI = 'https://momichan.xyz/auth/logout/callback'
const OIDC_REQUEST_MAX_AGE_MS = 10 * 60 * 1000

type OIDCClientConfig = {
  kind: OIDCClientKind
  authority: string
  clientId: string
  redirectUri: string
  logoutRedirectUri: string
  authorizationEndpoint: string
  tokenEndpoint: string
  endSessionEndpoint: string
  defaultRedirectTo: string
}

function getAuthority(): string {
  return import.meta.env.VITE_OIDC_AUTHORITY?.trim() || DEFAULT_AUTHORITY
}

function getClientConfig(kind: OIDCClientKind): OIDCClientConfig {
  const authority = getAuthority()
  const clientId = import.meta.env.VITE_OIDC_WEB_CLIENT_ID?.trim() || 'hmrchan-web'
  const redirectUri = import.meta.env.VITE_OIDC_WEB_REDIRECT_URI?.trim() || DEFAULT_REDIRECT_URI
  const logoutRedirectUri =
    import.meta.env.VITE_OIDC_WEB_LOGOUT_REDIRECT_URI?.trim() || DEFAULT_LOGOUT_REDIRECT_URI

  return {
    kind,
    authority,
    clientId,
    redirectUri,
    logoutRedirectUri,
    authorizationEndpoint: `${authority}/application/o/authorize/`,
    tokenEndpoint: `${authority}/application/o/token/`,
    endSessionEndpoint: `${authority}/application/o/${clientId}/end-session/`,
    defaultRedirectTo: '/',
  }
}

function getPendingRequestStorageKey(kind: OIDCClientKind): string {
  return `${OIDC_REQUEST_STORAGE_PREFIX}${kind}`
}

function readPendingRequest(kind: OIDCClientKind): PendingOIDCRequest | null {
  try {
    const raw = sessionStorage.getItem(getPendingRequestStorageKey(kind))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingOIDCRequest
    if (
      typeof parsed.state !== 'string' ||
      typeof parsed.nonce !== 'string' ||
      typeof parsed.codeVerifier !== 'string' ||
      typeof parsed.redirectTo !== 'string' ||
      typeof parsed.createdAt !== 'number'
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writePendingRequest(kind: OIDCClientKind, request: PendingOIDCRequest): void {
  sessionStorage.setItem(getPendingRequestStorageKey(kind), JSON.stringify(request))
}

function clearPendingRequest(kind: OIDCClientKind): void {
  sessionStorage.removeItem(getPendingRequestStorageKey(kind))
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((value) => {
    binary += String.fromCharCode(value)
  })
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function randomBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return bytesToBase64Url(bytes)
}

async function sha256Base64Url(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input))
  return bytesToBase64Url(new Uint8Array(digest))
}

function parseCallbackUrl(callbackUrl: string): URL {
  try {
    return new URL(callbackUrl, window.location.origin)
  } catch {
    throw new OIDCAuthError('Invalid OIDC callback URL', 'oidc_callback_invalid')
  }
}

function resolveErrorMessage(code: string, description?: string): string {
  if (description?.trim()) return description.trim()

  switch (code) {
    case 'access_denied':
      return 'OIDC login was canceled'
    case 'oidc_request_missing':
      return 'OIDC login request context was not found'
    case 'oidc_state_mismatch':
      return 'OIDC state validation failed'
    case 'oidc_request_expired':
      return 'OIDC login request expired'
    case 'oidc_callback_invalid':
      return 'OIDC callback is invalid'
    case 'oidc_token_exchange_failed':
      return 'Failed to exchange OIDC authorization code'
    default:
      return 'OIDC login failed'
  }
}

export function isOIDCEnabled(kind: OIDCClientKind = 'web'): boolean {
  if (import.meta.env.VITE_OIDC_ENABLED !== 'true') {
    return false
  }

  const config = getClientConfig(kind)
  return Boolean(config.clientId && config.redirectUri && config.logoutRedirectUri)
}

export async function beginOIDCLogin(
  kind: OIDCClientKind,
  options: {
    redirectTo?: string
    prompt?: 'login' | 'none'
  } = {}
): Promise<void> {
  if (!isOIDCEnabled(kind)) {
    throw new OIDCAuthError('OIDC login is not enabled', 'oidc_disabled')
  }

  const config = getClientConfig(kind)
  const state = randomBase64Url(24)
  const nonce = randomBase64Url(24)
  const codeVerifier = randomBase64Url(64)
  const codeChallenge = await sha256Base64Url(codeVerifier)
  const redirectTo = options.redirectTo?.trim() || config.defaultRedirectTo

  writePendingRequest(kind, {
    state,
    nonce,
    codeVerifier,
    redirectTo,
    createdAt: Date.now(),
  })

  const authorizeUrl = new URL(config.authorizationEndpoint)
  authorizeUrl.searchParams.set('client_id', config.clientId)
  authorizeUrl.searchParams.set('redirect_uri', config.redirectUri)
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('scope', DEFAULT_SCOPE)
  authorizeUrl.searchParams.set('state', state)
  authorizeUrl.searchParams.set('nonce', nonce)
  authorizeUrl.searchParams.set('code_challenge', codeChallenge)
  authorizeUrl.searchParams.set('code_challenge_method', 'S256')
  if (options.prompt) {
    authorizeUrl.searchParams.set('prompt', options.prompt)
  }

  window.location.assign(authorizeUrl.toString())
}

export async function consumeOIDCCallback(
  kind: OIDCClientKind,
  callbackUrl: string
): Promise<{
  redirectTo: string
  tokens: OIDCTokenResponse
}> {
  if (!isOIDCEnabled(kind)) {
    throw new OIDCAuthError('OIDC login is not enabled', 'oidc_disabled')
  }

  const url = parseCallbackUrl(callbackUrl)
  const errorCode = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description') || undefined
  if (errorCode) {
    clearPendingRequest(kind)
    throw new OIDCAuthError(
      resolveErrorMessage(errorCode, errorDescription),
      errorCode,
      errorCode === 'access_denied' ? 400 : undefined
    )
  }

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code || !state) {
    clearPendingRequest(kind)
    throw new OIDCAuthError(resolveErrorMessage('oidc_callback_invalid'), 'oidc_callback_invalid')
  }

  const pending = readPendingRequest(kind)
  if (!pending) {
    throw new OIDCAuthError(resolveErrorMessage('oidc_request_missing'), 'oidc_request_missing')
  }
  if (Date.now() - pending.createdAt > OIDC_REQUEST_MAX_AGE_MS) {
    clearPendingRequest(kind)
    throw new OIDCAuthError(resolveErrorMessage('oidc_request_expired'), 'oidc_request_expired')
  }
  if (pending.state !== state) {
    clearPendingRequest(kind)
    throw new OIDCAuthError(resolveErrorMessage('oidc_state_mismatch'), 'oidc_state_mismatch')
  }

  const config = getClientConfig(kind)
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    code,
    redirect_uri: config.redirectUri,
    code_verifier: pending.codeVerifier,
  })

  let response: Response
  try {
    response = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      credentials: 'omit',
    })
  } catch (error) {
    clearPendingRequest(kind)
    throw new OIDCAuthError(
      error instanceof Error ? error.message : resolveErrorMessage('oidc_token_exchange_failed'),
      'oidc_token_exchange_failed'
    )
  }

  let payload: Record<string, unknown> = {}
  try {
    payload = (await response.json()) as Record<string, unknown>
  } catch {
    // leave as empty object
  }

  if (!response.ok) {
    clearPendingRequest(kind)
    const responseError =
      typeof payload.error === 'string' ? payload.error : 'oidc_token_exchange_failed'
    const description =
      typeof payload.error_description === 'string'
        ? payload.error_description
        : resolveErrorMessage(responseError)
    throw new OIDCAuthError(description, responseError, response.status)
  }

  const accessToken = typeof payload.access_token === 'string' ? payload.access_token.trim() : ''
  const tokenType = typeof payload.token_type === 'string' ? payload.token_type.trim() : ''
  if (!accessToken || !tokenType) {
    clearPendingRequest(kind)
    throw new OIDCAuthError(
      resolveErrorMessage('oidc_token_exchange_failed'),
      'oidc_token_exchange_failed',
      response.status
    )
  }

  clearPendingRequest(kind)

  return {
    redirectTo: pending.redirectTo || config.defaultRedirectTo,
    tokens: {
      access_token: accessToken,
      token_type: tokenType,
      expires_in: typeof payload.expires_in === 'number' ? payload.expires_in : undefined,
      id_token: typeof payload.id_token === 'string' ? payload.id_token : undefined,
      scope: typeof payload.scope === 'string' ? payload.scope : undefined,
    },
  }
}

export function storeOIDCSession(session: StoredOIDCSession): void {
  try {
    localStorage.setItem(OIDC_SESSION_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // ignore storage errors
  }
}

export function getStoredOIDCSession(): StoredOIDCSession | null {
  try {
    const raw = localStorage.getItem(OIDC_SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredOIDCSession
    if (parsed.clientKind !== 'web' || typeof parsed.createdAt !== 'number') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearOIDCSession(): void {
  try {
    localStorage.removeItem(OIDC_SESSION_STORAGE_KEY)
  } catch {
    // ignore storage errors
  }
}

export function buildOIDCLogoutUrl(kind?: OIDCClientKind): string | null {
  const session = getStoredOIDCSession()
  const clientKind = kind ?? session?.clientKind
  if (!clientKind || !isOIDCEnabled(clientKind)) {
    return null
  }

  const config = getClientConfig(clientKind)
  const logoutUrl = new URL(config.endSessionEndpoint)
  logoutUrl.searchParams.set('post_logout_redirect_uri', config.logoutRedirectUri)
  if (session?.idToken) {
    logoutUrl.searchParams.set('id_token_hint', session.idToken)
  }
  return logoutUrl.toString()
}

export function mapOIDCErrorToApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }

  if (error instanceof OIDCAuthError) {
    return new ApiError(error.message, error.status ?? 400, error.code)
  }

  return new ApiError('OIDC login failed', 400, 'oidc_login_failed')
}
