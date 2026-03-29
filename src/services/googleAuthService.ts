import { API_AUTH_URL, apiClient } from '@/api/client'
import type {
  AuthResponse,
  MfaRequiredResponse,
  RiskVerificationChallengeResponse,
} from '@/api/authService'

export type GoogleAuthIntent = 'login' | 'register'

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

function writePendingGoogleAuthRequest(request: PendingGoogleAuthRequest): void {
  try {
    sessionStorage.setItem(GOOGLE_AUTH_REQUEST_STORAGE_KEY, JSON.stringify(request))
  } catch {
    // ignore storage errors
  }
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
  const url = new URL(`${API_AUTH_URL}/auth/google/start`, window.location.origin)
  url.searchParams.set('intent', intent)
  url.searchParams.set('return_to', returnTo)
  return url.toString()
}

export function startGoogleAuth(intent: GoogleAuthIntent, returnTo: string): void {
  const redirectTo = returnTo.trim() || '/'
  writePendingGoogleAuthRequest({
    intent,
    redirectTo,
    createdAt: Date.now(),
  })
  window.location.assign(buildGoogleStartUrl(intent, redirectTo))
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
