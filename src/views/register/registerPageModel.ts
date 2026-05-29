export type RegisterStep = 'email' | 'register' | 'risk-verification' | 'mfa'
export type RegistrationStep = 'email' | 'register'
export type RegisterPasswordStrengthLevel = 'weak' | 'fair' | 'good' | 'strong'
export type RegisterGooglePopupState =
  | 'idle'
  | 'opening'
  | 'waiting'
  | 'recovery'
  | 'blocked'
  | 'handling'
  | 'error'
export type RegisterBackNavigationIntent = 'return-to-primary' | 'history-back' | 'home-replace'

export type AuthFlowErrorLike = {
  status: 'error'
  error: string
  code?: string
  detail?: string
}

export type RegisterFormFailureReason =
  | 'fields-required'
  | 'email-invalid'
  | 'username-invalid'
  | 'password-mismatch'
  | 'code-required'
  | 'password-too-short'
  | 'password-too-weak'

export type RegisterFormValidationInput = {
  username: string
  emailValid: boolean
  password: string
  confirmPassword: string
  verificationCode: string
  passwordStrengthLevel: RegisterPasswordStrengthLevel
}

export type RegisterFormValidationResult =
  | {
      valid: true
      trimmedUsername: string
    }
  | {
      valid: false
      reason: RegisterFormFailureReason
      messageKey: string | null
      trimmedUsername: string
    }

export const TURNSTILE_TOKEN_MAX_AGE_MS = 4 * 60 * 1000

const PASSWORD_STRENGTH_TEXT_KEYS: Record<RegisterPasswordStrengthLevel, string> = {
  weak: 'auth.passwordWeak',
  fair: 'auth.passwordFair',
  good: 'auth.passwordGood',
  strong: 'auth.passwordStrong',
}

const GOOGLE_PROVIDER_BUSY_STATES = new Set<RegisterGooglePopupState>([
  'opening',
  'waiting',
  'recovery',
  'handling',
])

export function resolveRegisterPageTitleKey(step: RegisterStep): string {
  switch (step) {
    case 'risk-verification':
      return 'auth.riskVerificationTitle'
    case 'mfa':
      return 'auth.mfa.title'
    default:
      return 'auth.registerTitle'
  }
}

export function resolveRegisterPageSubtitleKey(step: RegisterStep): string {
  switch (step) {
    case 'register':
      return 'auth.stepRegister'
    case 'risk-verification':
      return 'auth.riskVerificationHint'
    case 'mfa':
      return 'auth.mfa.hint'
    default:
      return 'auth.registerSubtitle'
  }
}

export function resolveRegisterPasswordStrengthTextKey(
  level: RegisterPasswordStrengthLevel
): string {
  return PASSWORD_STRENGTH_TEXT_KEYS[level]
}

export function maskRegistrationEmail(email: string): string {
  if (!email) return ''

  const parts = email.split('@')
  const local = parts[0] ?? ''
  const domain = parts[1]

  if (!domain) return email

  const visible = local.length <= 2 ? local : local.slice(0, 2)
  return `${visible}***@${domain}`
}

export function shouldShowRegistrationProgress(step: RegisterStep): boolean {
  return step === 'email' || step === 'register'
}

export function isRegisterGoogleProviderBusy(options: {
  popupState: RegisterGooglePopupState
  isLoading: boolean
}): boolean {
  return GOOGLE_PROVIDER_BUSY_STATES.has(options.popupState) || options.isLoading
}

export function shouldShowRegisterGoogleClientChallenge(options: {
  popupState: RegisterGooglePopupState
  handoffCode: string | null | undefined
}): boolean {
  return options.popupState === 'handling' && Boolean(options.handoffCode)
}

export function resolveRegisterBackNavigationIntent(options: {
  step: RegisterStep
  historyLength: number
}): RegisterBackNavigationIntent {
  if (options.step !== 'email' && options.step !== 'register') return 'return-to-primary'
  return options.historyLength > 1 ? 'history-back' : 'home-replace'
}

export function resolveRegisterLoginTarget(redirectTo: string): string {
  return redirectTo === '/' ? '/login' : `/login?redirect=${encodeURIComponent(redirectTo)}`
}

function createRegisterFormFailure(
  trimmedUsername: string,
  reason: RegisterFormFailureReason,
  messageKey: string | null
): Extract<RegisterFormValidationResult, { valid: false }> {
  return {
    valid: false,
    reason,
    messageKey,
    trimmedUsername,
  }
}

export function validateRegisterForm(
  input: RegisterFormValidationInput
): RegisterFormValidationResult {
  const trimmedUsername = input.username.trim()

  if (!trimmedUsername || !input.password || !input.confirmPassword) {
    return createRegisterFormFailure(
      trimmedUsername,
      'fields-required',
      'auth.error.fieldsRequired'
    )
  }

  if (!input.emailValid) {
    return createRegisterFormFailure(trimmedUsername, 'email-invalid', null)
  }

  if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
    return createRegisterFormFailure(
      trimmedUsername,
      'username-invalid',
      'auth.error.usernameInvalid'
    )
  }

  if (input.password !== input.confirmPassword) {
    return createRegisterFormFailure(trimmedUsername, 'password-mismatch', 'auth.passwordMismatch')
  }

  if (input.verificationCode.length !== 6) {
    return createRegisterFormFailure(trimmedUsername, 'code-required', 'auth.error.codeRequired')
  }

  if (input.password.length < 8) {
    return createRegisterFormFailure(
      trimmedUsername,
      'password-too-short',
      'auth.error.passwordTooShort'
    )
  }

  if (input.passwordStrengthLevel === 'weak') {
    return createRegisterFormFailure(
      trimmedUsername,
      'password-too-weak',
      'auth.error.passwordTooWeak'
    )
  }

  return {
    valid: true,
    trimmedUsername,
  }
}

export function isTurnstileTokenFresh(options: {
  token: string | null
  issuedAt: number | null
  enabled: boolean
  now?: number
}): boolean {
  if (!options.enabled) return true
  if (!options.token || !options.issuedAt) return false
  return (options.now ?? Date.now()) - options.issuedAt < TURNSTILE_TOKEN_MAX_AGE_MS
}

export function isExpiredGoogleHandoffResult(result: AuthFlowErrorLike): boolean {
  const detail = result.detail?.trim().toLowerCase() ?? ''
  return (
    result.error === 'auth.error.googleLoginExpired' ||
    result.code === 'invalid_google_handoff' ||
    detail === 'invalid or expired google handoff code' ||
    detail === 'invalid google handoff code'
  )
}
