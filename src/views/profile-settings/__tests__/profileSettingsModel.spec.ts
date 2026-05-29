import { describe, expect, it } from 'vitest'

import {
  buildClosedCredentialVerificationDialogState,
  buildCredentialVerificationPayload,
  buildCredentialVerificationDialogState,
  buildDataSummaryItems,
  buildPasswordToggleLabel,
  buildRestoreAccountRouteQuery,
  canUsePasswordCredentialsFlow,
  createCredentialEmailForm,
  createCredentialPasswordForm,
  createCredentialPasswordVisibilityState,
  formatOptionalIntlDateTime,
  formatOptionalDateTime,
  formatIdentityProviderLabel,
  getPasswordStrengthClass,
  getPasswordStrengthScore,
  getPasswordStrengthTextKey,
  isEmailChangeAllowed,
  isPasswordChangeAllowed,
  normalizeIdentityProvider,
  normalizeTwoFactorQrCode,
  passwordsMatch,
  resolveCredentialPasswordInputType,
  resolveAuthSourceSummaryHintKey,
  resolveAuthSourceSummaryKey,
  resolveAuthSourceSummaryLabel,
  resolveEmailChangeSubmitBlocker,
  resolveCredentialVerificationSuccessOutcome,
  resolveIdentityProvider,
  resolvePasswordChangeSubmitErrorKey,
  resolvePasswordChangeSubmitBlocker,
  resolveProfileDisplayName,
  toggleCredentialPasswordVisibility,
} from '../profileSettingsModel'

describe('profileSettingsModel', () => {
  it('resolves profile display names from trimmed full name before username', () => {
    expect(resolveProfileDisplayName({ fullName: '  Domi  ', username: 'domidoremi' })).toBe('Domi')
    expect(resolveProfileDisplayName({ fullName: '   ', username: 'domidoremi' })).toBe(
      'domidoremi'
    )
    expect(
      resolveProfileDisplayName({ fullName: '   ', username: ' domidoremi ', trimUsername: true })
    ).toBe('domidoremi')
    expect(resolveProfileDisplayName({ fullName: null, username: null })).toBe('')
  })

  it('normalizes identity providers and maps them to auth source copy keys', () => {
    expect(normalizeIdentityProvider(' Google ')).toBe('google')
    expect(normalizeIdentityProvider('')).toBe('local')
    expect(resolveIdentityProvider({ profileProvider: null, authProvider: ' GitHub ' })).toBe(
      'github'
    )
    expect(resolveAuthSourceSummaryKey('google')).toBe('profile.authSourceGoogle')
    expect(resolveAuthSourceSummaryKey('github')).toBe('profile.authSourceThirdParty')
    expect(resolveAuthSourceSummaryKey('local')).toBe('profile.authSourceEmail')
    expect(resolveAuthSourceSummaryHintKey('google')).toBe('profile.authSourceGoogleHint')
    expect(resolveAuthSourceSummaryHintKey('github')).toBe('profile.authSourceThirdPartyHint')
    expect(resolveAuthSourceSummaryHintKey('local')).toBe('profile.authSourceEmailHint')
  })

  it('resolves auth source summary labels with optional third-party provider copy', () => {
    expect(
      resolveAuthSourceSummaryLabel({
        provider: 'google',
        googleLabel: 'Google',
        thirdPartyLabel: 'Third party',
        emailLabel: 'Email',
      })
    ).toBe('Google')
    expect(
      resolveAuthSourceSummaryLabel({
        provider: 'github',
        googleLabel: 'Google',
        thirdPartyLabel: 'Third party',
        emailLabel: 'Email',
        thirdPartyProviderLabel: ' GitHub ',
      })
    ).toBe('GitHub')
    expect(
      resolveAuthSourceSummaryLabel({
        provider: 'github',
        googleLabel: 'Google',
        thirdPartyLabel: 'Third party',
        emailLabel: 'Email',
        thirdPartyProviderLabel: '   ',
      })
    ).toBe('Third party')
    expect(
      resolveAuthSourceSummaryLabel({
        provider: 'local',
        googleLabel: 'Google',
        thirdPartyLabel: 'Third party',
        emailLabel: 'Email',
      })
    ).toBe('Email')
  })

  it('formats identity provider labels for shared profile security surfaces', () => {
    expect(formatIdentityProviderLabel('local', 'Email')).toBe('Email')
    expect(formatIdentityProviderLabel('github', 'Email')).toBe('GitHub')
    expect(formatIdentityProviderLabel('custom_provider', 'Email')).toBe('Custom Provider')
    expect(formatIdentityProviderLabel(' custom-provider name ', 'Email')).toBe(
      'Custom Provider Name'
    )
  })

  it('builds stable data summary items with zero defaults', () => {
    expect(buildDataSummaryItems({ favorites: 2, comments: 3 })).toEqual([
      { key: 'favorites', labelKey: 'profile.dataSummaryFavorites', value: 2 },
      { key: 'comments', labelKey: 'profile.dataSummaryComments', value: 3 },
      { key: 'discussions', labelKey: 'profile.dataSummaryDiscussions', value: 0 },
      {
        key: 'discussion_comments',
        labelKey: 'profile.dataSummaryDiscussionComments',
        value: 0,
      },
      { key: 'following', labelKey: 'profile.dataSummaryFollowing', value: 0 },
      { key: 'followers', labelKey: 'profile.dataSummaryFollowers', value: 0 },
      { key: 'search_history', labelKey: 'profile.dataSummarySearchHistory', value: 0 },
      { key: 'browsing_history', labelKey: 'profile.dataSummaryBrowsingHistory', value: 0 },
      { key: 'notifications', labelKey: 'profile.dataSummaryNotifications', value: 0 },
      { key: 'reports', labelKey: 'profile.dataSummaryReports', value: 0 },
    ])
  })

  it('builds restore-account route query with optional deleted notice', () => {
    expect(
      buildRestoreAccountRouteQuery({
        email: '  domi@example.com  ',
        username: 'domidoremi',
      })
    ).toEqual({
      mode: 'restore',
      identifier: 'domi@example.com',
    })
    expect(
      buildRestoreAccountRouteQuery({
        email: '',
        username: ' domidoremi ',
        includeDeletedNotice: true,
      })
    ).toEqual({
      mode: 'restore',
      restore_notice: 'deleted',
      identifier: 'domidoremi',
    })
  })

  it('formats optional date-times with the provided fallback', () => {
    expect(formatOptionalDateTime(null, 'empty')).toBe('empty')
    expect(formatOptionalDateTime('2026-04-01T00:00:00.000Z', 'empty')).not.toBe('empty')
    expect(
      formatOptionalIntlDateTime(null, {
        fallback: 'empty',
        locale: 'en',
      })
    ).toBe('empty')
    expect(
      formatOptionalIntlDateTime('not-a-date', {
        fallback: 'empty',
        locale: 'en',
      })
    ).toBe('not-a-date')
  })

  it('builds password toggle labels from the provided copy', () => {
    expect(
      buildPasswordToggleLabel({
        visible: false,
        showLabel: 'Show',
        hideLabel: 'Hide',
        fieldLabel: 'Password',
      })
    ).toBe('Show Password')
    expect(
      buildPasswordToggleLabel({
        visible: true,
        showLabel: 'Show',
        hideLabel: 'Hide',
        fieldLabel: 'Password',
      })
    ).toBe('Hide Password')
  })

  it('maps password strength levels to existing UI tokens', () => {
    expect(getPasswordStrengthScore('weak')).toBe(1)
    expect(getPasswordStrengthScore('strong')).toBe(4)
    expect(getPasswordStrengthClass('good')).toBe('strength-good')
    expect(getPasswordStrengthTextKey('weak')).toBe('profile.passwordWeak')
    expect(getPasswordStrengthTextKey('fair')).toBe('profile.passwordFair')
    expect(getPasswordStrengthTextKey('good')).toBe('profile.passwordGood')
    expect(getPasswordStrengthTextKey('strong')).toBe('profile.passwordStrong')
  })

  it('creates fresh credential form state for component refs', () => {
    const passwordForm = createCredentialPasswordForm()
    const nextPasswordForm = createCredentialPasswordForm()
    const emailForm = createCredentialEmailForm()
    const nextEmailForm = createCredentialEmailForm()

    expect(passwordForm).toEqual({
      current_password: '',
      new_password: '',
      confirm_password: '',
    })
    expect(emailForm).toEqual({
      new_email: '',
      password: '',
    })
    expect(nextPasswordForm).toEqual(passwordForm)
    expect(nextEmailForm).toEqual(emailForm)
    expect(nextPasswordForm).not.toBe(passwordForm)
    expect(nextEmailForm).not.toBe(emailForm)
  })

  it('resolves credential password visibility state without component refs', () => {
    const visibility = createCredentialPasswordVisibilityState()
    const nextVisibility = toggleCredentialPasswordVisibility(visibility, 'currentPassword')
    const emailVisibility = toggleCredentialPasswordVisibility(nextVisibility, 'emailPassword')

    expect(visibility).toEqual({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false,
      emailPassword: false,
    })
    expect(nextVisibility).toEqual({
      currentPassword: true,
      newPassword: false,
      confirmPassword: false,
      emailPassword: false,
    })
    expect(emailVisibility).toEqual({
      currentPassword: true,
      newPassword: false,
      confirmPassword: false,
      emailPassword: true,
    })
    expect(nextVisibility).not.toBe(visibility)
    expect(resolveCredentialPasswordInputType(false)).toBe('password')
    expect(resolveCredentialPasswordInputType(true)).toBe('text')
  })

  it('resolves credential security policy without component state', () => {
    expect(canUsePasswordCredentialsFlow('local')).toBe(true)
    expect(canUsePasswordCredentialsFlow(' Google ')).toBe(false)
    expect(canUsePasswordCredentialsFlow('github')).toBe(false)

    expect(
      buildCredentialVerificationPayload({
        pendingAction: 'change_email',
        nextEmail: 'new@example.com',
        emailPassword: 'email-secret',
        currentPassword: 'current-secret',
        nextPassword: 'new-password',
      })
    ).toEqual({
      targetEmail: 'new@example.com',
      password: 'email-secret',
    })

    expect(
      buildCredentialVerificationPayload({
        pendingAction: 'change_password',
        nextEmail: 'new@example.com',
        emailPassword: 'email-secret',
        currentPassword: 'current-secret',
        nextPassword: 'new-password',
      })
    ).toEqual({
      password: 'current-secret',
      newPassword: 'new-password',
    })

    expect(
      buildCredentialVerificationPayload({
        pendingAction: null,
        nextEmail: 'new@example.com',
        emailPassword: 'email-secret',
        currentPassword: 'current-secret',
        nextPassword: 'new-password',
      })
    ).toEqual({})
  })

  it('builds credential verification dialog state without component refs', () => {
    expect(
      buildCredentialVerificationDialogState({
        action: 'change_email',
        verificationToken: 'verify-token',
      })
    ).toEqual({
      isOpen: true,
      action: 'change_email',
      verificationToken: 'verify-token',
      pendingAction: 'change_email',
    })

    expect(buildClosedCredentialVerificationDialogState()).toEqual({
      isOpen: false,
      action: '',
      verificationToken: '',
      pendingAction: null,
    })
  })

  it('resolves credential verification success outcomes without side effects', () => {
    expect(resolveCredentialVerificationSuccessOutcome('change_email')).toEqual({
      successMessageKey: 'email.changeEmailSuccess',
      resetEmailForm: true,
      resetPasswordForm: false,
      refreshProfile: true,
    })
    expect(resolveCredentialVerificationSuccessOutcome('change_password')).toEqual({
      successMessageKey: 'profile.passwordChanged',
      resetEmailForm: false,
      resetPasswordForm: true,
      refreshProfile: false,
    })
    expect(resolveCredentialVerificationSuccessOutcome(null)).toEqual({
      resetEmailForm: false,
      resetPasswordForm: false,
      refreshProfile: false,
    })
  })

  it('validates email and password change readiness without touching page state', () => {
    expect(
      isEmailChangeAllowed({
        currentEmail: 'old@example.com',
        nextEmail: 'new@example.com',
        password: 'secret',
      })
    ).toBe(true)
    expect(
      isEmailChangeAllowed({
        currentEmail: 'same@example.com',
        nextEmail: 'same@example.com',
        password: 'secret',
      })
    ).toBe(false)

    expect(passwordsMatch('abc12345', 'abc12345')).toBe(true)
    expect(passwordsMatch('abc12345', 'zzz')).toBe(false)
    expect(
      isPasswordChangeAllowed({
        currentPassword: 'current-secret',
        nextPassword: 'new-secret',
        confirmPassword: 'new-secret',
      })
    ).toBe(true)
    expect(
      isPasswordChangeAllowed({
        currentPassword: '',
        nextPassword: 'new-secret',
        confirmPassword: 'new-secret',
      })
    ).toBe(false)
  })

  it('resolves email change submit blockers without starting verification', () => {
    expect(
      resolveEmailChangeSubmitBlocker({
        isChangingEmail: true,
        canChangeEmail: true,
      })
    ).toBe('busy')
    expect(
      resolveEmailChangeSubmitBlocker({
        isChangingEmail: false,
        canChangeEmail: false,
      })
    ).toBe('invalid_form')
    expect(
      resolveEmailChangeSubmitBlocker({
        isChangingEmail: false,
        canChangeEmail: true,
      })
    ).toBeNull()
  })

  it('resolves password change submit blockers without starting verification', () => {
    expect(
      resolvePasswordChangeSubmitBlocker({
        isChangingPassword: true,
        canUsePasswordFlow: true,
        nextPassword: 'new-secret',
        passwordsMatch: true,
      })
    ).toBe('busy')
    expect(
      resolvePasswordChangeSubmitBlocker({
        isChangingPassword: false,
        canUsePasswordFlow: false,
        nextPassword: 'new-secret',
        passwordsMatch: true,
      })
    ).toBe('provider_managed')
    expect(
      resolvePasswordChangeSubmitBlocker({
        isChangingPassword: false,
        canUsePasswordFlow: true,
        nextPassword: 'new-secret',
        passwordsMatch: false,
      })
    ).toBe('password_mismatch')
    expect(
      resolvePasswordChangeSubmitBlocker({
        isChangingPassword: false,
        canUsePasswordFlow: true,
        nextPassword: 'short',
        passwordsMatch: true,
      })
    ).toBe('password_too_short')
    expect(
      resolvePasswordChangeSubmitBlocker({
        isChangingPassword: false,
        canUsePasswordFlow: true,
        nextPassword: 'new-secret',
        passwordsMatch: true,
      })
    ).toBeNull()

    expect(resolvePasswordChangeSubmitErrorKey('password_mismatch')).toBe(
      'profile.passwordMismatch'
    )
    expect(resolvePasswordChangeSubmitErrorKey('password_too_short')).toBe(
      'profile.passwordTooShort'
    )
    expect(resolvePasswordChangeSubmitErrorKey('busy')).toBeNull()
    expect(resolvePasswordChangeSubmitErrorKey('provider_managed')).toBeNull()
    expect(resolvePasswordChangeSubmitErrorKey(null)).toBeNull()
  })

  it('normalizes qr codes for both hosted and inline payloads', () => {
    expect(normalizeTwoFactorQrCode('https://example.com/qr.png')).toBe(
      'https://example.com/qr.png'
    )
    expect(normalizeTwoFactorQrCode('raw-base64')).toBe('data:image/png;base64,raw-base64')
    expect(normalizeTwoFactorQrCode('')).toBe('')
  })
})
