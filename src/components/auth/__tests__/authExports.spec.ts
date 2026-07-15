import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  AuthDivider,
  AuthEntryShell,
  AuthMfaStep,
  AuthProviderButton,
  AuthTabNav,
  AuthTurnstileStatus,
  AuthVisualScene,
  type AuthEntryTab,
  type AuthProviderAction,
} from '../index'

describe('auth component exports', () => {
  it('exposes the public auth component boundary', () => {
    expect(
      [
        AuthDivider,
        AuthEntryShell,
        AuthMfaStep,
        AuthProviderButton,
        AuthTabNav,
        AuthTurnstileStatus,
        AuthVisualScene,
      ].every(Boolean)
    ).toBe(true)
  })

  it('exposes the public auth action types', () => {
    const entryTab: AuthEntryTab = 'login'
    const providerAction: AuthProviderAction = 'google'

    expectTypeOf<AuthEntryTab>().toEqualTypeOf<'login' | 'register'>()
    expectTypeOf<AuthProviderAction>().toEqualTypeOf<'google'>()
    expect({ entryTab, providerAction }).toEqual({
      entryTab: 'login',
      providerAction: 'google',
    })
  })
})
