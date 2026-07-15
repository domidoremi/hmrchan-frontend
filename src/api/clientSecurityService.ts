import { apiClient, ApiError, type RequestConfig } from '@/api/client'
import { requestClientChallenge } from '@/api/clientChallengeBridge'
import { getRandomHex } from '@/utils/crypto'
import { getScreenResolution, getTimezone } from '@/utils/device'
import { getDeviceFingerprint, getDeviceFingerprintMetadata } from '@/utils/fingerprint'
import { shouldEnableClientInit } from '@/utils/clientInit'

export type ClientTrustLevel = 'untrusted' | 'basic' | 'verified'
export type ClientFingerprintSource = 'oss_browser' | 'mobile_local' | 'unknown'
export type ClientType = 'web' | 'mobile' | 'admin'
export type RiskDecision =
  | 'allow'
  | 'challenge_turnstile'
  | 'challenge_mfa_or_passkey'
  | 'deny_obvious_abuse'
  | string

export interface ClientInitPayload {
  client_fingerprint?: string
  fingerprint_source?: ClientFingerprintSource
  fingerprint_components_version?: string
  client_type?: ClientType
  timezone?: string
  screen_resolution?: string
  platform?: string
  timestamp?: number
  nonce?: string
  force_reissue?: boolean
}

export interface ClientInitResponse {
  client_token?: string
  client_secret?: string
  trust_level: ClientTrustLevel
  challenge_required?: boolean
  turnstile_site_key?: string
  expires_in?: number
  expires_at?: string
  canonical_fingerprint?: string
  fingerprint_source?: ClientFingerprintSource
  fingerprint_components_version?: string
  client_type?: ClientType
  risk_score?: number
  risk_decision?: RiskDecision
}

export interface ClientVerifyResponse {
  success: boolean
  trust_level: ClientTrustLevel
  message?: string
  expires_at?: string
}

interface StoredClientCredentials {
  client_token: string
  client_secret?: string
  trust_level?: ClientTrustLevel
  expires_at?: string
  canonical_fingerprint?: string
  fingerprint_source?: ClientFingerprintSource
  fingerprint_components_version?: string
  client_type?: ClientType
  risk_score?: number
  risk_decision?: RiskDecision
  init_summary_updated_at?: number
}

type StoredClientSummary = Omit<StoredClientCredentials, 'client_token' | 'client_secret'>

const STORAGE_KEY = 'momi_client_security'
const CLIENT_INIT_BACKOFF_BASE_MS = 1_000
const CLIENT_INIT_BACKOFF_MAX_MS = 30_000
const CLIENT_CREDENTIAL_EXPIRY_SKEW_MS = 5_000

let ensureInitPromise: Promise<void> | null = null
let initPromise: Promise<ClientInitResponse> | null = null
let inMemoryClientSecret: string | null = null
let clientInitRateLimitError: ApiError | null = null
let clientInitRateLimitFailures = 0
let clientInitBackoffUntil = 0

const publicClientConfig: RequestConfig = {
  skipAuth: true,
  skipErrorToast: true,
}

const clientInitConfig: RequestConfig = {
  ...publicClientConfig,
  skipSecurity: true,
}

function normalizeFingerprintSource(value: unknown): ClientFingerprintSource | undefined {
  return value === 'oss_browser' || value === 'mobile_local' || value === 'unknown'
    ? value
    : undefined
}

function normalizeClientType(value: unknown): ClientType | undefined {
  return value === 'web' || value === 'mobile' || value === 'admin' ? value : undefined
}

function normalizeTrustLevel(value: unknown): ClientTrustLevel | undefined {
  return value === 'untrusted' || value === 'basic' || value === 'verified' ? value : undefined
}

function getStoredCredentials(): StoredClientCredentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredClientCredentials
    if (typeof parsed.client_token !== 'string' || !parsed.client_token.trim()) {
      return null
    }

    const credentials: StoredClientCredentials = {
      client_token: parsed.client_token,
    }
    const storedSecret = parsed.client_secret?.trim()
    if (storedSecret) {
      inMemoryClientSecret ??= storedSecret
    }
    const trustLevel = normalizeTrustLevel(parsed.trust_level)
    if (trustLevel) credentials.trust_level = trustLevel
    if (typeof parsed.expires_at === 'string' && parsed.expires_at.trim()) {
      credentials.expires_at = parsed.expires_at.trim()
    }
    if (typeof parsed.canonical_fingerprint === 'string' && parsed.canonical_fingerprint.trim()) {
      credentials.canonical_fingerprint = parsed.canonical_fingerprint
    }
    const fingerprintSource = normalizeFingerprintSource(parsed.fingerprint_source)
    if (fingerprintSource) credentials.fingerprint_source = fingerprintSource
    if (
      typeof parsed.fingerprint_components_version === 'string' &&
      parsed.fingerprint_components_version.trim()
    ) {
      credentials.fingerprint_components_version = parsed.fingerprint_components_version
    }
    const clientType = normalizeClientType(parsed.client_type)
    if (clientType) credentials.client_type = clientType
    if (typeof parsed.risk_score === 'number' && Number.isFinite(parsed.risk_score)) {
      credentials.risk_score = parsed.risk_score
    }
    if (typeof parsed.risk_decision === 'string' && parsed.risk_decision.trim()) {
      credentials.risk_decision = parsed.risk_decision
    }
    if (
      typeof parsed.init_summary_updated_at === 'number' &&
      Number.isFinite(parsed.init_summary_updated_at)
    ) {
      credentials.init_summary_updated_at = parsed.init_summary_updated_at
    }
    if (storedSecret) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials))
      } catch {
        // The in-memory copy remains usable when storage is read-only.
      }
    }
    return credentials
  } catch {
    return null
  }
}

function storeCredentials(credentials: StoredClientCredentials): void {
  const nextSecret = credentials.client_secret?.trim()
  if (nextSecret) {
    inMemoryClientSecret = nextSecret
  }

  const { client_secret: _clientSecret, ...persistedCredentials } = credentials
  void _clientSecret
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedCredentials))
  } catch {
    // localStorage may be blocked; requests still carry the browser fingerprint.
  }
}

function clearCredentials(): void {
  inMemoryClientSecret = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

function buildStoredClientSummary(response: ClientInitResponse): StoredClientSummary {
  const summary: StoredClientSummary = {
    trust_level: response.trust_level,
  }

  const expiresAt = response.expires_at?.trim()
  if (expiresAt) {
    summary.expires_at = expiresAt
  } else if (typeof response.expires_in === 'number' && response.expires_in > 0) {
    summary.expires_at = new Date(Date.now() + response.expires_in * 1_000).toISOString()
  }

  if (typeof response.canonical_fingerprint === 'string' && response.canonical_fingerprint.trim()) {
    summary.canonical_fingerprint = response.canonical_fingerprint.trim()
  }
  if (response.fingerprint_source) {
    summary.fingerprint_source = response.fingerprint_source
  }
  if (
    typeof response.fingerprint_components_version === 'string' &&
    response.fingerprint_components_version.trim()
  ) {
    summary.fingerprint_components_version = response.fingerprint_components_version.trim()
  }
  if (response.client_type) {
    summary.client_type = response.client_type
  }
  if (typeof response.risk_score === 'number' && Number.isFinite(response.risk_score)) {
    summary.risk_score = response.risk_score
  }
  if (typeof response.risk_decision === 'string' && response.risk_decision.trim()) {
    summary.risk_decision = response.risk_decision.trim()
  }
  if (Object.keys(summary).length > 0) {
    summary.init_summary_updated_at = Date.now()
  }

  return summary
}

function hasExpired(credentials: StoredClientCredentials): boolean {
  if (!credentials.expires_at) return false
  const expiresAt = Date.parse(credentials.expires_at)
  return !Number.isFinite(expiresAt) || expiresAt <= Date.now() + CLIENT_CREDENTIAL_EXPIRY_SKEW_MS
}

function buildReusableClientInitResponse(): ClientInitResponse | null {
  const stored = getStoredCredentials()
  if (!stored || hasExpired(stored) || !inMemoryClientSecret) return null

  return {
    client_token: stored.client_token,
    client_secret: inMemoryClientSecret,
    trust_level: stored.trust_level ?? 'basic',
    ...(stored.expires_at ? { expires_at: stored.expires_at } : {}),
    ...(stored.canonical_fingerprint
      ? { canonical_fingerprint: stored.canonical_fingerprint }
      : {}),
    ...(stored.fingerprint_source ? { fingerprint_source: stored.fingerprint_source } : {}),
    ...(stored.fingerprint_components_version
      ? { fingerprint_components_version: stored.fingerprint_components_version }
      : {}),
    ...(stored.client_type ? { client_type: stored.client_type } : {}),
    ...(stored.risk_score === undefined ? {} : { risk_score: stored.risk_score }),
    ...(stored.risk_decision ? { risk_decision: stored.risk_decision } : {}),
  }
}

function isClientInitRateLimited(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 429
}

function recordClientInitRateLimit(error: ApiError): void {
  clientInitRateLimitFailures += 1
  const delay = Math.min(
    CLIENT_INIT_BACKOFF_BASE_MS * 2 ** (clientInitRateLimitFailures - 1),
    CLIENT_INIT_BACKOFF_MAX_MS
  )
  clientInitBackoffUntil = Date.now() + delay
  clientInitRateLimitError = error
}

function resetClientInitBackoff(): void {
  clientInitRateLimitError = null
  clientInitRateLimitFailures = 0
  clientInitBackoffUntil = 0
}

function buildSkippedClientInitResponse(): ClientInitResponse {
  return {
    trust_level: 'untrusted',
    fingerprint_source: 'unknown',
    client_type: 'web',
  }
}

function persistInitCredentials(response: ClientInitResponse): void {
  const existing = getStoredCredentials()
  const nextClientToken = response.client_token?.trim()
  const nextClientSecret = response.client_secret?.trim()
  const responseSummary = buildStoredClientSummary(response)

  if (nextClientToken) {
    const shouldReuseExistingSecret =
      existing?.client_token === nextClientToken &&
      Boolean(inMemoryClientSecret) &&
      !nextClientSecret
    const clientSecret =
      nextClientSecret || (shouldReuseExistingSecret ? inMemoryClientSecret : undefined)
    storeCredentials({
      ...(existing ?? {}),
      ...responseSummary,
      client_token: nextClientToken,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
    })
    return
  }

  if (existing?.client_token) {
    storeCredentials({
      ...existing,
      ...responseSummary,
    })
  }
}

function isRecoverableVerifyError(error: unknown): error is ApiError {
  if (!(error instanceof ApiError) || error.status !== 400) {
    return false
  }

  const normalizedCode = error.code?.toUpperCase()
  if (normalizedCode === 'INVALID_CLIENT_TOKEN' || normalizedCode === 'CLIENT_TOKEN_EXPIRED') {
    return true
  }

  const rawMessage =
    error.details && typeof error.details === 'object' && 'rawMessage' in error.details
      ? String((error.details as Record<string, unknown>)['rawMessage'] ?? '').toLowerCase()
      : ''

  return rawMessage.includes('missing client token') || rawMessage.includes('invalid client token')
}

async function collectClientInfo(forceReissue?: boolean): Promise<ClientInitPayload> {
  const fingerprint = await getDeviceFingerprintMetadata()
  const platform = navigator.platform || undefined
  const payload: ClientInitPayload = {
    client_fingerprint: fingerprint.value,
    fingerprint_source: fingerprint.source,
    fingerprint_components_version: fingerprint.componentsVersion,
    client_type: 'web',
    timezone: getTimezone(),
    screen_resolution: getScreenResolution(),
    timestamp: Math.floor(Date.now() / 1000),
    nonce: getRandomHex(16),
  }

  if (platform) {
    payload.platform = platform
  }
  if (forceReissue) {
    payload.force_reissue = true
  }

  return payload
}

export const clientSecurityManager = {
  getClientToken(): string | null {
    return getStoredCredentials()?.client_token ?? null
  },

  getClientSecret(): string | null {
    return inMemoryClientSecret
  },

  hasRequestIntegrityCredentials(): boolean {
    const stored = getStoredCredentials()
    return Boolean(stored?.client_token && !hasExpired(stored) && inMemoryClientSecret)
  },

  getFingerprint: getDeviceFingerprint,

  clear: clearCredentials,

  isInitialized(): boolean {
    const stored = getStoredCredentials()
    return Boolean(stored?.client_token && !hasExpired(stored))
  },
}

export const clientSecurityService = {
  async init(
    force?: boolean,
    options?: { promptChallenge?: boolean }
  ): Promise<ClientInitResponse> {
    if (!shouldEnableClientInit(import.meta.env)) {
      if (force) {
        clearCredentials()
      }
      return buildSkippedClientInitResponse()
    }

    if (!force) {
      const reusableResponse = buildReusableClientInitResponse()
      if (reusableResponse) return reusableResponse
    }

    if (clientInitRateLimitError && Date.now() < clientInitBackoffUntil) {
      throw clientInitRateLimitError
    }

    if (initPromise) return initPromise

    const currentInitPromise = (async () => {
      let response: ClientInitResponse
      try {
        response = await apiClient.post<ClientInitResponse>(
          '/client/init',
          await collectClientInfo(force),
          clientInitConfig
        )
        persistInitCredentials(response)
        resetClientInitBackoff()
      } catch (error) {
        if (isClientInitRateLimited(error)) {
          recordClientInitRateLimit(error)
        }
        throw error
      }

      if (response.challenge_required && options?.promptChallenge !== false) {
        window.dispatchEvent(
          new CustomEvent('client:challenge-required', {
            detail: { turnstile_site_key: response.turnstile_site_key },
          })
        )
        void requestClientChallenge(response.turnstile_site_key)
      }

      return response
    })()

    initPromise = currentInitPromise

    try {
      return await currentInitPromise
    } finally {
      if (initPromise === currentInitPromise) {
        initPromise = null
      }
    }
  },

  async verify(turnstileToken: string): Promise<ClientVerifyResponse> {
    try {
      return await apiClient.post<ClientVerifyResponse>(
        '/client/verify',
        { turnstile_token: turnstileToken },
        publicClientConfig
      )
    } catch (error) {
      if (isRecoverableVerifyError(error)) {
        await this.init(true, { promptChallenge: false })
        if (clientSecurityManager.getClientToken()) {
          return apiClient.post<ClientVerifyResponse>(
            '/client/verify',
            { turnstile_token: turnstileToken },
            publicClientConfig
          )
        }
      }
      throw error
    }
  },

  async ensureInitialized(): Promise<void> {
    if (clientSecurityManager.isInitialized()) return
    if (!ensureInitPromise) {
      ensureInitPromise = this.init(false, { promptChallenge: false })
        .then(() => undefined)
        .finally(() => {
          ensureInitPromise = null
        })
    }

    await ensureInitPromise
  },

  async ensureRequestIntegrityCredentials(): Promise<void> {
    if (clientSecurityManager.hasRequestIntegrityCredentials()) return

    if (ensureInitPromise) {
      await ensureInitPromise.catch(() => undefined)
      if (clientSecurityManager.hasRequestIntegrityCredentials()) return
    }

    if (!ensureInitPromise) {
      const integrityInitPromise = (async () => {
        try {
          await this.init(false, { promptChallenge: false })
        } catch (error) {
          if (isClientInitRateLimited(error)) throw error
          // A force reissue below can still recover a successful init that omitted signing credentials.
        }
        if (clientSecurityManager.hasRequestIntegrityCredentials()) {
          return
        }

        await this.init(true, { promptChallenge: false })
        if (!clientSecurityManager.hasRequestIntegrityCredentials()) {
          throw new Error('Missing client signing credentials')
        }
      })()
      const trackedPromise = integrityInitPromise.finally(() => {
        if (ensureInitPromise === trackedPromise) {
          ensureInitPromise = null
        }
      })
      ensureInitPromise = trackedPromise
    }

    await ensureInitPromise
  },
}

export function __resetClientSecurityForTests(): void {
  ensureInitPromise = null
  initPromise = null
  resetClientInitBackoff()
  clearCredentials()
}

export function initClientSecurity(payload: ClientInitPayload = {}): Promise<ClientInitResponse> {
  if (!shouldEnableClientInit(import.meta.env)) {
    if (payload.force_reissue) {
      clearCredentials()
    }
    return Promise.resolve(buildSkippedClientInitResponse())
  }

  if (payload.client_fingerprint) {
    return apiClient.post<ClientInitResponse>(
      '/client/init',
      {
        ...payload,
        fingerprint_source: payload.fingerprint_source ?? 'oss_browser',
        client_type: payload.client_type ?? 'web',
        force_reissue: payload.force_reissue ?? false,
      },
      clientInitConfig
    )
  }

  return clientSecurityService.init(payload.force_reissue, { promptChallenge: false })
}
