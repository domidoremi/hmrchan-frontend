import { describe, expect, it } from 'vitest'

import { buildSensitiveReauthRedirect, isSensitiveReauthLoginRoute } from '../sensitiveReauth'

describe('sensitive reauth routing', () => {
  it('keeps the attempted sensitive route as the explicit login redirect target', () => {
    expect(
      buildSensitiveReauthRedirect({ fullPath: '/profile/security?returnTo=/profile' })
    ).toEqual({
      path: '/login',
      query: {
        redirect: '/profile/security?returnTo=/profile',
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
