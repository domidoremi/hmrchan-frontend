import {
  type AuthResponse,
  type MfaRequiredResponse,
  type RiskVerificationChallengeResponse,
} from '@/api/authService'
import { clientSecurityService } from '@/api/clientSecurityService'
import { ApiError, apiClient } from '@/api/client'
import {
  createSecureMessageHandler,
  getTrustedFrontendOrigins,
  resolveTrustedFrontendTargetOrigin,
  safePostMessage,
} from '@/utils/security'
import { getTurnstileErrorMessageKey } from '@/utils/turnstile'
import { reportClientEvent } from '@/utils/clientReporter'

export type GoogleAuthIntent = 'login' | 'register'
export type GoogleAuthMode = 'popup' | 'redirect'
export type GooglePopupState =
  | 'idle'
  | 'opening'
  | 'waiting'
  | 'recovery'
  | 'blocked'
  | 'handling'
  | 'error'

export interface GooglePopupMessage {
  type: 'google-auth-result'
  requestId?: string
  status: 'success' | 'error'
  handoffCode?: string
  error?: string
  redirectTo?: string
  intent?: GoogleAuthIntent
}

export type GoogleAuthFlowResponse =
  | AuthResponse
  | RiskVerificationChallengeResponse
  | MfaRequiredResponse

type PendingGoogleAuthRequest = {
  requestId: string
  mode: GoogleAuthMode
  intent: GoogleAuthIntent
  redirectTo: string
  createdAt: number
}

const GOOGLE_AUTH_REQUEST_STORAGE_KEY = 'momi_google_auth_request'
const GOOGLE_AUTH_POPUP_NAME_PREFIX = 'momi-google-auth'
const GOOGLE_AUTH_POPUP_RELAY_CHANNEL = 'momi-google-auth-relay'
const GOOGLE_AUTH_POPUP_RELAY_STORAGE_KEY = '__momi_google_auth_popup_result__'
const GOOGLE_AUTH_POPUP_WIDTH = 34
const GOOGLE_AUTH_POPUP_HEIGHT = 42
const GOOGLE_AUTH_START_PATH = '/api/v1/auth/google/start'
type GooglePopupRelayEnvelope = {
  id: string
  publishedAt: number
  payload: GooglePopupMessage
}

type GooglePopupWaitOptions = {
  timeoutMs?: number
  requestId?: string
  resolvePopup?: () => Window | null
}

export type GooglePopupFlowResult =
  | {
      status: 'opened'
      popup: Window
      requestId: string
      promise: Promise<GooglePopupMessage>
      dispose: () => void
    }
  | {
      status: 'blocked'
    }

export type GooglePopupBridgeOptions = {
  search?: string
  windowName?: string
  opener?: Window | null
  pendingRequest?: PendingGoogleAuthRequest | null
  targetOrigin?: string
}

export type GooglePopupBridgeResult =
  | {
      handled: true
      message: GooglePopupMessage
    }
  | {
      handled: false
      message?: undefined
    }

export type GoogleAuthSecurityError = {
  messageKey: string
  detail: string
  code?: string
}

export type GoogleAuthHandoffPreparationResult =
  | {
      status: 'ready'
      handoffCode: string
    }
  | {
      status: 'challenge-required'
      handoffCode: string
      siteKey: string
    }
  | ({
      status: 'error'
    } & GoogleAuthSecurityError)

function createGoogleAuthRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `google-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function buildGooglePopupWindowName(requestId: string): string {
  return `${GOOGLE_AUTH_POPUP_NAME_PREFIX}:${requestId}`
}

function readGoogleAuthCallbackPayload(
  search: string = typeof window !== 'undefined' ? window.location.search : ''
): { handoffCode: string; error: string } {
  const params = new URLSearchParams(search)
  return {
    handoffCode: params.get('handoff_code')?.trim() ?? '',
    error: params.get('error')?.trim() ?? '',
  }
}

export function resolveGoogleAuthPopupRequestIdFromWindowName(name?: string): string | null {
  const candidate = (name ?? (typeof window !== 'undefined' ? window.name : '')).trim()
  const prefix = `${GOOGLE_AUTH_POPUP_NAME_PREFIX}:`

  if (!candidate.startsWith(prefix)) {
    return null
  }

  const requestId = candidate.slice(prefix.length).trim()
  return requestId || null
}

export function isGoogleAuthPopupCandidate(
  options: Pick<GooglePopupBridgeOptions, 'windowName' | 'opener' | 'pendingRequest'> = {}
): boolean {
  const pendingRequest =
    options.pendingRequest === undefined ? getPendingGoogleAuthRequest() : options.pendingRequest
  const opener =
    options.opener === undefined
      ? typeof window !== 'undefined'
        ? window.opener
        : null
      : options.opener

  if (opener) return true
  if (resolveGoogleAuthPopupRequestIdFromWindowName(options.windowName)) return true
  return pendingRequest?.mode === 'popup'
}

function isGooglePopupRelayEnvelope(value: unknown): value is GooglePopupRelayEnvelope {
  if (!value || typeof value !== 'object') return false

  const envelope = value as Partial<GooglePopupRelayEnvelope>
  return typeof envelope.id === 'string' && isGooglePopupMessage(envelope.payload)
}

function shouldAcceptGooglePopupMessage(
  message: GooglePopupMessage,
  expectedRequestId?: string
): boolean {
  if (!expectedRequestId) return true
  if (!message.requestId) return true
  return message.requestId === expectedRequestId
}

function subscribeToGooglePopupRelay(
  handler: (message: GooglePopupMessage) => void,
  expectedRequestId?: string
): () => void {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  let channel: BroadcastChannel | null = null

  const handleRelayEnvelope = (value: unknown) => {
    if (!isGooglePopupRelayEnvelope(value)) return
    if (!shouldAcceptGooglePopupMessage(value.payload, expectedRequestId)) return
    handler(value.payload)
  }

  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(GOOGLE_AUTH_POPUP_RELAY_CHANNEL)
    channel.addEventListener('message', (event: MessageEvent<unknown>) => {
      handleRelayEnvelope(event.data)
    })
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== GOOGLE_AUTH_POPUP_RELAY_STORAGE_KEY || !event.newValue) return

    try {
      handleRelayEnvelope(JSON.parse(event.newValue))
    } catch {
      // ignore malformed relay payloads
    }
  }

  window.addEventListener('storage', onStorage)

  return () => {
    window.removeEventListener('storage', onStorage)
    channel?.close()
  }
}

function readGooglePopupRelayEnvelope(): GooglePopupRelayEnvelope | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = localStorage.getItem(GOOGLE_AUTH_POPUP_RELAY_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<GooglePopupRelayEnvelope>
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.publishedAt !== 'number' ||
      !isGooglePopupMessage(parsed.payload)
    ) {
      return null
    }

    return {
      id: parsed.id,
      publishedAt: parsed.publishedAt,
      payload: parsed.payload,
    }
  } catch {
    return null
  }
}

function readStoredGooglePopupResult(expectedRequestId?: string): GooglePopupMessage | null {
  const envelope = readGooglePopupRelayEnvelope()
  if (!envelope) return null
  if (!shouldAcceptGooglePopupMessage(envelope.payload, expectedRequestId)) return null
  return envelope.payload
}

export function publishGooglePopupResult(message: GooglePopupMessage): void {
  if (typeof window === 'undefined') return

  const envelope: GooglePopupRelayEnvelope = {
    id: createGoogleAuthRequestId(),
    publishedAt: Date.now(),
    payload: message,
  }

  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(GOOGLE_AUTH_POPUP_RELAY_CHANNEL)
    channel.postMessage(envelope)
    channel.close()
  }

  try {
    localStorage.setItem(GOOGLE_AUTH_POPUP_RELAY_STORAGE_KEY, JSON.stringify(envelope))
  } catch {
    // ignore storage errors
  }
}

function writePendingGoogleAuthRequest(request: PendingGoogleAuthRequest): void {
  try {
    sessionStorage.setItem(GOOGLE_AUTH_REQUEST_STORAGE_KEY, JSON.stringify(request))
  } catch {
    // ignore storage errors
  }
}

function normalizeGoogleReturnTo(returnTo: string): string {
  return returnTo.trim() || '/'
}

function persistPendingGoogleAuthRequest(
  intent: GoogleAuthIntent,
  returnTo: string,
  mode: GoogleAuthMode
): PendingGoogleAuthRequest {
  const redirectTo = normalizeGoogleReturnTo(returnTo)
  const request: PendingGoogleAuthRequest = {
    requestId: createGoogleAuthRequestId(),
    mode,
    intent,
    redirectTo,
    createdAt: Date.now(),
  }

  writePendingGoogleAuthRequest(request)

  return request
}

export function getPendingGoogleAuthRequest(): PendingGoogleAuthRequest | null {
  try {
    const raw = sessionStorage.getItem(GOOGLE_AUTH_REQUEST_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<PendingGoogleAuthRequest>
    if (
      (parsed.intent !== 'login' && parsed.intent !== 'register') ||
      typeof parsed.redirectTo !== 'string' ||
      typeof parsed.createdAt !== 'number'
    ) {
      return null
    }

    return {
      requestId:
        typeof parsed.requestId === 'string' && parsed.requestId.trim()
          ? parsed.requestId.trim()
          : createGoogleAuthRequestId(),
      mode: parsed.mode === 'popup' || parsed.mode === 'redirect' ? parsed.mode : 'redirect',
      intent: parsed.intent,
      redirectTo: parsed.redirectTo,
      createdAt: parsed.createdAt,
    }
  } catch {
    return null
  }
}

export function clearPendingGoogleAuthRequest(): void {
  try {
    sessionStorage.removeItem(GOOGLE_AUTH_REQUEST_STORAGE_KEY)
  } catch {
    // ignore storage errors
  }
}

export function resolveGooglePopupBridgeMessage(
  options: Pick<
    GooglePopupBridgeOptions,
    'search' | 'windowName' | 'opener' | 'pendingRequest'
  > = {}
): GooglePopupMessage | null {
  const { handoffCode, error } = readGoogleAuthCallbackPayload(options.search)
  if (!handoffCode && !error) {
    return null
  }

  const pendingRequest =
    options.pendingRequest === undefined ? getPendingGoogleAuthRequest() : options.pendingRequest
  if (!isGoogleAuthPopupCandidate({ ...options, pendingRequest })) {
    return null
  }

  const requestId =
    pendingRequest?.requestId || resolveGoogleAuthPopupRequestIdFromWindowName(options.windowName)

  if (handoffCode) {
    return {
      type: 'google-auth-result',
      requestId: requestId || undefined,
      status: 'success',
      handoffCode,
      redirectTo: pendingRequest?.redirectTo,
      intent: pendingRequest?.intent,
    }
  }

  return {
    type: 'google-auth-result',
    requestId: requestId || undefined,
    status: 'error',
    error: error || 'missing_handoff_code',
    redirectTo: pendingRequest?.redirectTo,
    intent: pendingRequest?.intent,
  }
}

export function bridgeGooglePopupResult(
  options: GooglePopupBridgeOptions = {}
): GooglePopupBridgeResult {
  const message = resolveGooglePopupBridgeMessage(options)
  if (!message) {
    return { handled: false }
  }

  publishGooglePopupResult(message)

  const opener =
    options.opener === undefined
      ? typeof window !== 'undefined'
        ? window.opener
        : null
      : options.opener
  if (opener) {
    safePostMessage(opener, message, options.targetOrigin || resolveTrustedFrontendTargetOrigin())
  }

  return {
    handled: true,
    message,
  }
}

function buildGoogleStartUrl(intent: GoogleAuthIntent, returnTo: string): string {
  const url = new URL(GOOGLE_AUTH_START_PATH, window.location.origin)
  url.searchParams.set('intent', intent)
  url.searchParams.set('return_to', returnTo)
  return url.toString()
}

function buildPopupFeatures(): string {
  const popupWidth = Math.round(GOOGLE_AUTH_POPUP_WIDTH * 16)
  const popupHeight = Math.round(GOOGLE_AUTH_POPUP_HEIGHT * 16)
  const viewportWidth = window.outerWidth || window.innerWidth || popupWidth
  const viewportHeight = window.outerHeight || window.innerHeight || popupHeight
  const viewportLeft = window.screenX ?? window.screenLeft ?? 0
  const viewportTop = window.screenY ?? window.screenTop ?? 0
  const left = Math.max(viewportLeft + (viewportWidth - popupWidth) / 2, 0)
  const top = Math.max(viewportTop + (viewportHeight - popupHeight) / 2, 0)

  return [
    'popup=yes',
    'noopener=no',
    'noreferrer=no',
    'resizable=yes',
    'scrollbars=yes',
    `width=${popupWidth}`,
    `height=${popupHeight}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
  ].join(',')
}

let redirectToGoogleAuthStart = (url: string) => {
  window.location.assign(url)
}

export function prefersGoogleAuthPopup(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches
  const compactViewport = window.matchMedia('(max-width: 48rem)').matches
  return !hasCoarsePointer && !compactViewport
}

export function isGooglePopupMessage(data: unknown): data is GooglePopupMessage {
  if (!data || typeof data !== 'object') return false

  const message = data as Partial<GooglePopupMessage>
  if (message.type !== 'google-auth-result') return false
  if (message.status !== 'success' && message.status !== 'error') return false
  if (message.requestId !== undefined && typeof message.requestId !== 'string') return false
  if (message.intent && message.intent !== 'login' && message.intent !== 'register') return false
  if (message.handoffCode !== undefined && typeof message.handoffCode !== 'string') return false
  if (message.error !== undefined && typeof message.error !== 'string') return false
  if (message.redirectTo !== undefined && typeof message.redirectTo !== 'string') return false
  return true
}

export function mapGooglePopupError(error?: string): string {
  switch (error) {
    case 'access_denied':
      return 'auth.error.googleAccessDenied'
    case 'popup_blocked':
      return 'auth.error.googlePopupBlocked'
    case 'popup_closed':
      return 'auth.error.googlePopupClosed'
    case 'missing_handoff_code':
      return 'auth.error.callbackMissingHandoffCode'
    default:
      return 'auth.error.googleLoginFailed'
  }
}

export function startGoogleAuthRedirect(intent: GoogleAuthIntent, returnTo: string): void {
  const request = persistPendingGoogleAuthRequest(intent, returnTo, 'redirect')
  redirectToGoogleAuthStart(buildGoogleStartUrl(intent, request.redirectTo))
}

export const startGoogleAuth = startGoogleAuthRedirect

export function setGoogleAuthRedirectHandlerForTesting(
  handler: ((url: string) => void) | null
): void {
  redirectToGoogleAuthStart =
    handler ??
    ((url: string) => {
      window.location.assign(url)
    })
}

export function openGoogleAuthPopup(
  intent: GoogleAuthIntent,
  returnTo: string
): { status: 'opened'; popup: Window; requestId: string } | { status: 'blocked' } {
  const request = persistPendingGoogleAuthRequest(intent, returnTo, 'popup')
  const popup = window.open(
    buildGoogleStartUrl(intent, request.redirectTo),
    buildGooglePopupWindowName(request.requestId),
    buildPopupFeatures()
  )

  if (!popup) {
    clearPendingGoogleAuthRequest()
    return { status: 'blocked' }
  }

  try {
    popup.focus()
  } catch {
    // ignore focus failures
  }

  return { status: 'opened', popup, requestId: request.requestId }
}

function createGooglePopupWaitHandle(options?: GooglePopupWaitOptions): {
  promise: Promise<GooglePopupMessage>
  dispose: () => void
} {
  let isSettled = false
  let timeoutId: number | null = null
  let removeMessageHandler: (() => void) | null = null
  let removeRelayHandler: (() => void) | null = null

  const cleanup = () => {
    if (removeMessageHandler) {
      removeMessageHandler()
      removeMessageHandler = null
    }
    if (removeRelayHandler) {
      removeRelayHandler()
      removeRelayHandler = null
    }
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  const promise = new Promise<GooglePopupMessage>((resolve) => {
    const settle = (message: GooglePopupMessage) => {
      if (isSettled) return
      isSettled = true
      cleanup()
      resolve(message)
    }

    removeMessageHandler = createSecureMessageHandler<GooglePopupMessage>(
      (message) => {
        if (!shouldAcceptGooglePopupMessage(message, options?.requestId)) return
        settle(message)
      },
      {
        allowedOrigins: getTrustedFrontendOrigins(),
        validateData: isGooglePopupMessage,
      }
    )
    removeRelayHandler = subscribeToGooglePopupRelay(
      (message) => settle(message),
      options?.requestId
    )

    const storedResult = readStoredGooglePopupResult(options?.requestId)
    if (storedResult) {
      settle(storedResult)
      return
    }

    if (options?.timeoutMs) {
      timeoutId = window.setTimeout(() => {
        try {
          options.resolvePopup?.()?.close()
        } catch {
          // ignore close failures
        }

        settle({
          type: 'google-auth-result',
          requestId: options?.requestId,
          status: 'error',
          error: 'popup_closed',
        })
      }, options.timeoutMs)
    }
  })

  return {
    promise,
    dispose: cleanup,
  }
}

export function waitForGooglePopupResult(
  popup: Window,
  options?: { timeoutMs?: number; requestId?: string }
): { promise: Promise<GooglePopupMessage>; dispose: () => void } {
  return createGooglePopupWaitHandle({
    ...options,
    resolvePopup: () => popup,
  })
}

export function openGoogleAuthPopupFlow(
  intent: GoogleAuthIntent,
  returnTo: string,
  options?: { timeoutMs?: number }
): GooglePopupFlowResult {
  const request = persistPendingGoogleAuthRequest(intent, returnTo, 'popup')
  let popup: Window | null = null

  const pending = createGooglePopupWaitHandle({
    requestId: request.requestId,
    timeoutMs: options?.timeoutMs,
    resolvePopup: () => popup,
  })

  popup = window.open(
    buildGoogleStartUrl(intent, request.redirectTo),
    buildGooglePopupWindowName(request.requestId),
    buildPopupFeatures()
  )

  if (!popup) {
    pending.dispose()
    clearPendingGoogleAuthRequest()
    return { status: 'blocked' }
  }

  try {
    popup.focus()
  } catch {
    // ignore focus failures
  }

  return {
    status: 'opened',
    popup,
    requestId: request.requestId,
    promise: pending.promise,
    dispose: pending.dispose,
  }
}

export function resolveGoogleAuthSecurityError(error: unknown): GoogleAuthSecurityError {
  const apiError = error instanceof ApiError ? error : null
  const detail = error instanceof Error ? error.message : ''

  switch (apiError?.code) {
    case 'CHALLENGE_REQUIRED':
    case 'TURNSTILE_REQUIRED':
    case 'TURNSTILE_TOKEN_MISSING':
      return {
        messageKey: 'auth.error.turnstileRequired',
        detail,
        code: apiError.code,
      }
    case 'TURNSTILE_FAILED':
    case 'TURNSTILE_VERIFICATION_FAILED':
      return {
        messageKey: 'auth.error.turnstileFailed',
        detail,
        code: apiError.code,
      }
    case 'REQUEST_SIGNATURE_REQUIRED':
    case 'INVALID_SIGNATURE':
      return {
        messageKey: 'error.server.invalidSignature',
        detail,
        code: apiError.code,
      }
    case 'INVALID_CLIENT_TOKEN':
      return {
        messageKey: 'error.server.invalidClientToken',
        detail,
        code: apiError.code,
      }
    case 'CLIENT_TOKEN_EXPIRED':
      return {
        messageKey: 'error.server.clientTokenExpired',
        detail,
        code: apiError.code,
      }
    case 'REQUEST_TIMESTAMP_INVALID':
      return {
        messageKey: 'error.server.invalidTimestamp',
        detail,
        code: apiError.code,
      }
    case 'REQUEST_EXPIRED':
      return {
        messageKey: 'error.server.requestExpired',
        detail,
        code: apiError.code,
      }
    case 'REQUEST_ORIGIN_NOT_AUTHORIZED':
      return {
        messageKey: 'error.server.requestOriginNotAuthorized',
        detail,
        code: apiError.code,
      }
    default:
      return {
        messageKey:
          error instanceof Error
            ? getTurnstileErrorMessageKey(error)
            : 'auth.error.turnstileFailed',
        detail,
        code: apiError?.code,
      }
  }
}

export async function prepareGoogleAuthHandoff(
  handoffCode: string,
  fallbackSiteKey = ''
): Promise<GoogleAuthHandoffPreparationResult> {
  const normalizedHandoffCode = handoffCode.trim()
  if (!normalizedHandoffCode) {
    return {
      status: 'error',
      messageKey: 'auth.error.callbackMissingHandoffCode',
      detail: '',
    }
  }

  let resolvedSiteKey = fallbackSiteKey.trim()

  try {
    let initResponse = await clientSecurityService.init(false, { promptChallenge: false })
    resolvedSiteKey = initResponse.turnstile_site_key?.trim() || resolvedSiteKey

    if (
      initResponse.challenge_required &&
      (!initResponse.client_token || !initResponse.client_token.trim())
    ) {
      reportClientEvent(
        'google.challenge.init_missing_client_token',
        {
          challengeRequired: true,
          hadFallbackSiteKey: Boolean(resolvedSiteKey),
        },
        {
          category: 'security',
          severity: 'warn',
          requiresAnalyticsConsent: false,
        }
      )
      initResponse = await clientSecurityService.init(true, { promptChallenge: false })
      resolvedSiteKey = initResponse.turnstile_site_key?.trim() || resolvedSiteKey
    }

    if (initResponse.challenge_required) {
      const siteKey = initResponse.turnstile_site_key?.trim() || resolvedSiteKey

      if (!siteKey) {
        return {
          status: 'error',
          messageKey: 'auth.error.turnstileFailed',
          detail: 'Missing Turnstile site key for Google auth challenge.',
        }
      }

      if (!initResponse.client_token?.trim()) {
        return {
          status: 'error',
          messageKey: 'error.server.invalidClientToken',
          detail: 'Missing client token for Google auth challenge.',
        }
      }

      return {
        status: 'challenge-required',
        handoffCode: normalizedHandoffCode,
        siteKey,
      }
    }

    return {
      status: 'ready',
      handoffCode: normalizedHandoffCode,
    }
  } catch (error) {
    return {
      status: 'error',
      ...resolveGoogleAuthSecurityError(error),
    }
  }
}

export async function exchangeGoogleHandoff(payload: {
  handoff_code: string
  device_name?: string
  device_type?: string
}): Promise<GoogleAuthFlowResponse> {
  return apiClient.post<GoogleAuthFlowResponse>('/auth/google/exchange', payload, {
    skipAuth: true,
    skipErrorToast: true,
    skipChallengeRetry: true,
  })
}
