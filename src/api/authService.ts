import { apiClient } from '@/api/client'

export interface AuthSessionSummary {
  authenticated?: boolean
  user?: unknown
  session_expires_at?: string | null
}

export interface PasskeyOptionsPayload {
  email?: string
  username?: string
}

export interface PasskeyVerifyPayload {
  ceremony_id: string
  credential: unknown
}

export interface PasskeyRecoveryStartPayload {
  email: string
  password?: string
}

export interface PasskeyRecoveryVerifyPayload extends PasskeyRecoveryStartPayload {
  recovery_id: string
  verification_code?: string
}

export interface PasskeyRecoveryRegisterOptionsPayload {
  recovery_id: string
}

export interface PasskeyRecoveryRegisterVerifyPayload {
  recovery_id: string
  ceremony_id: string
  credential: unknown
}

export interface PasswordResetRequestPayload {
  email: string
}

export interface PasswordResetPayload {
  token: string
  newPassword: string
}

export function resolveAuthSession(): Promise<AuthSessionSummary> {
  const AUTH_SESSION_RESOLVE_PATH = '/auth/session:resolve'
  return apiClient.post<AuthSessionSummary>(AUTH_SESSION_RESOLVE_PATH, {})
}

export function requestPasskeyLoginOptions(payload: PasskeyOptionsPayload): Promise<unknown> {
  return apiClient.post('/auth/passkeys/login/options', payload)
}

export function verifyPasskeyLogin(payload: PasskeyVerifyPayload): Promise<unknown> {
  return apiClient.post('/auth/passkeys/login/verify', {
    ceremony_id: payload.ceremony_id,
    credential: payload.credential,
  })
}

export function startPasskeyRecovery(payload: PasskeyRecoveryStartPayload): Promise<unknown> {
  return apiClient.post('/auth/passkeys/recovery/start', {
    email: payload.email,
    password: payload.password || undefined,
  })
}

export function verifyPasskeyRecovery(payload: PasskeyRecoveryVerifyPayload): Promise<unknown> {
  return apiClient.post('/auth/passkeys/recovery/verify', {
    recovery_id: payload.recovery_id,
    email: payload.email,
    password: payload.password || undefined,
    verification_code: payload.verification_code || undefined,
  })
}

export function getPasskeyRecoveryStatus(recoveryId: string): Promise<unknown> {
  return apiClient.get(`/auth/passkeys/recovery/${encodeURIComponent(recoveryId)}/status`)
}

export function requestPasskeyRecoveryRegisterOptions(
  payload: PasskeyRecoveryRegisterOptionsPayload
): Promise<unknown> {
  return apiClient.post('/auth/passkeys/recovery/register/options', {
    recovery_id: payload.recovery_id,
  })
}

export function verifyPasskeyRecoveryRegister(
  payload: PasskeyRecoveryRegisterVerifyPayload
): Promise<unknown> {
  return apiClient.post('/auth/passkeys/recovery/register/verify', {
    recovery_id: payload.recovery_id,
    ceremony_id: payload.ceremony_id,
    credential: payload.credential,
  })
}

export function requestPasswordReset(payload: PasswordResetRequestPayload): Promise<unknown> {
  return apiClient.post('/email/request-password-reset', {
    email: payload.email.trim(),
  })
}

export function resetPassword(payload: PasswordResetPayload): Promise<unknown> {
  return apiClient.post('/email/reset-password', {
    token: payload.token.trim(),
    new_password: payload.newPassword,
  })
}
