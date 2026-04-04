import { apiClient } from '@/api/client'
import type {
  AuthResponse,
  MfaRequiredResponse,
  RiskVerificationChallengeResponse,
} from '@/api/authService'
import { createSecureMessageHandler, getTrustedFrontendOrigins } from '@/utils/security'

export type GoogleAuthIntent = 'login' | 'register'
export type GoogleAuthMode = 'popup' | 'redirect'
export type GooglePopupState = 'idle' | 'opening' | 'waiting' | 'blocked' | 'handling' | 'error'

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
  payload: GooglePopupMessage
}

function createGoogleAuthRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `google-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function buildGooglePopupWindowName(requestId: string): string {
  return `${GOOGLE_AUTH_POPUP_NAME_PREFIX}:${requestId}`
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

export function publishGooglePopupResult(message: GooglePopupMessage): void {
  if (typeof window === 'undefined') return

  const envelope: GooglePopupRelayEnvelope = {
    id: createGoogleAuthRequestId(),
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
  window.location.assign(buildGoogleStartUrl(intent, request.redirectTo))
}

export const startGoogleAuth = startGoogleAuthRedirect

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
    return { status: 'blocked' }
  }

  try {
    popup.focus()
  } catch {
    // ignore focus failures
  }

  return { status: 'opened', popup, requestId: request.requestId }
}

export function waitForGooglePopupResult(
  popup: Window,
  options?: { timeoutMs?: number; requestId?: string }
): { promise: Promise<GooglePopupMessage>; dispose: () => void } {
  let isSettled = false
  let closePollId: number | null = null
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
    if (closePollId !== null) {
      window.clearInterval(closePollId)
      closePollId = null
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

    closePollId = window.setInterval(() => {
      if (popup.closed) {
        settle({
          type: 'google-auth-result',
          requestId: options?.requestId,
          status: 'error',
          error: 'popup_closed',
        })
      }
    }, 320)

    if (options?.timeoutMs) {
      timeoutId = window.setTimeout(() => {
        try {
          popup.close()
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

export async function exchangeGoogleHandoff(payload: {
  handoff_code: string
  device_name?: string
  device_type?: string
}): Promise<GoogleAuthFlowResponse> {
  return apiClient.post<GoogleAuthFlowResponse>('/auth/google/exchange', payload, {
    skipAuth: true,
    skipErrorToast: true,
  })
}
