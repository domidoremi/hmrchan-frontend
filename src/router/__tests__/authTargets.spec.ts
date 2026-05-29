import { describe, expect, it } from 'vitest'

import {
  createLoginRouteTarget,
  createRegisterRouteTarget,
  readAuthRedirectQuery,
  resolveAuthRedirectTarget,
  resolvePostAuthRedirectTarget,
} from '@/router/authTargets'

describe('authTargets', () => {
  it('falls back when redirect input is unsafe', () => {
    expect(resolveAuthRedirectTarget('https://evil.example', '/profile')).toBe('/profile')
    expect(resolveAuthRedirectTarget('//evil.example', '/profile')).toBe('/profile')
  })

  it('preserves same-origin absolute redirects', () => {
    expect(resolveAuthRedirectTarget('/profile/security?tab=keys')).toBe(
      '/profile/security?tab=keys'
    )
  })

  it('keeps login and register targets from redirecting to themselves', () => {
    expect(createLoginRouteTarget('/login')).toEqual({
      path: '/login',
      query: { redirect: '/' },
    })
    expect(createLoginRouteTarget('/login?redirect=/profile')).toEqual({
      path: '/login',
      query: { redirect: '/' },
    })
    expect(createRegisterRouteTarget('/register')).toEqual({
      path: '/register',
      query: { redirect: '/' },
    })
  })

  it('allows callers to override the unsafe redirect fallback', () => {
    expect(createLoginRouteTarget('javascript:alert(1)', '/')).toEqual({
      path: '/login',
      query: { redirect: '/' },
    })
  })

  it('keeps post-auth redirects away from auth entry routes', () => {
    expect(resolvePostAuthRedirectTarget('/login?redirect=/settings')).toBe('/settings')
    expect(resolvePostAuthRedirectTarget('/register')).toBe('/profile')
    expect(resolvePostAuthRedirectTarget('/auth/callback?code=abc')).toBe('/profile')
    expect(resolvePostAuthRedirectTarget('/login', '/settings')).toBe('/settings')
  })

  it('falls back when nested post-auth redirects are unsafe', () => {
    expect(resolvePostAuthRedirectTarget('/login?redirect=https://evil.example')).toBe('/profile')
    expect(resolvePostAuthRedirectTarget('/login?redirect=/register?redirect=/settings')).toBe(
      '/settings'
    )
  })

  it('reads redirect query values from route objects', () => {
    expect(readAuthRedirectQuery({ query: { redirect: '/settings' } })).toBe('/settings')
    expect(readAuthRedirectQuery({ query: { redirect: ['/profile', '/settings'] } })).toEqual([
      '/profile',
      '/settings',
    ])
    expect(readAuthRedirectQuery({ query: {} })).toBeUndefined()
  })
})
