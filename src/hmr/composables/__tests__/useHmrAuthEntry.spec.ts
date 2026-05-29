import { describe, expect, it, vi } from 'vitest'

import { useHmrAuthEntry } from '@/hmr/composables/useHmrAuthEntry'

function makeRoute(redirect: unknown = undefined) {
  return {
    query: redirect === undefined ? {} : { redirect },
  }
}

function makeRouter() {
  return {
    push: vi.fn(async () => undefined),
  }
}

function makeAuth(overrides: Record<string, unknown> = {}) {
  return {
    login: vi.fn(async () => true),
    register: vi.fn(async () => true),
    startGoogleLogin: vi.fn(),
    ...overrides,
  }
}

describe('useHmrAuthEntry', () => {
  it('submits login and navigates to the normalized redirect target', async () => {
    const auth = makeAuth()
    const router = makeRouter()
    const entry = useHmrAuthEntry({
      auth: auth as never,
      mode: 'login',
      route: makeRoute('/settings') as never,
      router: router as never,
    })
    entry.username.value = 'momi'
    entry.password.value = 'secret'

    await entry.submitLogin()

    expect(auth.login).toHaveBeenCalledExactlyOnceWith('momi', 'secret')
    expect(router.push).toHaveBeenCalledExactlyOnceWith('/settings')
    expect(entry.registerTarget.value).toEqual({
      path: '/register',
      query: { redirect: '/settings' },
    })
  })

  it('submits registration and sends the user back to login with the safe redirect', async () => {
    const auth = makeAuth()
    const router = makeRouter()
    const entry = useHmrAuthEntry({
      auth: auth as never,
      mode: 'register',
      route: makeRoute('https://evil.example') as never,
      router: router as never,
    })
    entry.username.value = 'momi'
    entry.email.value = 'momi@example.com'
    entry.password.value = 'secret'
    entry.verificationCode.value = '123456'

    await entry.submitRegister()

    expect(auth.register).toHaveBeenCalledExactlyOnceWith(
      'momi',
      'momi@example.com',
      'secret',
      '123456'
    )
    expect(entry.redirectTo.value).toBe('/profile')
    expect(router.push).toHaveBeenCalledExactlyOnceWith({
      path: '/login',
      query: { redirect: '/profile' },
    })
  })

  it('starts Google auth with the active entry mode and sanitized redirect', () => {
    const auth = makeAuth()
    const entry = useHmrAuthEntry({
      auth: auth as never,
      mode: 'login',
      route: makeRoute('//evil.example') as never,
      router: makeRouter() as never,
    })

    entry.startGoogle()

    expect(auth.startGoogleLogin).toHaveBeenCalledExactlyOnceWith('login', '/profile')
  })
})
