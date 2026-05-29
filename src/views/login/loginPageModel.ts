export type LoginStep = 'credentials' | 'risk-verification' | 'mfa'
export type LoginGooglePopupState =
  | 'idle'
  | 'opening'
  | 'waiting'
  | 'recovery'
  | 'blocked'
  | 'handling'
  | 'error'

export type LoginBackNavigationIntent = 'return-to-credentials' | 'history-back' | 'home-replace'

export type AuthFlowErrorLike = {
  status: 'error'
  error: string
  code?: string
  detail?: string
}

export type LoginCredentialsValidationResult =
  | {
      valid: true
      trimmedIdentifier: string
    }
  | {
      valid: false
      messageKey: string
      trimmedIdentifier: string
    }

export type RestoreAccountValidationResult =
  | {
      valid: true
      trimmedIdentifier: string
    }
  | {
      valid: false
      trimmedIdentifier: string
    }

export const TURNSTILE_TOKEN_MAX_AGE_MS = 4 * 60 * 1000

const CHALLENGE_TURNSTILE_ERROR_CODES = new Set([
  'CHALLENGE_REQUIRED',
  'TURNSTILE_REQUIRED',
  'TURNSTILE_TOKEN_MISSING',
  'TURNSTILE_VERIFICATION_FAILED',
])

const GOOGLE_PROVIDER_BUSY_STATES = new Set<LoginGooglePopupState>([
  'opening',
  'waiting',
  'recovery',
  'handling',
])

export function resolveLoginPageTitleKey(step: LoginStep): string {
  switch (step) {
    case 'risk-verification':
      return 'auth.riskVerificationTitle'
    case 'mfa':
      return 'auth.mfa.title'
    default:
      return 'auth.loginTitle'
  }
}

export function resolveLoginPageSubtitleKey(step: LoginStep): string {
  switch (step) {
    case 'risk-verification':
      return 'auth.riskVerificationHint'
    case 'mfa':
      return 'auth.mfa.hint'
    default:
      return 'auth.loginSubtitle'
  }
}

export function validateLoginCredentials(input: {
  identifier: string
  password: string
}): LoginCredentialsValidationResult {
  const trimmedIdentifier = input.identifier.trim()

  if (!trimmedIdentifier || !input.password) {
    return {
      valid: false,
      messageKey: 'auth.error.fieldsRequired',
      trimmedIdentifier,
    }
  }

  return {
    valid: true,
    trimmedIdentifier,
  }
}

export function validateRestoreAccountForm(input: {
  identifier: string
  password: string
}): RestoreAccountValidationResult {
  const trimmedIdentifier = input.identifier.trim()

  if (!trimmedIdentifier || !input.password) {
    return {
      valid: false,
      trimmedIdentifier,
    }
  }

  return {
    valid: true,
    trimmedIdentifier,
  }
}

export function resolveRestoreNoticeKey(restoreNotice: unknown): string {
  return restoreNotice === 'deleted' ? 'auth.restoreAfterDeleteNotice' : 'auth.restoreHint'
}

export function isSensitiveLoginReauth(reauth: unknown): boolean {
  return reauth === 'sensitive'
}

export function isPasswordLoginUnavailable(errorCode: string): boolean {
  return errorCode === 'password_login_unavailable'
}

export function isGoogleProviderBusy(options: {
  popupState: LoginGooglePopupState
  isLoading: boolean
}): boolean {
  return GOOGLE_PROVIDER_BUSY_STATES.has(options.popupState) || options.isLoading
}

export function shouldShowGoogleClientChallenge(options: {
  popupState: LoginGooglePopupState
  handoffCode: string | null | undefined
}): boolean {
  return options.popupState === 'handling' && Boolean(options.handoffCode)
}

export function shouldShowRestoreAccountPanel(mode: unknown): boolean {
  return mode === 'restore'
}

export function normalizeRestoreIdentifierQuery(identifier: unknown): string | null {
  if (typeof identifier !== 'string') return null

  const trimmedIdentifier = identifier.trim()
  return trimmedIdentifier || null
}

export function shouldStartConditionalPasskeyAutofill(options: {
  started: boolean
  webauthnSupported: boolean
  isAuthenticated: boolean
}): boolean {
  return !options.started && options.webauthnSupported && !options.isAuthenticated
}

export function resolveLoginBackNavigationIntent(options: {
  step: LoginStep
  historyLength: number
}): LoginBackNavigationIntent {
  if (options.step !== 'credentials') return 'return-to-credentials'
  return options.historyLength > 1 ? 'history-back' : 'home-replace'
}

export function hasRiskWebAuthnMethod(methods: string[]): boolean {
  return methods.includes('webauthn')
}

export function normalizeRiskVerificationCode(code: string): string {
  return code.trim()
}

export function shouldRequireCredentialsTurnstile(result: AuthFlowErrorLike): boolean {
  return (
    (result.code ? CHALLENGE_TURNSTILE_ERROR_CODES.has(result.code) : false) ||
    result.error === 'auth.error.turnstileRequired' ||
    result.error === 'auth.error.turnstileFailed'
  )
}

export function buildLoginQueryWithoutRestore<T extends Record<string, unknown>>(query: T) {
  const nextQuery = { ...query }
  delete nextQuery['mode']
  delete nextQuery['identifier']
  delete nextQuery['restore_notice']
  return nextQuery
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
