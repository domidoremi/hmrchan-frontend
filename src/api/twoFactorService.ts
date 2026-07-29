import { apiClient } from './client'
import type {
  AuthResponse,
  MfaRequiredResponse,
  RiskVerificationChallengeResponse,
} from './authService'
import { ensureVerificationToken } from './verificationBridge'

export interface TwoFactorSetupResponse {
  secret: string

  otpauth_url: string
  already_setup?: boolean
}

export interface TwoFactorStatusResponse {
  enabled: boolean
  totp_enabled: boolean
  totp_pending_setup: boolean
  has_backup_codes: boolean
  methods: string[]
  webauthn_credentials: WebAuthnCredentialSummary[]
}

export interface TwoFactorVerifyRequest {
  code: string
}

export interface TwoFactorDisableRequest {
  code?: string
  password?: string
}

export interface BackupCodesResponse {
  backup_codes: string[]
  message?: string
}

export interface TwoFactorVerifyResponse {
  enabled: boolean
  methods: string[]
  backup_codes: string[]
}

export interface WebAuthnCredentialSummary {
  id: string
  device_name?: string | null
  transports?: string[] | null
  discoverable: boolean
  backup_eligible?: boolean | null
  backup_state?: boolean | null
  authenticator_attachment?: string | null
  last_used_at?: string | null
  created_at?: string | null
}

export interface WebAuthnRegistrationOptionsResponse {
  ceremony_id: string
  options: Record<string, unknown>
  device_name?: string | null
}

export type WebAuthnRegistrationVerifyResponse = WebAuthnCredentialSummary

export interface WebAuthnAuthenticationOptionsResponse {
  ceremony_id: string
  options: Record<string, unknown>
  methods?: string[]
  provider?: string
}

export const twoFactorService = {
  async getStatus(): Promise<TwoFactorStatusResponse> {
    return apiClient.get('/2fa/status')
  },

  async setup(): Promise<TwoFactorSetupResponse> {
    const verificationToken = await ensureVerificationToken('update_security_settings')
    return apiClient.post<TwoFactorSetupResponse>('/2fa/setup', null, {
      securityPolicy: 'sensitive',
      headers: {
        'X-Verification-Token': verificationToken,
      },
      skipErrorToast: true,
    })
  },

  async verify(code: string): Promise<TwoFactorVerifyResponse> {
    return apiClient.post(
      '/2fa/verify',
      { code },
      {
        securityPolicy: 'sensitive',
        skipErrorToast: true,
      }
    )
  },

  async disable(
    code?: string,
    password?: string
  ): Promise<{ enabled: boolean; methods: string[] }> {
    const verificationToken = await ensureVerificationToken(
      'update_security_settings',
      password ? { password } : undefined
    )
    return apiClient.post(
      '/2fa/disable',
      {
        ...(code ? { verification_code: code } : {}),
        ...(password ? { password } : {}),
        verification_token: verificationToken,
      },
      {
        securityPolicy: 'sensitive',
        skipErrorToast: true,
      }
    )
  },

  async verifyLogin(
    pendingMfaLoginToken: string,
    code: string,
    deviceName?: string,
    deviceType?: string
  ): Promise<AuthResponse | RiskVerificationChallengeResponse | MfaRequiredResponse> {
    return apiClient.post('/2fa/verify-login', {
      pending_mfa_login_token: pendingMfaLoginToken,
      code,
      ...(deviceName ? { device_name: deviceName } : {}),
      ...(deviceType ? { device_type: deviceType } : {}),
    })
  },

  async regenerateBackupCodes(code?: string, password?: string): Promise<BackupCodesResponse> {
    const verificationToken = await ensureVerificationToken(
      'update_security_settings',
      password ? { password } : undefined
    )
    return apiClient.post<BackupCodesResponse>(
      '/2fa/regenerate-backup-codes',
      {
        ...(code ? { verification_code: code } : {}),
        ...(password ? { password } : {}),
        verification_token: verificationToken,
      },
      {
        securityPolicy: 'sensitive',
        skipErrorToast: true,
      }
    )
  },

  async beginWebAuthnRegistration(
    deviceName?: string
  ): Promise<WebAuthnRegistrationOptionsResponse> {
    const verificationToken = await ensureVerificationToken('update_security_settings')
    return apiClient.post<WebAuthnRegistrationOptionsResponse>(
      '/2fa/webauthn/register/options',
      deviceName ? { device_name: deviceName } : {},
      {
        securityPolicy: 'sensitive',
        headers: {
          'X-Verification-Token': verificationToken,
        },
        skipErrorToast: true,
      }
    )
  },

  async finishWebAuthnRegistration(
    ceremonyId: string,
    credential: Record<string, unknown>,
    deviceName?: string
  ): Promise<WebAuthnRegistrationVerifyResponse> {
    return apiClient.post<WebAuthnRegistrationVerifyResponse>(
      '/2fa/webauthn/register/verify',
      {
        ceremony_id: ceremonyId,
        credential,
        ...(deviceName ? { device_name: deviceName } : {}),
      },
      {
        securityPolicy: 'sensitive',
        skipErrorToast: true,
      }
    )
  },

  async beginWebAuthnLogin(
    pendingMfaLoginToken: string
  ): Promise<WebAuthnAuthenticationOptionsResponse> {
    return apiClient.post<WebAuthnAuthenticationOptionsResponse>(
      '/2fa/webauthn/authenticate/options',
      {
        pending_mfa_login_token: pendingMfaLoginToken,
      },
      {
        skipAuth: true,
        skipErrorToast: true,
      }
    )
  },

  async finishWebAuthnLogin(
    pendingMfaLoginToken: string,
    ceremonyId: string,
    credential: Record<string, unknown>,
    deviceName?: string,
    deviceType?: string
  ): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>(
      '/2fa/webauthn/authenticate/verify',
      {
        pending_mfa_login_token: pendingMfaLoginToken,
        ceremony_id: ceremonyId,
        credential,
        ...(deviceName ? { device_name: deviceName } : {}),
        ...(deviceType ? { device_type: deviceType } : {}),
      },
      {
        skipAuth: true,
        skipErrorToast: true,
      }
    )
  },

  async updateWebAuthnCredential(
    id: string,
    deviceName: string
  ): Promise<WebAuthnCredentialSummary> {
    const verificationToken = await ensureVerificationToken('update_security_settings', {
      resourceId: id,
    })
    return apiClient.patch<WebAuthnCredentialSummary>(
      `/2fa/webauthn/credentials/${encodeURIComponent(id)}`,
      { device_name: deviceName },
      {
        securityPolicy: 'sensitive',
        headers: {
          'X-Verification-Token': verificationToken,
        },
        skipErrorToast: true,
      }
    )
  },

  async deleteWebAuthnCredential(id: string): Promise<{ success: boolean }> {
    const verificationToken = await ensureVerificationToken('remove_webauthn_credential', {
      resourceId: id,
    })
    return apiClient.delete<{ success: boolean }>(
      `/2fa/webauthn/credentials/${encodeURIComponent(id)}`,
      {
        securityPolicy: 'sensitive',
        headers: {
          'X-Verification-Token': verificationToken,
        },
        skipErrorToast: true,
      }
    )
  },
}
