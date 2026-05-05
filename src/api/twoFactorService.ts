import { apiClient } from '@/api/client'

export interface TwoFactorVerifyPayload {
  code?: string
  recovery_code?: string
}

export interface TwoFactorWebAuthnVerifyPayload {
  ceremony_id: string
  credential: unknown
}

export function getTwoFactorStatus(): Promise<unknown> {
  return apiClient.get('/2fa/status')
}

export function setupTwoFactor(): Promise<unknown> {
  return apiClient.post('/2fa/setup', {})
}

export function verifyTwoFactor(payload: TwoFactorVerifyPayload): Promise<unknown> {
  return apiClient.post('/2fa/verify', payload)
}

export function disableTwoFactor(payload: TwoFactorVerifyPayload): Promise<unknown> {
  return apiClient.post('/2fa/disable', payload)
}

export function requestTwoFactorWebAuthnRegisterOptions(): Promise<unknown> {
  return apiClient.post('/2fa/webauthn/register/options', {})
}

export function verifyTwoFactorWebAuthnRegister(
  payload: TwoFactorWebAuthnVerifyPayload
): Promise<unknown> {
  return apiClient.post('/2fa/webauthn/register/verify', {
    ceremony_id: payload.ceremony_id,
    credential: payload.credential,
  })
}
