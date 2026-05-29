import { describe, expect, it } from 'vitest'

import {
  buildBackupCodesClipboardText,
  buildLinkedIdentityProviderLabel,
  buildMfaBackupCodeRegenerationSuccessState,
  buildMfaDisableSuccessState,
  buildMfaRecoveryVerificationPayload,
  buildPasskeyRegistrationDeviceName,
  buildPasskeyRegistrationSuccessState,
  buildPasskeyRenamePayload,
  buildTotpOtpAuthUrlClipboardText,
  buildTotpSetupCancelState,
  buildTotpSecretClipboardText,
  buildTotpVerificationCode,
  buildTotpVerificationSuccessState,
  canCopyMfaClipboardText,
  canRenamePasskey,
  canSubmitMfaRecoveryVerification,
  formatAuthenticatorAttachmentLabel,
  formatBooleanLabel,
  formatIdentityProviderLabel,
  formatPasskeyTransports,
  getPasskeyDraftName,
  localizeMfaMethod,
  normalizeIdentityProvider,
  normalizeMfaBackupCodes,
  removePasskeyDraftName,
  resolveMfaMethodSummary,
  resolveMfaStatusHint,
  resolveMfaStatusLabel,
  updatePasskeyDraftNames,
} from '../securityMfaModel'

const credential = {
  id: 'credential-1',
  device_name: 'Laptop',
  created_at: '2026-04-20T00:00:00.000Z',
  last_used_at: '2026-04-20T01:00:00.000Z',
  transports: ['internal'],
  discoverable: true,
  backup_eligible: true,
  backup_state: false,
  authenticator_attachment: 'platform',
}

describe('securityMfaModel', () => {
  it('normalizes and formats identity providers', () => {
    expect(normalizeIdentityProvider(' Google ', 'local')).toBe('google')
    expect(normalizeIdentityProvider('', ' GitHub ')).toBe('local')
    expect(formatIdentityProviderLabel('local', 'Email')).toBe('Email')
    expect(formatIdentityProviderLabel('github', 'Email')).toBe('GitHub')
    expect(formatIdentityProviderLabel('custom_provider', 'Email')).toBe('Custom Provider')
  })

  it('builds linked identity provider labels with formatting and de-duplication', () => {
    expect(
      buildLinkedIdentityProviderLabel({
        providers: ['local', ' GitHub ', 'github', '', null, 'custom_provider'],
        emailLabel: 'Email',
        fallbackLabel: 'None',
      })
    ).toBe('Email, GitHub, Custom Provider')
  })

  it('uses a fallback linked identity provider label when providers are empty', () => {
    expect(
      buildLinkedIdentityProviderLabel({
        providers: ['', null, undefined],
        emailLabel: 'Email',
        fallbackLabel: 'None',
      })
    ).toBe('None')
  })

  it('formats MFA methods and passkey metadata labels', () => {
    expect(
      localizeMfaMethod('backup_code', {
        totp: 'Authenticator',
        backupCode: 'Backup code',
        webauthn: 'Passkey',
      })
    ).toBe('Backup code')
    expect(
      localizeMfaMethod('sms', { totp: 'TOTP', backupCode: 'Backup', webauthn: 'Passkey' })
    ).toBe('sms')
    expect(formatBooleanLabel(true, { yes: 'Yes', no: 'No', unknown: 'Unknown' })).toBe('Yes')
    expect(formatBooleanLabel(undefined, { yes: 'Yes', no: 'No', unknown: 'Unknown' })).toBe(
      'Unknown'
    )
    expect(
      formatAuthenticatorAttachmentLabel('platform', {
        unknown: 'Unknown',
        platform: 'Platform',
        crossPlatform: 'Cross-platform',
      })
    ).toBe('Platform')
    expect(formatPasskeyTransports(['internal', 'usb'], 'Unknown')).toBe('internal, usb')
    expect(formatPasskeyTransports([], 'Unknown')).toBe('Unknown')
  })

  it('resolves MFA method summary labels', () => {
    expect(
      resolveMfaMethodSummary({
        isLoadingInitialStatus: true,
        methods: [],
        loadingLabel: 'Loading status',
        disabledLabel: 'Disabled',
      })
    ).toBe('Loading status')

    expect(
      resolveMfaMethodSummary({
        isLoadingInitialStatus: false,
        methods: [],
        loadingLabel: 'Loading status',
        disabledLabel: 'Disabled',
      })
    ).toBe('Disabled')

    expect(
      resolveMfaMethodSummary({
        isLoadingInitialStatus: false,
        methods: ['Authenticator', 'Passkey'],
        loadingLabel: 'Loading status',
        disabledLabel: 'Disabled',
      })
    ).toBe('Authenticator · Passkey')
  })

  it('resolves MFA status labels', () => {
    const labels = {
      loadingLabel: 'Loading',
      pendingLabel: 'Pending',
      enabledLabel: 'Enabled',
      disabledLabel: 'Disabled',
    }

    expect(
      resolveMfaStatusLabel({
        ...labels,
        isLoadingInitialStatus: true,
        isTotpPendingSetup: false,
        isEnabled: false,
      })
    ).toBe('Loading')

    expect(
      resolveMfaStatusLabel({
        ...labels,
        isLoadingInitialStatus: false,
        isTotpPendingSetup: true,
        isEnabled: false,
      })
    ).toBe('Pending')

    expect(
      resolveMfaStatusLabel({
        ...labels,
        isLoadingInitialStatus: false,
        isTotpPendingSetup: false,
        isEnabled: true,
      })
    ).toBe('Enabled')

    expect(
      resolveMfaStatusLabel({
        ...labels,
        isLoadingInitialStatus: false,
        isTotpPendingSetup: false,
        isEnabled: false,
      })
    ).toBe('Disabled')
  })

  it('resolves MFA status hints', () => {
    expect(
      resolveMfaStatusHint({
        isTotpPendingSetup: true,
        methods: [],
        hasBackupCodes: false,
        setupInstructionsLabel: 'Set up authenticator',
        enabledHint: ({ count, methods }) => `enabled:${count}:${methods}`,
        disabledHint: 'Disabled hint',
      })
    ).toBe('Set up authenticator')

    expect(
      resolveMfaStatusHint({
        isTotpPendingSetup: false,
        methods: ['Authenticator', 'Passkey'],
        hasBackupCodes: true,
        setupInstructionsLabel: 'Set up authenticator',
        enabledHint: ({ count, methods }) => `enabled:${count}:${methods}`,
        disabledHint: 'Disabled hint',
      })
    ).toBe('enabled:1:Authenticator · Passkey')

    expect(
      resolveMfaStatusHint({
        isTotpPendingSetup: false,
        methods: [],
        hasBackupCodes: false,
        setupInstructionsLabel: 'Set up authenticator',
        enabledHint: ({ count, methods }) => `enabled:${count}:${methods}`,
        disabledHint: 'Disabled hint',
      })
    ).toBe('Disabled hint')
  })

  it('resolves MFA recovery verification submit eligibility', () => {
    expect(canSubmitMfaRecoveryVerification({ code: '', password: '' })).toBe(false)
    expect(canSubmitMfaRecoveryVerification({ code: '   ', password: '' })).toBe(false)
    expect(canSubmitMfaRecoveryVerification({ code: '123456', password: '' })).toBe(true)
    expect(canSubmitMfaRecoveryVerification({ code: '', password: 'secret' })).toBe(true)
  })

  it('builds MFA recovery verification payloads', () => {
    expect(buildMfaRecoveryVerificationPayload({ code: ' 123456 ', password: 'secret' })).toEqual({
      code: '123456',
      password: 'secret',
    })
    expect(buildMfaRecoveryVerificationPayload({ code: '   ', password: '' })).toEqual({
      code: undefined,
      password: undefined,
    })
    expect(buildMfaRecoveryVerificationPayload({ code: '', password: ' ' })).toEqual({
      code: undefined,
      password: ' ',
    })
  })

  it('normalizes MFA backup codes', () => {
    expect(normalizeMfaBackupCodes(['alpha', 'beta'])).toEqual(['alpha', 'beta'])
    expect(normalizeMfaBackupCodes(null)).toEqual([])
    expect(normalizeMfaBackupCodes(undefined)).toEqual([])
  })

  it('builds TOTP verification success state', () => {
    expect(buildTotpVerificationSuccessState(['alpha'])).toEqual({
      backupCodes: ['alpha'],
      verificationCode: '',
      setup: null,
      showSetup: false,
    })
    expect(buildTotpVerificationSuccessState(undefined)).toEqual({
      backupCodes: [],
      verificationCode: '',
      setup: null,
      showSetup: false,
    })
  })

  it('builds MFA backup code regeneration success state', () => {
    expect(buildMfaBackupCodeRegenerationSuccessState(['alpha', 'beta'])).toEqual({
      backupCodes: ['alpha', 'beta'],
      code: '',
      password: '',
    })
    expect(buildMfaBackupCodeRegenerationSuccessState(null)).toEqual({
      backupCodes: [],
      code: '',
      password: '',
    })
  })

  it('builds MFA disable success state', () => {
    expect(buildMfaDisableSuccessState()).toEqual({
      code: '',
      password: '',
      backupCodes: [],
      setup: null,
      showSetup: false,
    })
  })

  it('builds passkey registration device names', () => {
    expect(buildPasskeyRegistrationDeviceName(' Work laptop ')).toBe('Work laptop')
    expect(buildPasskeyRegistrationDeviceName('')).toBeUndefined()
    expect(buildPasskeyRegistrationDeviceName('   ')).toBeUndefined()
  })

  it('builds passkey registration success state', () => {
    expect(buildPasskeyRegistrationSuccessState()).toEqual({
      deviceName: '',
    })
  })

  it('builds TOTP verification codes', () => {
    expect(buildTotpVerificationCode(' 123456 ')).toBe('123456')
    expect(buildTotpVerificationCode('')).toBe('')
    expect(buildTotpVerificationCode('   ')).toBe('')
  })

  it('builds TOTP setup cancel state', () => {
    const setup = { secret: 'secret' }

    expect(
      buildTotpSetupCancelState({
        setup,
        isTotpPendingSetup: true,
      })
    ).toEqual({
      setup,
      showSetup: false,
      verificationCode: '',
    })

    expect(
      buildTotpSetupCancelState({
        setup,
        isTotpPendingSetup: false,
      })
    ).toEqual({
      setup: null,
      showSetup: false,
      verificationCode: '',
    })
  })

  it('builds MFA clipboard text values', () => {
    expect(buildTotpSecretClipboardText('secret')).toBe('secret')
    expect(buildTotpSecretClipboardText(null)).toBe('')
    expect(buildTotpOtpAuthUrlClipboardText('otpauth://totp/example')).toBe(
      'otpauth://totp/example'
    )
    expect(buildTotpOtpAuthUrlClipboardText(undefined)).toBe('')
    expect(buildBackupCodesClipboardText(['alpha', 'beta'])).toBe('alpha\nbeta')
    expect(buildBackupCodesClipboardText([])).toBe('')
  })

  it('detects copyable MFA clipboard text', () => {
    expect(canCopyMfaClipboardText('secret')).toBe(true)
    expect(canCopyMfaClipboardText('  secret  ')).toBe(true)
    expect(canCopyMfaClipboardText('')).toBe(false)
    expect(canCopyMfaClipboardText('   ')).toBe(false)
  })

  it('resolves passkey draft names and rename eligibility', () => {
    expect(getPasskeyDraftName(credential, {})).toBe('Laptop')
    expect(getPasskeyDraftName(credential, { 'credential-1': 'Work laptop' })).toBe('Work laptop')
    expect(canRenamePasskey(credential, { 'credential-1': 'Laptop' })).toBe(false)
    expect(canRenamePasskey(credential, { 'credential-1': ' Work laptop ' })).toBe(true)
    expect(canRenamePasskey(credential, { 'credential-1': '   ' })).toBe(false)
  })

  it('updates passkey draft names immutably', () => {
    const draftNames = { 'credential-2': 'Phone' }
    const nextDraftNames = updatePasskeyDraftNames(draftNames, 'credential-1', ' Work laptop ')

    expect(nextDraftNames).toEqual({
      'credential-1': ' Work laptop ',
      'credential-2': 'Phone',
    })
    expect(nextDraftNames).not.toBe(draftNames)
    expect(draftNames).toEqual({ 'credential-2': 'Phone' })
  })

  it('removes passkey draft names immutably', () => {
    const draftNames = {
      'credential-1': 'Laptop',
      'credential-2': 'Phone',
    }
    const nextDraftNames = removePasskeyDraftName(draftNames, 'credential-1')

    expect(nextDraftNames).toEqual({ 'credential-2': 'Phone' })
    expect(nextDraftNames).not.toBe(draftNames)
    expect(draftNames).toEqual({
      'credential-1': 'Laptop',
      'credential-2': 'Phone',
    })
  })

  it('builds passkey rename payloads from changed draft names', () => {
    expect(buildPasskeyRenamePayload(credential, { 'credential-1': ' Work laptop ' })).toBe(
      'Work laptop'
    )
    expect(buildPasskeyRenamePayload(credential, { 'credential-1': 'Laptop' })).toBeNull()
    expect(buildPasskeyRenamePayload(credential, { 'credential-1': '   ' })).toBeNull()
  })
})
