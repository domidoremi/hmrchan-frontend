export type PasswordStrengthLevel = 'weak' | 'fair' | 'good' | 'strong'

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

export function isEmailChangeAllowed(options: {
  currentEmail?: string | null
  nextEmail: string
  password: string
}): boolean {
  const { currentEmail, nextEmail, password } = options
  return Boolean(nextEmail && nextEmail !== currentEmail && password)
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

export function normalizeTwoFactorQrCode(raw: string | null | undefined): string {
  const trimmed = raw?.trim() ?? ''
  if (!trimmed) return ''
  if (trimmed.startsWith('data:') || trimmed.startsWith('http')) return trimmed
  return `data:image/png;base64,${trimmed}`
}
