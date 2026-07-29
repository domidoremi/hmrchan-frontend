import { ApiError, apiClient } from './client'

// Coordinates anonymous client-integrity credentials and challenge recovery.
import { requestClientChallenge } from './clientChallengeBridge'
import type { RequestConfig } from './client'
import { getDeviceFingerprint, getDeviceFingerprintMetadata } from '@/utils/fingerprint'
import { getScreenResolution, getTimezone } from '@/utils/device'
import { getRandomHex } from '@/utils/crypto'
import { reportClientEvent } from '@/utils/clientReporter'

export interface ClientInitRequest {
  client_fingerprint: string
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

export interface ClientVerifyRequest {
  turnstile_token: string
}

export interface ClientVerifyResponse {
  success: boolean
  trust_level: ClientTrustLevel
  message?: string
  expires_at?: string
}

export interface ClientVerifyOptions {
  diagnosticsContext?: 'google-auth'
}

export interface ClientStatusResponse {
  trust_level: ClientTrustLevel
  challenge_required?: boolean
  turnstile_site_key?: string
  expires_at?: string
}

export type ClientTrustLevel = 'untrusted' | 'basic' | 'verified'
export type ClientFingerprintSource = 'oss_browser' | 'mobile_local' | 'unknown'
export type ClientType = 'web' | 'mobile' | 'admin'
export type RiskDecision =
  | 'allow'
  | 'challenge_turnstile'
  | 'challenge_mfa_or_passkey'
  | 'deny_obvious_abuse'
  | string

const STORAGE_KEY = 'momi_client_security'
let ensureInitPromise: Promise<void> | null = null
let initPromise: Promise<ClientInitResponse> | null = null
let initPromiseMode: 'normal' | 'force' | null = null
let inMemoryClientSecret: string | null = null

interface StoredClientCredentials {
  client_token: string
  client_secret?: string
  canonical_fingerprint?: string
  fingerprint_source?: ClientFingerprintSource
  fingerprint_components_version?: string
  client_type?: ClientType
  risk_score?: number
  risk_decision?: RiskDecision
  init_summary_updated_at?: number
}

type StoredClientSummary = Omit<StoredClientCredentials, 'client_token' | 'client_secret'>

function getStoredCredentials(): StoredClientCredentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredClientCredentials
    if (typeof parsed.client_token === 'string' && parsed.client_token.trim()) {
      return {
        client_token: parsed.client_token,
        canonical_fingerprint:
          typeof parsed.canonical_fingerprint === 'string' && parsed.canonical_fingerprint.trim()
            ? parsed.canonical_fingerprint
            : undefined,
        fingerprint_source: normalizeFingerprintSource(parsed.fingerprint_source),
        fingerprint_components_version:
          typeof parsed.fingerprint_components_version === 'string' &&
          parsed.fingerprint_components_version.trim()
            ? parsed.fingerprint_components_version
            : undefined,
        client_type: normalizeClientType(parsed.client_type),
        risk_score:
          typeof parsed.risk_score === 'number' && Number.isFinite(parsed.risk_score)
            ? parsed.risk_score
            : undefined,
        risk_decision:
          typeof parsed.risk_decision === 'string' && parsed.risk_decision.trim()
            ? parsed.risk_decision
            : undefined,
        init_summary_updated_at:
          typeof parsed.init_summary_updated_at === 'number' &&
          Number.isFinite(parsed.init_summary_updated_at)
            ? parsed.init_summary_updated_at
            : undefined,
      }
    }
    return null
  } catch {
    return null
  }
}

function storeCredentials(creds: StoredClientCredentials): void {
  const nextSecret = creds.client_secret?.trim()
  if (nextSecret) {
    inMemoryClientSecret = nextSecret
  }

  // Signing secrets remain memory-only; storage receives the token and non-secret summary.
  const { client_secret: _clientSecret, ...persistedCredentials } = creds
  void _clientSecret
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedCredentials))
  } catch {
    // Storage availability is optional; the in-memory secret still supports this session.
  }
}

function normalizeFingerprintSource(value: unknown): ClientFingerprintSource | undefined {
  return value === 'oss_browser' || value === 'mobile_local' || value === 'unknown'
    ? value
    : undefined
}

function normalizeClientType(value: unknown): ClientType | undefined {
  return value === 'web' || value === 'mobile' || value === 'admin' ? value : undefined
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
  const summary: StoredClientSummary = {}

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

function persistInitCredentials(response: ClientInitResponse): void {
  const existing = getStoredCredentials()
  const nextClientToken = response.client_token?.trim()
  const nextClientSecret = response.client_secret?.trim()
  const responseSummary = buildStoredClientSummary(response)

  if (nextClientToken) {
    const shouldReuseExistingSecret =
      existing?.client_token === nextClientToken && inMemoryClientSecret && !nextClientSecret
    storeCredentials({
      ...(existing ?? {}),
      ...responseSummary,
      client_token: nextClientToken,
      client_secret:
        nextClientSecret ||
        (shouldReuseExistingSecret ? (inMemoryClientSecret ?? undefined) : undefined),
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
    typeof error.details?.rawMessage === 'string' ? error.details.rawMessage.toLowerCase() : ''

  return rawMessage.includes('missing client token') || rawMessage.includes('invalid client token')
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
    return Boolean(stored?.client_token && inMemoryClientSecret)
  },

  getFingerprint: getDeviceFingerprint,

  clear: clearCredentials,

  isInitialized(): boolean {
    return this.getClientToken() !== null
  },
}

const publicClientConfig: RequestConfig = {
  skipAuth: true,
  skipErrorToast: true,
}

const clientInitConfig: RequestConfig = {
  ...publicClientConfig,
  skipSecurity: true,
}

async function collectClientInfo(forceReissue?: boolean): Promise<ClientInitRequest> {
  const fingerprint = await getDeviceFingerprintMetadata()
  const platform = navigator.platform || undefined

  const payload: ClientInitRequest = {
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

export const clientSecurityService = {
  async init(
    force?: boolean,
    options?: { promptChallenge?: boolean }
  ): Promise<ClientInitResponse> {
    const requestedMode: 'normal' | 'force' = force ? 'force' : 'normal'

    // Forced initialization supersedes a normal request; normal callers share in-flight work.
    if (initPromise && (initPromiseMode === 'force' || requestedMode === 'normal')) {
      return initPromise
    }

    const currentInitPromise = (async () => {
      if (force) {
        clearCredentials()
      }
      const payload = await collectClientInfo(force)
      const response = await apiClient.post<ClientInitResponse>(
        '/client/init',
        payload,
        clientInitConfig
      )

      // Persist the token before challenge dispatch so follow-up requests can be signed.
      persistInitCredentials(response)

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
    initPromiseMode = requestedMode

    try {
      return await currentInitPromise
    } finally {
      if (initPromise === currentInitPromise) {
        initPromise = null
        initPromiseMode = null
      }
    }
  },

  async verify(
    turnstileToken: string,
    options: ClientVerifyOptions = {}
  ): Promise<ClientVerifyResponse> {
    try {
      return await apiClient.post<ClientVerifyResponse>(
        '/client/verify',
        { turnstile_token: turnstileToken },
        publicClientConfig
      )
    } catch (error) {
      if (isRecoverableVerifyError(error)) {
        // A single forced re-initialization recovers expired tokens; later failures propagate.
        await this.init(true, { promptChallenge: false })
        if (clientSecurityManager.getClientToken()) {
          const result = await apiClient.post<ClientVerifyResponse>(
            '/client/verify',
            { turnstile_token: turnstileToken },
            publicClientConfig
          )
          if (options.diagnosticsContext === 'google-auth') {
            reportClientEvent(
              'google.challenge.verify_reinit_recovered',
              {
                errorCode: error.code ?? null,
                recoveredTrustLevel: result.trust_level,
              },
              {
                category: 'security',
                severity: 'warn',
                requiresAnalyticsConsent: false,
              }
            )
          }
          return result
        }
      }
      throw error
    }
  },

  async getStatus(): Promise<ClientStatusResponse> {
    return apiClient.get<ClientStatusResponse>('/client/status', publicClientConfig)
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
    if (!ensureInitPromise) {
      ensureInitPromise = (async () => {
        await this.init(false, { promptChallenge: false })
        if (clientSecurityManager.hasRequestIntegrityCredentials()) {
          return
        }

        await this.init(true, { promptChallenge: false })
        if (!clientSecurityManager.hasRequestIntegrityCredentials()) {
          throw new Error('Missing client signing credentials')
        }
      })().finally(() => {
        ensureInitPromise = null
      })
    }

    await ensureInitPromise
  },
}
