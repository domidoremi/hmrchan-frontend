import { describe, expect, it } from 'vitest'

import { buildSensitiveReauthRedirect, isSensitiveReauthLoginRoute } from '../sensitiveReauth'

describe('sensitive reauth routing', () => {
  it('keeps the attempted sensitive route as the explicit login redirect target without returnTo loops', () => {
    expect(
      buildSensitiveReauthRedirect({ fullPath: '/profile/security?returnTo=/profile' })
    ).toEqual({
      path: '/login',
      query: {
        redirect: '/profile/security',
        reauth: 'sensitive',
      },
    })
  })

  it('falls back to the security center when reauth is attempted from auth boundary routes', () => {
    expect(
      buildSensitiveReauthRedirect({
        fullPath: '/login?redirect=/profile/security?returnTo=/profile&reauth=sensitive',
      })
    ).toEqual({
      path: '/login',
      query: {
        redirect: '/profile/security',
        reauth: 'sensitive',
      },
    })
  })

  it('only exempts explicit sensitive reauth login from guest-only redirects', () => {
    expect(isSensitiveReauthLoginRoute({ name: 'login', query: { reauth: 'sensitive' } })).toBe(
      true
    )
    expect(isSensitiveReauthLoginRoute({ name: 'login', query: {} })).toBe(false)
    expect(isSensitiveReauthLoginRoute({ name: 'register', query: { reauth: 'sensitive' } })).toBe(
      false
    )
  })
})
