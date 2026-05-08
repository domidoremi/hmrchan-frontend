import { describe, expect, it } from 'vitest'

import {
  classifyAuthBootstrapProbe,
  isAuthBootstrapChallengeRequiredPayload,
} from '../../../scripts/lib/auth-bootstrap.js'

describe('auth bootstrap probe classification', () => {
  it('treats Turnstile challenge responses as app-level auth bootstrap state', () => {
    const payload = {
      success: false,
      error: {
        code: 'CHALLENGE_REQUIRED',
        message: 'Human verification required',
        challenge_required: true,
      },
    }

    expect(isAuthBootstrapChallengeRequiredPayload(payload)).toBe(true)
    expect(
      classifyAuthBootstrapProbe({
        path: '/api/v1/auth/passkeys/login/options',
        method: 'POST',
        status: 403,
        code: 'CHALLENGE_REQUIRED',
        message: 'Human verification required',
        body: payload,
      })
    ).toBeNull()
  })

  it('still flags non-challenge passkey option 403 responses as raw forbidden failures', () => {
    expect(
      classifyAuthBootstrapProbe({
        path: '/api/v1/auth/passkeys/login/options',
        method: 'POST',
        status: 403,
        code: 'ACCOUNT_LOCKED',
        message: 'Account cannot sign in.',
        body: {
          code: 'ACCOUNT_LOCKED',
          message: 'Account cannot sign in.',
        },
      })
    ).toBe('passkeys-login-forbidden')
  })
})
