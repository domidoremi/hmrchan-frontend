import { describe, expect, it } from 'vitest'

import {
  TURNSTILE_TOKEN_MAX_AGE_MS,
  buildLoginQueryWithoutRestore,
  hasRiskWebAuthnMethod,
  isExpiredGoogleHandoffResult,
  isGoogleProviderBusy,
  isPasswordLoginUnavailable,
  isSensitiveLoginReauth,
  isTurnstileTokenFresh,
  normalizeRiskVerificationCode,
  normalizeRestoreIdentifierQuery,
  resolveLoginBackNavigationIntent,
  resolveLoginPageSubtitleKey,
  resolveLoginPageTitleKey,
  resolveRestoreNoticeKey,
  shouldShowGoogleClientChallenge,
  shouldShowRestoreAccountPanel,
  shouldStartConditionalPasskeyAutofill,
  shouldRequireCredentialsTurnstile,
  validateLoginCredentials,
  validateRestoreAccountForm,
  type LoginStep,
} from '../loginPageModel'

describe('loginPageModel', () => {
  it('resolves title and subtitle translation keys by auth step', () => {
    const cases: Array<[LoginStep, string, string]> = [
      ['credentials', 'auth.loginTitle', 'auth.loginSubtitle'],
      ['risk-verification', 'auth.riskVerificationTitle', 'auth.riskVerificationHint'],
      ['mfa', 'auth.mfa.title', 'auth.mfa.hint'],
    ]

    for (const [step, titleKey, subtitleKey] of cases) {
      expect(resolveLoginPageTitleKey(step)).toBe(titleKey)
      expect(resolveLoginPageSubtitleKey(step)).toBe(subtitleKey)
    }
  })

  it('validates credential login inputs and returns the normalized identifier', () => {
    expect(validateLoginCredentials({ identifier: '  alice  ', password: 'secret' })).toEqual({
      valid: true,
      trimmedIdentifier: 'alice',
    })
    expect(validateLoginCredentials({ identifier: '  ', password: 'secret' })).toEqual({
      valid: false,
      messageKey: 'auth.error.fieldsRequired',
      trimmedIdentifier: '',
    })
    expect(validateLoginCredentials({ identifier: 'alice', password: '' })).toEqual({
      valid: false,
      messageKey: 'auth.error.fieldsRequired',
      trimmedIdentifier: 'alice',
    })
  })

  it('validates restore account inputs and returns the normalized identifier', () => {
    expect(
      validateRestoreAccountForm({ identifier: '  alice@example.com  ', password: 'secret' })
    ).toEqual({
      valid: true,
      trimmedIdentifier: 'alice@example.com',
    })
    expect(validateRestoreAccountForm({ identifier: '  ', password: 'secret' })).toEqual({
      valid: false,
      trimmedIdentifier: '',
    })
    expect(validateRestoreAccountForm({ identifier: 'alice@example.com', password: '' })).toEqual({
      valid: false,
      trimmedIdentifier: 'alice@example.com',
    })
  })

  it('resolves login restore and risk derived state', () => {
    expect(resolveRestoreNoticeKey('deleted')).toBe('auth.restoreAfterDeleteNotice')
    expect(resolveRestoreNoticeKey(undefined)).toBe('auth.restoreHint')
    expect(isPasswordLoginUnavailable('password_login_unavailable')).toBe(true)
    expect(isPasswordLoginUnavailable('invalid_credentials')).toBe(false)
    expect(hasRiskWebAuthnMethod(['email', 'webauthn'])).toBe(true)
    expect(hasRiskWebAuthnMethod(['email'])).toBe(false)
    expect(normalizeRiskVerificationCode('  123456  ')).toBe('123456')
  })

  it('resolves login route query and page state policies', () => {
    expect(isSensitiveLoginReauth('sensitive')).toBe(true)
    expect(isSensitiveLoginReauth('')).toBe(false)
    expect(shouldShowRestoreAccountPanel('restore')).toBe(true)
    expect(shouldShowRestoreAccountPanel('login')).toBe(false)
    expect(normalizeRestoreIdentifierQuery('  alice@example.com  ')).toBe('alice@example.com')
    expect(normalizeRestoreIdentifierQuery('   ')).toBeNull()
    expect(normalizeRestoreIdentifierQuery(['alice@example.com'])).toBeNull()
  })

  it('resolves Google auth visual state policies', () => {
    expect(isGoogleProviderBusy({ popupState: 'idle', isLoading: false })).toBe(false)
    expect(isGoogleProviderBusy({ popupState: 'opening', isLoading: false })).toBe(true)
    expect(isGoogleProviderBusy({ popupState: 'waiting', isLoading: false })).toBe(true)
    expect(isGoogleProviderBusy({ popupState: 'recovery', isLoading: false })).toBe(true)
    expect(isGoogleProviderBusy({ popupState: 'handling', isLoading: false })).toBe(true)
    expect(isGoogleProviderBusy({ popupState: 'blocked', isLoading: false })).toBe(false)
    expect(isGoogleProviderBusy({ popupState: 'error', isLoading: true })).toBe(true)

    expect(shouldShowGoogleClientChallenge({ popupState: 'handling', handoffCode: 'code' })).toBe(
      true
    )
    expect(shouldShowGoogleClientChallenge({ popupState: 'handling', handoffCode: '' })).toBe(false)
    expect(shouldShowGoogleClientChallenge({ popupState: 'waiting', handoffCode: 'code' })).toBe(
      false
    )
  })

  it('resolves passkey autofill and back navigation policies', () => {
    expect(
      shouldStartConditionalPasskeyAutofill({
        started: false,
        webauthnSupported: true,
        isAuthenticated: false,
      })
    ).toBe(true)
    expect(
      shouldStartConditionalPasskeyAutofill({
        started: true,
        webauthnSupported: true,
        isAuthenticated: false,
      })
    ).toBe(false)
    expect(
      shouldStartConditionalPasskeyAutofill({
        started: false,
        webauthnSupported: false,
        isAuthenticated: false,
      })
    ).toBe(false)
    expect(
      shouldStartConditionalPasskeyAutofill({
        started: false,
        webauthnSupported: true,
        isAuthenticated: true,
      })
    ).toBe(false)

    expect(resolveLoginBackNavigationIntent({ step: 'mfa', historyLength: 3 })).toBe(
      'return-to-credentials'
    )
    expect(resolveLoginBackNavigationIntent({ step: 'credentials', historyLength: 2 })).toBe(
      'history-back'
    )
    expect(resolveLoginBackNavigationIntent({ step: 'credentials', historyLength: 1 })).toBe(
      'home-replace'
    )
  })

  it('detects credential errors that require Turnstile on the next attempt', () => {
    expect(
      shouldRequireCredentialsTurnstile({
        status: 'error',
        error: 'auth.error.loginFailed',
        code: 'CHALLENGE_REQUIRED',
      })
    ).toBe(true)
    expect(
      shouldRequireCredentialsTurnstile({
        status: 'error',
        error: 'auth.error.turnstileRequired',
      })
    ).toBe(true)
    expect(
      shouldRequireCredentialsTurnstile({
        status: 'error',
        error: 'auth.error.turnstileFailed',
      })
    ).toBe(true)
    expect(
      shouldRequireCredentialsTurnstile({
        status: 'error',
        error: 'auth.error.invalidCredentials',
        code: 'INVALID_CREDENTIALS',
      })
    ).toBe(false)
  })

  it('removes restore-only query keys from the login route query', () => {
    expect(
      buildLoginQueryWithoutRestore({
        mode: 'restore',
        identifier: 'alice',
        restore_notice: 'deleted',
        redirect: '/profile',
      })
    ).toEqual({
      redirect: '/profile',
    })
  })

  it('accepts fresh Turnstile tokens only inside the login freshness window', () => {
    const now = 1_000_000

    expect(isTurnstileTokenFresh({ token: null, issuedAt: null, enabled: false, now })).toBe(true)
    expect(isTurnstileTokenFresh({ token: null, issuedAt: now, enabled: true, now })).toBe(false)
    expect(isTurnstileTokenFresh({ token: 'token', issuedAt: null, enabled: true, now })).toBe(
      false
    )
    expect(
      isTurnstileTokenFresh({
        token: 'token',
        issuedAt: now - TURNSTILE_TOKEN_MAX_AGE_MS + 1,
        enabled: true,
        now,
      })
    ).toBe(true)
    expect(
      isTurnstileTokenFresh({
        token: 'token',
        issuedAt: now - TURNSTILE_TOKEN_MAX_AGE_MS,
        enabled: true,
        now,
      })
    ).toBe(false)
  })

  it('detects expired Google handoff failures from error code, message key, or backend detail', () => {
    expect(
      isExpiredGoogleHandoffResult({
        status: 'error',
        error: 'auth.error.googleLoginExpired',
      })
    ).toBe(true)
    expect(
      isExpiredGoogleHandoffResult({
        status: 'error',
        error: 'auth.error.googleLoginFailed',
        code: 'invalid_google_handoff',
      })
    ).toBe(true)
    expect(
      isExpiredGoogleHandoffResult({
        status: 'error',
        error: 'auth.error.googleLoginFailed',
        detail: ' Invalid or expired Google handoff code ',
      })
    ).toBe(true)
    expect(
      isExpiredGoogleHandoffResult({
        status: 'error',
        error: 'auth.error.googleLoginFailed',
        detail: 'network failed',
      })
    ).toBe(false)
  })
})
