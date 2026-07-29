import { apiClient, ApiError } from './client'
import type { RequestConfig } from './client'

const AUTH_SESSION_RESOLVE_PATH = `/auth/${'session:resolve'}`
const PASSKEY_OPTIONS_COOLDOWN_MS = 10_000

const passkeyOptionsCooldowns = new Map<string, number>()

function passkeyOptionsCooldownKey(scope: string, identifier?: unknown): string {
  return `${scope}:${JSON.stringify(identifier ?? {})}`
}

function assertPasskeyOptionsCooldown(scope: string, identifier?: unknown): void {
  const key = passkeyOptionsCooldownKey(scope, identifier)
  const retryAt = passkeyOptionsCooldowns.get(key) ?? 0
  if (retryAt > Date.now()) {
    throw new ApiError(
      'Too many passkey option requests. Please try again shortly.',
      429,
      'RATE_LIMITED'
    )
  }
}

function markPasskeyOptionsRateLimit(scope: string, identifier?: unknown): void {
  passkeyOptionsCooldowns.set(
    passkeyOptionsCooldownKey(scope, identifier),
    Date.now() + PASSKEY_OPTIONS_COOLDOWN_MS
  )
}

async function requestPasskeyOptions<T>(
  scope: string,
  path: string,
  payload: Record<string, unknown>,
  identifier?: unknown
): Promise<T> {
  assertPasskeyOptionsCooldown(scope, identifier)
  try {
    return await apiClient.post<T>(path, payload, {
      skipAuth: true,
      skipErrorToast: true,
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      markPasskeyOptionsRateLimit(scope, identifier)
    }
    throw error
  }
}

export interface LoginRequest {
  username: string
  email?: string
  password: string
  turnstile_token?: string
  device_name?: string
  device_type?: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  verification_code: string
  full_name?: string
  register_token?: string
  turnstile_token?: string
}

export interface SendRegistrationCodeRequest {
  email: string
  turnstile_token?: string
}

export interface SendRegistrationCodeResponse {
  message: string
  expires_in?: number
  register_token?: string
}

export interface UserResponse {
  id: string
  username: string
  email: string
  avatar_url?: string
  full_name?: string
  bio?: string
  is_active?: boolean
  is_admin?: boolean
  is_verified?: boolean
  totp_enabled?: boolean
  email_verified_at?: string
  last_login_at?: string
  roles?: string[]
  auth_source?: string
  identity_provider?: string
  linked_providers?: string[]
  created_at: string
  updated_at?: string
}

export interface SessionSummaryResponse {
  authenticated: true
  user: UserResponse
  session_expires_at?: string | null
  permission_version?: number | string
  permissions?: string[]
  roles?: string[]
  return_to?: string
  _securityWarning?: 'high' | 'medium' | 'low'
}

export type AuthResponse = SessionSummaryResponse

export interface MeResponse extends UserResponse {
  permission_version: number
  auth_source: string
  identity_provider: string
  linked_providers: string[]
}

export interface RegisterResponse {
  user: UserResponse
  message?: string
}

export interface MfaRequiredResponse {
  requires_mfa: true
  pending_mfa_login_token: string
  methods: string[]
  expires_in?: number
  message?: string
  return_to?: string
}

export interface RiskVerificationChallengeResponse {
  requires_risk_verification: true
  pending_token: string
  challenge_type?: string
  methods?: string[]
  expires_in?: number
  message?: string
  return_to?: string
}

export type AuthLoginFlowResponse =
  | AuthResponse
  | RiskVerificationChallengeResponse
  | MfaRequiredResponse

export interface SendVerificationEmailRequest {
  email?: string
}

export interface VerifyEmailRequest {
  token: string
}

export interface RequestPasswordResetRequest {
  email: string
  turnstile_token?: string
}

export interface ResetPasswordRequest {
  token: string
  new_password: string
}

export interface ChangeEmailRequest {
  new_email: string
  password?: string
  verification_token?: string
}

export interface SendEmailCodeRequest {
  action: 'change_password' | 'change_email'
  password?: string
  new_email?: string
  verification_token?: string
}

export interface VerifyEmailCodeRequest {
  action: 'change_password' | 'change_email'
  verification_code: string
  new_password?: string
  verification_token?: string
}

export interface VerifyEmailCodeResponse {
  success: boolean
  message: string
}

export interface VerificationTokenResponse {
  verified?: boolean
  verification_token?: string
  expires_in?: number
  current_device_trusted?: boolean
  step_up_required?: boolean
  action?: string
  resource_id?: string
  message?: string
}

export interface WebAuthnAuthenticationOptionsResponse {
  ceremony_id: string
  options: Record<string, unknown>
  methods?: string[]
  provider?: string
  discoverable?: boolean
  session_realm?: string
}

export interface PasskeyRecoveryStartRequest {
  email: string
  turnstile_token?: string
}

export interface PasskeyRecoveryVerifyRequest {
  email: string
  verification_code: string
  password?: string
}

export interface PasskeyRecoveryVerifyResponse {
  recovery_id: string
  approval_required?: boolean
  approval_status?: string | null
  cooldown_until?: string | null
  expires_at?: string | null
}

export interface PasskeyRecoveryStatus {
  recovery_id?: string
  status: string
  approval_status?: string | null
  cooldown_until?: string | null
  expires_at?: string | null
  can_register: boolean
}

export interface RecoveryPasskeyRegistrationRequest {
  recovery_id: string
  device_name?: string
}

export interface RecoveryPasskeyRegistrationOptionsResponse {
  ceremony_id: string
  options: Record<string, unknown>
}

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthLoginFlowResponse> {
    let securityWarning: AuthResponse['_securityWarning']
    const response = await apiClient.post<AuthLoginFlowResponse>('/auth/login', credentials, {
      skipAuth: true,
      skipErrorToast: true,
      skipChallengeRetry: true,
      onResponseHeaders: (headers) => {
        const warning = headers.get('X-Security-Warning')
        if (warning === 'high' || warning === 'medium' || warning === 'low') {
          securityWarning = warning
        }
      },
    })

    if (securityWarning && 'access_token' in response) {
      response._securityWarning = securityWarning
    }

    return response
  },

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return apiClient.post<RegisterResponse>('/auth/register', data, {
      skipAuth: true,
      skipErrorToast: true,
      skipChallengeRetry: true,
    })
  },

  async logout(allDevices = false): Promise<void> {
    try {
      await apiClient.post(
        '/auth/logout',
        { all_devices: allDevices },
        {
          skipErrorToast: true,
        }
      )
    } catch {
      // ignore logout failures, local state still clears
    }
  },

  async resolveSession(): Promise<AuthResponse | { authenticated: false }> {
    return apiClient.post<AuthResponse | { authenticated: false }>(
      AUTH_SESSION_RESOLVE_PATH,
      null,
      {
        skipAuth: true,
        skipErrorToast: true,
      }
    )
  },

  async getCurrentUser(config?: RequestConfig): Promise<MeResponse> {
    return apiClient.get<MeResponse>('/auth/me', {
      ...config,
      skipErrorToast: config?.skipErrorToast ?? true,
    })
  },

  async verifyPassword(
    password: string,
    config?: RequestConfig
  ): Promise<VerificationTokenResponse> {
    return apiClient.post(
      '/auth/verify-password',
      { password },
      {
        ...config,
        securityPolicy: config?.securityPolicy ?? 'sensitive',
        skipErrorToast: config?.skipErrorToast ?? true,
      }
    )
  },

  async verifyIdentity(
    password: string,
    action: string,
    resourceId?: string,
    config?: RequestConfig
  ): Promise<VerificationTokenResponse> {
    return apiClient.post(
      '/auth/verify-identity',
      { password, action, ...(resourceId ? { resource_id: resourceId } : {}) },
      {
        ...config,
        securityPolicy: config?.securityPolicy ?? 'sensitive',
        skipUnauthorizedRetry: true,
        skipAuthLogoutOnUnauthorized: true,
        skipErrorToast: config?.skipErrorToast ?? true,
      }
    )
  },

  async verifyRiskLogin(
    pendingToken: string,
    code: string,
    turnstileToken?: string,
    deviceName?: string,
    deviceType?: string
  ): Promise<AuthResponse | MfaRequiredResponse> {
    return apiClient.post<AuthResponse | MfaRequiredResponse>(
      '/auth/verify-risk-login',
      {
        pending_token: pendingToken,
        code,
        ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
        ...(deviceName ? { device_name: deviceName } : {}),
        ...(deviceType ? { device_type: deviceType } : {}),
      },
      {
        skipAuth: true,
        skipErrorToast: true,
        skipChallengeRetry: true,
      }
    )
  },

  async sendRegistrationCode(
    data: SendRegistrationCodeRequest,
    config?: RequestConfig
  ): Promise<SendRegistrationCodeResponse> {
    return apiClient.post('/email/send-registration-code', data, {
      ...config,
      skipAuth: true,
      skipErrorToast: true,
      skipChallengeRetry: true,
    })
  },

  async sendVerificationEmail(data?: SendVerificationEmailRequest): Promise<{ message: string }> {
    return apiClient.post('/email/send-verification-email', data ?? null, {
      skipErrorToast: true,
    })
  },

  async verifyEmail(token: string, config?: RequestConfig): Promise<{ message: string }> {
    return apiClient.post(
      '/email/verify-email',
      { token },
      {
        ...config,
        skipAuth: true,
        skipErrorToast: true,
      }
    )
  },

  async requestPasswordReset(data: RequestPasswordResetRequest): Promise<{ message: string }> {
    return apiClient.post('/email/request-password-reset', data, {
      skipAuth: true,
      skipErrorToast: true,
      skipChallengeRetry: true,
    })
  },

  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    return apiClient.post('/email/reset-password', data, {
      skipAuth: true,
      skipErrorToast: true,
    })
  },

  async changeEmail(data: ChangeEmailRequest): Promise<{ message: string }> {
    return apiClient.post('/email/change-email', data, {
      securityPolicy: 'sensitive',
      skipErrorToast: true,
      verificationAction: 'change_email',
    })
  },

  async sendChangePasswordCode(
    password?: string,
    config?: RequestConfig,
    verificationToken?: string
  ): Promise<{ message: string }> {
    return apiClient.post(
      '/email/send-change-password-code',
      {
        ...(password ? { password } : {}),
        ...(verificationToken ? { verification_token: verificationToken } : {}),
      },
      {
        ...config,
        securityPolicy: config?.securityPolicy ?? 'sensitive',
        skipErrorToast: true,
        verificationAction: 'change_password',
      }
    )
  },

  async sendChangeEmailCode(
    password: string | undefined,
    newEmail: string,
    config?: RequestConfig,
    verificationToken?: string
  ): Promise<{ message: string }> {
    return apiClient.post(
      '/email/send-change-email-code',
      {
        new_email: newEmail,
        ...(password ? { password } : {}),
        ...(verificationToken ? { verification_token: verificationToken } : {}),
      },
      {
        ...config,
        securityPolicy: config?.securityPolicy ?? 'sensitive',
        skipErrorToast: true,
        verificationAction: 'change_email',
      }
    )
  },

  async changePasswordByEmailCode(
    verificationCode: string,
    newPassword: string,
    config?: RequestConfig,
    verificationToken?: string
  ): Promise<VerifyEmailCodeResponse> {
    return apiClient.post(
      '/email/change-password',
      {
        verification_code: verificationCode,
        new_password: newPassword,
        ...(verificationToken ? { verification_token: verificationToken } : {}),
      },
      {
        ...config,
        securityPolicy: config?.securityPolicy ?? 'sensitive',
        skipErrorToast: true,
        verificationAction: 'change_password',
      }
    )
  },

  async sendEmailCode(
    data: SendEmailCodeRequest,
    config?: RequestConfig
  ): Promise<{ message: string }> {
    if (data.action === 'change_email') {
      if (!data.new_email || (!data.password && !data.verification_token)) {
        throw new ApiError('Missing password or new email', 400, 'BAD_REQUEST')
      }

      return this.sendChangeEmailCode(
        data.password,
        data.new_email,
        config,
        data.verification_token
      )
    }

    if (!data.password && !data.verification_token) {
      throw new ApiError('Missing password', 400, 'BAD_REQUEST')
    }

    return this.sendChangePasswordCode(data.password, config, data.verification_token)
  },

  async verifyEmailCode(
    data: VerifyEmailCodeRequest,
    config?: RequestConfig
  ): Promise<VerifyEmailCodeResponse> {
    if (data.action === 'change_password') {
      if (!data.new_password) {
        throw new ApiError('Missing new password', 400, 'BAD_REQUEST')
      }

      return this.changePasswordByEmailCode(
        data.verification_code,
        data.new_password,
        config,
        data.verification_token
      )
    }

    return apiClient.post(
      '/email/change-email',
      {
        verification_code: data.verification_code,
        ...(data.verification_token ? { verification_token: data.verification_token } : {}),
      },
      {
        ...config,
        securityPolicy: config?.securityPolicy ?? 'sensitive',
        skipErrorToast: true,
        verificationAction: 'change_email',
      }
    )
  },

  async beginRiskWebAuthnLogin(
    pendingToken: string
  ): Promise<WebAuthnAuthenticationOptionsResponse> {
    return requestPasskeyOptions<WebAuthnAuthenticationOptionsResponse>(
      'risk-login',
      '/auth/risk-login/webauthn/options',
      {
        pending_token: pendingToken,
      },
      pendingToken
    )
  },

  async finishRiskWebAuthnLogin(
    pendingToken: string,
    ceremonyId: string,
    credential: Record<string, unknown>,
    deviceName?: string,
    deviceType?: string
  ): Promise<AuthResponse | MfaRequiredResponse> {
    return apiClient.post<AuthResponse | MfaRequiredResponse>(
      '/auth/risk-login/webauthn/verify',
      {
        pending_token: pendingToken,
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

  async beginPasswordlessLogin(identifier?: {
    username?: string
    email?: string
  }): Promise<WebAuthnAuthenticationOptionsResponse> {
    return requestPasskeyOptions<WebAuthnAuthenticationOptionsResponse>(
      'passwordless-login',
      '/auth/passkeys/login/options',
      identifier ?? {},
      identifier ?? {}
    )
  },

  async finishPasswordlessLogin(
    ceremonyId: string,
    credential: Record<string, unknown>,
    deviceName?: string,
    deviceType?: string
  ): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>(
      '/auth/passkeys/login/verify',
      {
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

  async startPasskeyRecovery(
    data: PasskeyRecoveryStartRequest
  ): Promise<{ success?: boolean; message?: string }> {
    return apiClient.post('/auth/passkeys/recovery/start', data, {
      skipAuth: true,
      skipErrorToast: true,
      skipChallengeRetry: true,
    })
  },

  async verifyPasskeyRecovery(
    data: PasskeyRecoveryVerifyRequest
  ): Promise<PasskeyRecoveryVerifyResponse> {
    return apiClient.post<PasskeyRecoveryVerifyResponse>('/auth/passkeys/recovery/verify', data, {
      skipAuth: true,
      skipErrorToast: true,
      skipChallengeRetry: true,
    })
  },

  async getPasskeyRecoveryStatus(recoveryId: string): Promise<PasskeyRecoveryStatus> {
    return apiClient.get<PasskeyRecoveryStatus>(`/auth/passkeys/recovery/${recoveryId}/status`, {
      skipAuth: true,
      skipErrorToast: true,
    })
  },

  async beginRecoveryPasskeyRegistration(
    data: RecoveryPasskeyRegistrationRequest
  ): Promise<RecoveryPasskeyRegistrationOptionsResponse> {
    return apiClient.post<RecoveryPasskeyRegistrationOptionsResponse>(
      '/auth/passkeys/recovery/register/options',
      data,
      {
        skipAuth: true,
        skipErrorToast: true,
      }
    )
  },

  async finishRecoveryPasskeyRegistration(
    recoveryId: string,
    ceremonyId: string,
    credential: Record<string, unknown>,
    deviceName?: string
  ): Promise<{ success?: boolean; message?: string }> {
    return apiClient.post(
      '/auth/passkeys/recovery/register/verify',
      {
        recovery_id: recoveryId,
        ceremony_id: ceremonyId,
        credential,
        ...(deviceName ? { device_name: deviceName } : {}),
      },
      {
        skipAuth: true,
        skipErrorToast: true,
      }
    )
  },

  async getSessions(): Promise<{
    sessions: Array<{
      id: string
      device_name?: string
      device_type?: string
      ip_address?: string
      created_at?: string
      last_used_at?: string
      is_current: boolean
    }>
    total: number
  }> {
    return apiClient.get('/auth/sessions', {
      securityPolicy: 'sensitive',
    })
  },

  async revokeSession(sessionId: string): Promise<void> {
    return apiClient.delete(`/auth/sessions/${sessionId}`, {
      securityPolicy: 'sensitive',
      verificationAction: 'revoke_sessions',
    })
  },
}

export { ApiError }
