import { describe, expect, it } from 'vitest'

import {
  buildPasswordToggleLabel,
  getPasswordStrengthClass,
  getPasswordStrengthScore,
  isEmailChangeAllowed,
  isPasswordChangeAllowed,
  normalizeTwoFactorQrCode,
  passwordsMatch,
} from '../profileSettingsModel'

describe('profileSettingsModel', () => {
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

  it('normalizes qr codes for both hosted and inline payloads', () => {
    expect(normalizeTwoFactorQrCode('https://example.com/qr.png')).toBe(
      'https://example.com/qr.png'
    )
    expect(normalizeTwoFactorQrCode('raw-base64')).toBe('data:image/png;base64,raw-base64')
    expect(normalizeTwoFactorQrCode('')).toBe('')
  })
})
