import { describe, expect, it } from 'vitest'

import {
  TURNSTILE_TOKEN_MAX_AGE_MS,
  isExpiredGoogleHandoffResult,
  isRegisterGoogleProviderBusy,
  isTurnstileTokenFresh,
  maskRegistrationEmail,
  resolveRegisterBackNavigationIntent,
  resolveRegisterLoginTarget,
  resolveRegisterPageSubtitleKey,
  resolveRegisterPageTitleKey,
  resolveRegisterPasswordStrengthTextKey,
  shouldShowRegisterGoogleClientChallenge,
  shouldShowRegistrationProgress,
  validateRegisterForm,
  type RegisterStep,
} from '../registerPageModel'

describe('registerPageModel', () => {
  it('resolves title and subtitle translation keys by registration step', () => {
    const cases: Array<[RegisterStep, string, string]> = [
      ['email', 'auth.registerTitle', 'auth.registerSubtitle'],
      ['register', 'auth.registerTitle', 'auth.stepRegister'],
      ['risk-verification', 'auth.riskVerificationTitle', 'auth.riskVerificationHint'],
      ['mfa', 'auth.mfa.title', 'auth.mfa.hint'],
    ]

    for (const [step, titleKey, subtitleKey] of cases) {
      expect(resolveRegisterPageTitleKey(step)).toBe(titleKey)
      expect(resolveRegisterPageSubtitleKey(step)).toBe(subtitleKey)
    }
  })

  it('resolves register password strength translation keys', () => {
    expect(resolveRegisterPasswordStrengthTextKey('weak')).toBe('auth.passwordWeak')
    expect(resolveRegisterPasswordStrengthTextKey('fair')).toBe('auth.passwordFair')
    expect(resolveRegisterPasswordStrengthTextKey('good')).toBe('auth.passwordGood')
    expect(resolveRegisterPasswordStrengthTextKey('strong')).toBe('auth.passwordStrong')
  })

  it('masks registration email addresses for code sent banners', () => {
    expect(maskRegistrationEmail('')).toBe('')
    expect(maskRegistrationEmail('a@example.com')).toBe('a***@example.com')
    expect(maskRegistrationEmail('ab@example.com')).toBe('ab***@example.com')
    expect(maskRegistrationEmail('alice@example.com')).toBe('al***@example.com')
    expect(maskRegistrationEmail('not-an-email')).toBe('not-an-email')
  })

  it('shows registration progress only for primary registration steps', () => {
    expect(shouldShowRegistrationProgress('email')).toBe(true)
    expect(shouldShowRegistrationProgress('register')).toBe(true)
    expect(shouldShowRegistrationProgress('risk-verification')).toBe(false)
    expect(shouldShowRegistrationProgress('mfa')).toBe(false)
  })

  it('resolves Google auth visual state policies', () => {
    expect(isRegisterGoogleProviderBusy({ popupState: 'idle', isLoading: false })).toBe(false)
    expect(isRegisterGoogleProviderBusy({ popupState: 'opening', isLoading: false })).toBe(true)
    expect(isRegisterGoogleProviderBusy({ popupState: 'waiting', isLoading: false })).toBe(true)
    expect(isRegisterGoogleProviderBusy({ popupState: 'recovery', isLoading: false })).toBe(true)
    expect(isRegisterGoogleProviderBusy({ popupState: 'handling', isLoading: false })).toBe(true)
    expect(isRegisterGoogleProviderBusy({ popupState: 'blocked', isLoading: false })).toBe(false)
    expect(isRegisterGoogleProviderBusy({ popupState: 'error', isLoading: true })).toBe(true)

    expect(
      shouldShowRegisterGoogleClientChallenge({ popupState: 'handling', handoffCode: 'code' })
    ).toBe(true)
    expect(
      shouldShowRegisterGoogleClientChallenge({ popupState: 'handling', handoffCode: '' })
    ).toBe(false)
    expect(
      shouldShowRegisterGoogleClientChallenge({ popupState: 'waiting', handoffCode: 'code' })
    ).toBe(false)
  })

  it('resolves non-register back navigation policies', () => {
    expect(resolveRegisterBackNavigationIntent({ step: 'mfa', historyLength: 3 })).toBe(
      'return-to-primary'
    )
    expect(
      resolveRegisterBackNavigationIntent({ step: 'risk-verification', historyLength: 1 })
    ).toBe('return-to-primary')
    expect(resolveRegisterBackNavigationIntent({ step: 'email', historyLength: 2 })).toBe(
      'history-back'
    )
    expect(resolveRegisterBackNavigationIntent({ step: 'email', historyLength: 1 })).toBe(
      'home-replace'
    )
  })

  it('resolves the post-registration login target with redirect preservation', () => {
    expect(resolveRegisterLoginTarget('/')).toBe('/login')
    expect(resolveRegisterLoginTarget('/schedule?tab=week')).toBe(
      '/login?redirect=%2Fschedule%3Ftab%3Dweek'
    )
  })

  it('returns the first failed register form validation rule', () => {
    const validInput = {
      username: '  alice  ',
      emailValid: true,
      password: 'StrongPass1!',
      confirmPassword: 'StrongPass1!',
      verificationCode: '123456',
      passwordStrengthLevel: 'good' as const,
    }

    expect(validateRegisterForm(validInput)).toEqual({
      valid: true,
      trimmedUsername: 'alice',
    })
    expect(validateRegisterForm({ ...validInput, username: '  ' })).toEqual({
      valid: false,
      reason: 'fields-required',
      messageKey: 'auth.error.fieldsRequired',
      trimmedUsername: '',
    })
    expect(validateRegisterForm({ ...validInput, emailValid: false })).toEqual({
      valid: false,
      reason: 'email-invalid',
      messageKey: null,
      trimmedUsername: 'alice',
    })
    expect(validateRegisterForm({ ...validInput, username: 'ab' })).toEqual({
      valid: false,
      reason: 'username-invalid',
      messageKey: 'auth.error.usernameInvalid',
      trimmedUsername: 'ab',
    })
    expect(validateRegisterForm({ ...validInput, confirmPassword: 'different' })).toEqual({
      valid: false,
      reason: 'password-mismatch',
      messageKey: 'auth.passwordMismatch',
      trimmedUsername: 'alice',
    })
    expect(validateRegisterForm({ ...validInput, verificationCode: '12345' })).toEqual({
      valid: false,
      reason: 'code-required',
      messageKey: 'auth.error.codeRequired',
      trimmedUsername: 'alice',
    })
    expect(
      validateRegisterForm({ ...validInput, password: 'short', confirmPassword: 'short' })
    ).toEqual({
      valid: false,
      reason: 'password-too-short',
      messageKey: 'auth.error.passwordTooShort',
      trimmedUsername: 'alice',
    })
    expect(validateRegisterForm({ ...validInput, passwordStrengthLevel: 'weak' })).toEqual({
      valid: false,
      reason: 'password-too-weak',
      messageKey: 'auth.error.passwordTooWeak',
      trimmedUsername: 'alice',
    })
  })

  it('accepts fresh Turnstile tokens only inside the registration freshness window', () => {
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
