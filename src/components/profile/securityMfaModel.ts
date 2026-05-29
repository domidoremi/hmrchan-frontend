import type { WebAuthnCredentialSummary } from '@/api'
import {
  formatIdentityProviderLabel as formatProfileIdentityProviderLabel,
  resolveIdentityProvider,
} from '@/views/profile-settings/profileSettingsModel'

export function normalizeIdentityProvider(
  profileProvider?: string | null,
  authProvider?: string | null
): string {
  return resolveIdentityProvider({ profileProvider, authProvider })
}

export function formatIdentityProviderLabel(provider: string, emailLabel: string): string {
  return formatProfileIdentityProviderLabel(provider, emailLabel)
}

export function buildLinkedIdentityProviderLabel(options: {
  providers: Array<string | null | undefined>
  emailLabel: string
  fallbackLabel: string
}): string {
  const labels = [
    ...new Set(
      options.providers
        .filter((value): value is string => Boolean(value?.trim()))
        .map((value) => formatIdentityProviderLabel(value, options.emailLabel))
    ),
  ]

  return labels.length ? labels.join(', ') : options.fallbackLabel
}

export function localizeMfaMethod(method: string, labels: Record<string, string>): string {
  switch (method) {
    case 'totp':
      return labels.totp
    case 'backup_code':
      return labels.backupCode
    case 'webauthn':
      return labels.webauthn
    default:
      return method
  }
}

export function resolveMfaMethodSummary(options: {
  isLoadingInitialStatus: boolean
  methods: string[]
  loadingLabel: string
  disabledLabel: string
}): string {
  if (options.isLoadingInitialStatus) {
    return options.loadingLabel
  }

  return options.methods.length ? options.methods.join(' · ') : options.disabledLabel
}

export function resolveMfaStatusLabel(options: {
  isLoadingInitialStatus: boolean
  isTotpPendingSetup: boolean
  isEnabled: boolean
  loadingLabel: string
  pendingLabel: string
  enabledLabel: string
  disabledLabel: string
}): string {
  if (options.isLoadingInitialStatus) {
    return options.loadingLabel
  }

  if (options.isTotpPendingSetup) {
    return options.pendingLabel
  }

  return options.isEnabled ? options.enabledLabel : options.disabledLabel
}

export function resolveMfaStatusHint(options: {
  isTotpPendingSetup: boolean
  methods: string[]
  hasBackupCodes: boolean
  setupInstructionsLabel: string
  enabledHint: (values: { count: number; methods: string }) => string
  disabledHint: string
}): string {
  if (options.isTotpPendingSetup) {
    return options.setupInstructionsLabel
  }

  if (options.methods.length) {
    return options.enabledHint({
      count: options.hasBackupCodes ? 1 : 0,
      methods: options.methods.join(' · '),
    })
  }

  return options.disabledHint
}

export function canSubmitMfaRecoveryVerification(options: {
  code: string
  password: string
}): boolean {
  return Boolean(options.code.trim() || options.password)
}

export function buildMfaRecoveryVerificationPayload(options: { code: string; password: string }): {
  code?: string
  password?: string
} {
  return {
    code: options.code.trim() || undefined,
    password: options.password || undefined,
  }
}

export function normalizeMfaBackupCodes(codes: string[] | null | undefined): string[] {
  return codes ?? []
}

export function buildTotpVerificationSuccessState(backupCodes: string[] | null | undefined): {
  backupCodes: string[]
  verificationCode: ''
  setup: null
  showSetup: false
} {
  return {
    backupCodes: normalizeMfaBackupCodes(backupCodes),
    verificationCode: '',
    setup: null,
    showSetup: false,
  }
}

export function buildMfaBackupCodeRegenerationSuccessState(
  backupCodes: string[] | null | undefined
): { backupCodes: string[]; code: ''; password: '' } {
  return {
    backupCodes: normalizeMfaBackupCodes(backupCodes),
    code: '',
    password: '',
  }
}

export function buildMfaDisableSuccessState(): {
  code: ''
  password: ''
  backupCodes: string[]
  setup: null
  showSetup: false
} {
  return {
    code: '',
    password: '',
    backupCodes: [],
    setup: null,
    showSetup: false,
  }
}

export function buildPasskeyRegistrationDeviceName(value: string): string | undefined {
  return value.trim() || undefined
}

export function buildPasskeyRegistrationSuccessState(): { deviceName: '' } {
  return {
    deviceName: '',
  }
}

export function buildTotpVerificationCode(value: string): string {
  return value.trim()
}

export function buildTotpSetupCancelState<T>(options: {
  setup: T | null
  isTotpPendingSetup: boolean
}): { setup: T | null; showSetup: false; verificationCode: '' } {
  return {
    setup: options.isTotpPendingSetup ? options.setup : null,
    showSetup: false,
    verificationCode: '',
  }
}

export function buildTotpSecretClipboardText(secret?: string | null): string {
  return secret ?? ''
}

export function buildTotpOtpAuthUrlClipboardText(otpAuthUrl?: string | null): string {
  return otpAuthUrl ?? ''
}

export function buildBackupCodesClipboardText(codes: string[]): string {
  return codes.join('\n')
}

export function canCopyMfaClipboardText(text: string): boolean {
  return Boolean(text.trim())
}

export function formatBooleanLabel(
  value: boolean | null | undefined,
  labels: { yes: string; no: string; unknown: string }
): string {
  if (value === true) return labels.yes
  if (value === false) return labels.no
  return labels.unknown
}

export function formatAuthenticatorAttachmentLabel(
  value: string | null | undefined,
  labels: { unknown: string; platform: string; crossPlatform: string }
): string {
  if (!value) return labels.unknown
  return value === 'platform' ? labels.platform : labels.crossPlatform
}

export function formatPasskeyTransports(
  value: string[] | null | undefined,
  unknownLabel: string
): string {
  if (!value?.length) return unknownLabel
  return value.join(', ')
}

export function getPasskeyDraftName(
  credential: WebAuthnCredentialSummary,
  draftNames: Record<string, string>
): string {
  return draftNames[credential.id] ?? credential.device_name ?? ''
}

export function updatePasskeyDraftNames(
  draftNames: Record<string, string>,
  id: string,
  value: string
): Record<string, string> {
  return {
    ...draftNames,
    [id]: value,
  }
}

export function removePasskeyDraftName(
  draftNames: Record<string, string>,
  id: string
): Record<string, string> {
  const nextDraftNames = { ...draftNames }
  delete nextDraftNames[id]
  return nextDraftNames
}

export function buildPasskeyRenamePayload(
  credential: WebAuthnCredentialSummary,
  draftNames: Record<string, string>
): string | null {
  const nextName = getPasskeyDraftName(credential, draftNames).trim()
  return nextName && nextName !== (credential.device_name ?? '') ? nextName : null
}

export function canRenamePasskey(
  credential: WebAuthnCredentialSummary,
  draftNames: Record<string, string>
): boolean {
  return buildPasskeyRenamePayload(credential, draftNames) !== null
}
