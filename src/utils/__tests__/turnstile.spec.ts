import { describe, expect, it } from 'vitest'

import {
  TURNSTILE_HOSTNAME_MISMATCH_CODE,
  extractTurnstileErrorCode,
  getTurnstileErrorMessageKey,
  isRetryableTurnstileError,
  isTurnstileRequiredError,
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

  it('detects retryable widget errors', () => {
    expect(isRetryableTurnstileError('600010')).toBe(true)
    expect(isRetryableTurnstileError(new Error('Turnstile error: 600010'))).toBe(true)
    expect(isRetryableTurnstileError('110200')).toBe(false)
  })

  it('detects challenge-required api errors', () => {
    expect(
      isTurnstileRequiredError({
        status: 403,
        code: 'CHALLENGE_REQUIRED',
        message: 'Challenge required',
      })
    ).toBe(true)
    expect(
      isTurnstileRequiredError({
        status: 403,
        message: 'Human verification failed, please retry turnstile',
      })
    ).toBe(true)
    expect(
      isTurnstileRequiredError({
        status: 400,
        code: 'TURNSTILE_TOKEN_MISSING',
        message: 'Turnstile token is required',
      })
    ).toBe(true)
    expect(
      isTurnstileRequiredError({
        status: 400,
        detail: {
          code: 'TURNSTILE_TOKEN_MISSING',
          message: 'Turnstile token is required',
        },
      })
    ).toBe(true)
    expect(isTurnstileRequiredError(new Error('plain error'))).toBe(false)
  })
})
