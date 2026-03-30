import { API_AUTH_URL, apiClient } from '@/api/client'
import type {
  AuthResponse,
  MfaRequiredResponse,
  RiskVerificationChallengeResponse,
} from '@/api/authService'
import { createSecureMessageHandler } from '@/utils/security'

export type GoogleAuthIntent = 'login' | 'register'
export type GooglePopupState = 'idle' | 'opening' | 'waiting' | 'blocked' | 'handling' | 'error'

export interface GooglePopupMessage {
  type: 'google-auth-result'
  status: 'success' | 'error'
  handoffCode?: string
  error?: string
  redirectTo?: string
  intent?: GoogleAuthIntent
}

export interface GoogleLinkRequiredResponse {
  link_required: true
  pending_google_link_token: string
  masked_email: string
  expires_in?: number
  return_to?: string
}

export type GoogleAuthFlowResponse =
  | AuthResponse
  | GoogleLinkRequiredResponse
  | RiskVerificationChallengeResponse
  | MfaRequiredResponse

type PendingGoogleAuthRequest = {
  intent: GoogleAuthIntent
  redirectTo: string
  createdAt: number
}

const GOOGLE_AUTH_REQUEST_STORAGE_KEY = 'momi_google_auth_request'
const GOOGLE_AUTH_POPUP_NAME = 'momi-google-auth'
const GOOGLE_AUTH_POPUP_WIDTH = 34
const GOOGLE_AUTH_POPUP_HEIGHT = 42
const GOOGLE_AUTH_START_PATH = '/api/auth/google/start'

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

function persistPendingGoogleAuthRequest(intent: GoogleAuthIntent, returnTo: string): string {
  const redirectTo = normalizeGoogleReturnTo(returnTo)

  writePendingGoogleAuthRequest({
    intent,
    redirectTo,
    createdAt: Date.now(),
  })

  return redirectTo
}

export function getPendingGoogleAuthRequest(): PendingGoogleAuthRequest | null {
  try {
    const raw = sessionStorage.getItem(GOOGLE_AUTH_REQUEST_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as PendingGoogleAuthRequest
    if (
      (parsed.intent !== 'login' && parsed.intent !== 'register') ||
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
  const redirectTo = persistPendingGoogleAuthRequest(intent, returnTo)
  window.location.assign(buildGoogleStartUrl(intent, redirectTo))
}

export const startGoogleAuth = startGoogleAuthRedirect

export function openGoogleAuthPopup(
  intent: GoogleAuthIntent,
  returnTo: string
): { status: 'opened'; popup: Window } | { status: 'blocked' } {
  const redirectTo = persistPendingGoogleAuthRequest(intent, returnTo)
  const popup = window.open(
    buildGoogleStartUrl(intent, redirectTo),
    GOOGLE_AUTH_POPUP_NAME,
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

  return { status: 'opened', popup }
}

export function waitForGooglePopupResult(
  popup: Window,
  options?: { timeoutMs?: number }
): { promise: Promise<GooglePopupMessage>; dispose: () => void } {
  let isSettled = false
  let closePollId: number | null = null
  let timeoutId: number | null = null
  let removeMessageHandler: (() => void) | null = null

  const cleanup = () => {
    if (removeMessageHandler) {
      removeMessageHandler()
      removeMessageHandler = null
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
      (message) => settle(message),
      {
        allowedOrigins: [window.location.origin],
        validateData: isGooglePopupMessage,
      }
    )

    closePollId = window.setInterval(() => {
      if (popup.closed) {
        settle({
          type: 'google-auth-result',
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
    baseUrl: API_AUTH_URL,
    skipAuth: true,
    skipErrorToast: true,
  })
}

export async function confirmGoogleLink(payload: {
  pending_google_link_token: string
  verification_code: string
  device_name?: string
  device_type?: string
}): Promise<AuthResponse | RiskVerificationChallengeResponse | MfaRequiredResponse> {
  return apiClient.post<AuthResponse | RiskVerificationChallengeResponse | MfaRequiredResponse>(
    '/auth/google/confirm-link',
    payload,
    {
      baseUrl: API_AUTH_URL,
      skipAuth: true,
      skipErrorToast: true,
    }
  )
}
