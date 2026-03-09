import { describe, expect, it } from 'vitest'

import {
  TURNSTILE_HOSTNAME_MISMATCH_CODE,
  extractTurnstileErrorCode,
  getTurnstileErrorMessageKey,
} from '../turnstile'

describe('turnstile utils', () => {
  it('extracts numeric error codes from callback payloads', () => {
    expect(extractTurnstileErrorCode(110200)).toBe(TURNSTILE_HOSTNAME_MISMATCH_CODE)
    expect(extractTurnstileErrorCode('110200')).toBe(TURNSTILE_HOSTNAME_MISMATCH_CODE)
  })

  it('extracts numeric error codes from error messages', () => {
    expect(extractTurnstileErrorCode(new Error('Turnstile error: 110200'))).toBe(
      TURNSTILE_HOSTNAME_MISMATCH_CODE
    )
  })

  it('maps hostname mismatch to a dedicated i18n key', () => {
    expect(getTurnstileErrorMessageKey(new Error('Turnstile error: 110200'))).toBe(
      'auth.error.turnstileHostnameMismatch'
    )
    expect(getTurnstileErrorMessageKey(new Error('Turnstile error'))).toBe(
      'auth.error.turnstileFailed'
    )
  })
})
