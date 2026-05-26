import { apiClient, ApiError, type RequestConfig } from '@/api/client'
import { requestClientChallenge } from '@/api/clientChallengeBridge'
import { getRandomHex } from '@/utils/crypto'
import { getScreenResolution, getTimezone } from '@/utils/device'
import { getDeviceFingerprint, getDeviceFingerprintMetadata } from '@/utils/fingerprint'

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

let ensureInitPromise: Promise<void> | null = null
let initPromise: Promise<ClientInitResponse> | null = null
let initPromiseMode: 'normal' | 'force' | null = null
let inMemoryClientSecret: string | null = null

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

function getStoredCredentials(): StoredClientCredentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredClientCredentials
    if (typeof parsed.client_token !== 'string' || !parsed.client_token.trim()) {
      return null
    }

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
    error.details && typeof error.details === 'object' && 'rawMessage' in error.details
      ? String((error.details as Record<string, unknown>).rawMessage ?? '').toLowerCase()
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
    return Boolean(stored?.client_token && inMemoryClientSecret)
  },

  getFingerprint: getDeviceFingerprint,

  clear: clearCredentials,

  isInitialized(): boolean {
    return this.getClientToken() !== null
  },
}

export const clientSecurityService = {
  async init(
    force?: boolean,
    options?: { promptChallenge?: boolean }
  ): Promise<ClientInitResponse> {
    const requestedMode: 'normal' | 'force' = force ? 'force' : 'normal'
    if (initPromise && (initPromiseMode === 'force' || requestedMode === 'normal')) {
      return initPromise
    }

    const currentInitPromise = (async () => {
      if (force) {
        clearCredentials()
      }

      const response = await apiClient.post<ClientInitResponse>(
        '/client/init',
        await collectClientInfo(force),
        clientInitConfig
      )
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
        } catch {
          // A force reissue below can still recover signing credentials after normal init is throttled.
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

export function initClientSecurity(payload: ClientInitPayload = {}): Promise<ClientInitResponse> {
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
