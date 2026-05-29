export type PasswordStrengthLevel = 'weak' | 'fair' | 'good' | 'strong'

export type PasswordStrengthTextKey =
  | 'profile.passwordWeak'
  | 'profile.passwordFair'
  | 'profile.passwordGood'
  | 'profile.passwordStrong'

export type ProfileCredentialPendingAction = 'change_email' | 'change_password'

export type PasswordChangeSubmitBlocker =
  | 'busy'
  | 'provider_managed'
  | 'password_mismatch'
  | 'password_too_short'

export type PasswordChangeSubmitErrorKey = 'profile.passwordMismatch' | 'profile.passwordTooShort'

export type EmailChangeSubmitBlocker = 'busy' | 'invalid_form'

export interface CredentialVerificationDialogState {
  isOpen: boolean
  action: ProfileCredentialPendingAction | ''
  verificationToken: string
  pendingAction: ProfileCredentialPendingAction | null
}

export interface CredentialPasswordForm {
  current_password: string
  new_password: string
  confirm_password: string
}

export interface CredentialEmailForm {
  new_email: string
  password: string
}

export type CredentialPasswordVisibilityField =
  | 'currentPassword'
  | 'newPassword'
  | 'confirmPassword'
  | 'emailPassword'

export interface CredentialPasswordVisibilityState {
  currentPassword: boolean
  newPassword: boolean
  confirmPassword: boolean
  emailPassword: boolean
}

export interface CredentialVerificationSuccessOutcome {
  successMessageKey?: 'email.changeEmailSuccess' | 'profile.passwordChanged'
  resetEmailForm: boolean
  resetPasswordForm: boolean
  refreshProfile: boolean
}

export type AuthSourceSummaryKey =
  | 'profile.authSourceGoogle'
  | 'profile.authSourceThirdParty'
  | 'profile.authSourceEmail'

export type AuthSourceSummaryHintKey =
  | 'profile.authSourceGoogleHint'
  | 'profile.authSourceThirdPartyHint'
  | 'profile.authSourceEmailHint'

const KNOWN_IDENTITY_PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  github: 'GitHub',
  apple: 'Apple',
  microsoft: 'Microsoft',
  discord: 'Discord',
}

export type DataSummaryKey =
  | 'favorites'
  | 'comments'
  | 'discussions'
  | 'discussion_comments'
  | 'following'
  | 'followers'
  | 'search_history'
  | 'browsing_history'
  | 'notifications'
  | 'reports'

export interface DataSummaryItem {
  key: DataSummaryKey
  labelKey: string
  value: number
}

const DATA_SUMMARY_DEFINITIONS: ReadonlyArray<Omit<DataSummaryItem, 'value'>> = [
  { key: 'favorites', labelKey: 'profile.dataSummaryFavorites' },
  { key: 'comments', labelKey: 'profile.dataSummaryComments' },
  { key: 'discussions', labelKey: 'profile.dataSummaryDiscussions' },
  { key: 'discussion_comments', labelKey: 'profile.dataSummaryDiscussionComments' },
  { key: 'following', labelKey: 'profile.dataSummaryFollowing' },
  { key: 'followers', labelKey: 'profile.dataSummaryFollowers' },
  { key: 'search_history', labelKey: 'profile.dataSummarySearchHistory' },
  { key: 'browsing_history', labelKey: 'profile.dataSummaryBrowsingHistory' },
  { key: 'notifications', labelKey: 'profile.dataSummaryNotifications' },
  { key: 'reports', labelKey: 'profile.dataSummaryReports' },
]

export function resolveProfileDisplayName(options: {
  fullName?: string | null
  username?: string | null
  trimUsername?: boolean
}): string {
  const { fullName, username, trimUsername = false } = options
  const resolvedUsername = trimUsername ? username?.trim() : username
  return fullName?.trim() || resolvedUsername || ''
}

export function normalizeIdentityProvider(provider?: string | null): string {
  return provider?.trim().toLowerCase() || 'local'
}

export function resolveIdentityProvider(options: {
  profileProvider?: string | null
  authProvider?: string | null
}): string {
  const { profileProvider, authProvider } = options
  return normalizeIdentityProvider(profileProvider ?? authProvider)
}

export function resolveAuthSourceSummaryKey(provider: string): AuthSourceSummaryKey {
  const normalized = normalizeIdentityProvider(provider)
  if (normalized === 'google') return 'profile.authSourceGoogle'
  if (normalized !== 'local') return 'profile.authSourceThirdParty'
  return 'profile.authSourceEmail'
}

export function resolveAuthSourceSummaryHintKey(provider: string): AuthSourceSummaryHintKey {
  const normalized = normalizeIdentityProvider(provider)
  if (normalized === 'google') return 'profile.authSourceGoogleHint'
  if (normalized !== 'local') return 'profile.authSourceThirdPartyHint'
  return 'profile.authSourceEmailHint'
}

export function resolveAuthSourceSummaryLabel(options: {
  provider: string
  googleLabel: string
  thirdPartyLabel: string
  emailLabel: string
  thirdPartyProviderLabel?: string | null
}): string {
  const { provider, googleLabel, thirdPartyLabel, emailLabel, thirdPartyProviderLabel } = options
  const normalized = normalizeIdentityProvider(provider)

  if (normalized === 'google') return googleLabel
  if (normalized !== 'local') return thirdPartyProviderLabel?.trim() || thirdPartyLabel
  return emailLabel
}

export function formatIdentityProviderLabel(provider: string, emailLabel: string): string {
  const normalized = normalizeIdentityProvider(provider)

  if (normalized === 'local') {
    return emailLabel
  }

  if (KNOWN_IDENTITY_PROVIDER_LABELS[normalized]) {
    return KNOWN_IDENTITY_PROVIDER_LABELS[normalized]
  }

  return provider
    .trim()
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function buildDataSummaryItems(
  counts?: Partial<Record<DataSummaryKey, number>> | null
): DataSummaryItem[] {
  return DATA_SUMMARY_DEFINITIONS.map((definition) => ({
    ...definition,
    value: counts?.[definition.key] ?? 0,
  }))
}

export function buildRestoreAccountRouteQuery(options: {
  email?: string | null
  username?: string | null
  includeDeletedNotice?: boolean
}): Record<string, string> {
  const { email, username, includeDeletedNotice = false } = options
  const identifier = email?.trim() || username?.trim() || ''

  return {
    mode: 'restore',
    ...(includeDeletedNotice ? { restore_notice: 'deleted' } : {}),
    ...(identifier ? { identifier } : {}),
  }
}

export function formatOptionalDateTime(value?: string | null, fallback = ''): string {
  if (!value) return fallback
  return new Date(value).toLocaleString()
}

export function formatOptionalIntlDateTime(
  value: string | null | undefined,
  options: {
    fallback: string
    locale?: string | string[]
    formatOptions?: Intl.DateTimeFormatOptions
  }
): string {
  const { fallback, locale, formatOptions } = options
  if (!value) return fallback

  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...formatOptions,
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function buildPasswordToggleLabel(options: {
  visible: boolean
  showLabel: string
  hideLabel: string
  fieldLabel: string
}): string {
  const { visible, showLabel, hideLabel, fieldLabel } = options
  return `${visible ? hideLabel : showLabel} ${fieldLabel}`
}

export function getPasswordStrengthScore(level: PasswordStrengthLevel): number {
  if (level === 'weak') return 1
  if (level === 'fair') return 2
  if (level === 'good') return 3
  return 4
}

export function getPasswordStrengthClass(level: PasswordStrengthLevel): string {
  return `strength-${level}`
}

export function getPasswordStrengthTextKey(level: PasswordStrengthLevel): PasswordStrengthTextKey {
  if (level === 'weak') return 'profile.passwordWeak'
  if (level === 'fair') return 'profile.passwordFair'
  if (level === 'good') return 'profile.passwordGood'
  return 'profile.passwordStrong'
}

export function createCredentialPasswordForm(): CredentialPasswordForm {
  return {
    current_password: '',
    new_password: '',
    confirm_password: '',
  }
}

export function createCredentialEmailForm(): CredentialEmailForm {
  return {
    new_email: '',
    password: '',
  }
}

export function createCredentialPasswordVisibilityState(): CredentialPasswordVisibilityState {
  return {
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
    emailPassword: false,
  }
}

export function toggleCredentialPasswordVisibility(
  state: CredentialPasswordVisibilityState,
  field: CredentialPasswordVisibilityField
): CredentialPasswordVisibilityState {
  return {
    ...state,
    [field]: !state[field],
  }
}

export function resolveCredentialPasswordInputType(visible: boolean): 'text' | 'password' {
  return visible ? 'text' : 'password'
}

export function canUsePasswordCredentialsFlow(provider: string): boolean {
  return normalizeIdentityProvider(provider) === 'local'
}

export function buildCredentialVerificationPayload(options: {
  pendingAction: ProfileCredentialPendingAction | null
  nextEmail: string
  emailPassword: string
  currentPassword: string
  nextPassword: string
}): {
  targetEmail?: string
  password?: string
  newPassword?: string
} {
  const { pendingAction, nextEmail, emailPassword, currentPassword, nextPassword } = options

  if (pendingAction === 'change_email') {
    return {
      targetEmail: nextEmail,
      password: emailPassword,
    }
  }

  if (pendingAction === 'change_password') {
    return {
      password: currentPassword,
      newPassword: nextPassword,
    }
  }

  return {}
}

export function buildCredentialVerificationDialogState(options: {
  action: ProfileCredentialPendingAction
  verificationToken: string
}): CredentialVerificationDialogState {
  const { action, verificationToken } = options

  return {
    isOpen: true,
    action,
    verificationToken,
    pendingAction: action,
  }
}

export function buildClosedCredentialVerificationDialogState(): CredentialVerificationDialogState {
  return {
    isOpen: false,
    action: '',
    verificationToken: '',
    pendingAction: null,
  }
}

export function resolveCredentialVerificationSuccessOutcome(
  pendingAction: ProfileCredentialPendingAction | null
): CredentialVerificationSuccessOutcome {
  if (pendingAction === 'change_email') {
    return {
      successMessageKey: 'email.changeEmailSuccess',
      resetEmailForm: true,
      resetPasswordForm: false,
      refreshProfile: true,
    }
  }

  if (pendingAction === 'change_password') {
    return {
      successMessageKey: 'profile.passwordChanged',
      resetEmailForm: false,
      resetPasswordForm: true,
      refreshProfile: false,
    }
  }

  return {
    resetEmailForm: false,
    resetPasswordForm: false,
    refreshProfile: false,
  }
}

export function isEmailChangeAllowed(options: {
  currentEmail?: string | null
  nextEmail: string
  password: string
}): boolean {
  const { currentEmail, nextEmail, password } = options
  return Boolean(nextEmail && nextEmail !== currentEmail && password)
}

export function resolveEmailChangeSubmitBlocker(options: {
  isChangingEmail: boolean
  canChangeEmail: boolean
}): EmailChangeSubmitBlocker | null {
  const { isChangingEmail, canChangeEmail } = options

  if (isChangingEmail) return 'busy'
  if (!canChangeEmail) return 'invalid_form'
  return null
}

export function passwordsMatch(newPassword: string, confirmPassword: string): boolean {
  return newPassword === confirmPassword
}

export function isPasswordChangeAllowed(options: {
  currentPassword: string
  nextPassword: string
  confirmPassword: string
  minimumLength?: number
}): boolean {
  const { currentPassword, nextPassword, confirmPassword, minimumLength = 8 } = options
  return Boolean(
    currentPassword &&
    nextPassword.length >= minimumLength &&
    passwordsMatch(nextPassword, confirmPassword)
  )
}

export function resolvePasswordChangeSubmitBlocker(options: {
  isChangingPassword: boolean
  canUsePasswordFlow: boolean
  nextPassword: string
  passwordsMatch: boolean
  minimumLength?: number
}): PasswordChangeSubmitBlocker | null {
  const {
    isChangingPassword,
    canUsePasswordFlow,
    nextPassword,
    passwordsMatch,
    minimumLength = 8,
  } = options

  if (isChangingPassword) return 'busy'
  if (!canUsePasswordFlow) return 'provider_managed'
  if (!passwordsMatch) return 'password_mismatch'
  if (nextPassword.length < minimumLength) return 'password_too_short'
  return null
}

export function resolvePasswordChangeSubmitErrorKey(
  blocker: PasswordChangeSubmitBlocker | null
): PasswordChangeSubmitErrorKey | null {
  if (blocker === 'password_mismatch') return 'profile.passwordMismatch'
  if (blocker === 'password_too_short') return 'profile.passwordTooShort'
  return null
}

export function normalizeTwoFactorQrCode(raw: string | null | undefined): string {
  const trimmed = raw?.trim() ?? ''
  if (!trimmed) return ''
  if (trimmed.startsWith('data:') || trimmed.startsWith('http')) return trimmed
  return `data:image/png;base64,${trimmed}`
}
