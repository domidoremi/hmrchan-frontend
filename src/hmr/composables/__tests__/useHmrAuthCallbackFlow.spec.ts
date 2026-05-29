import { describe, expect, it, vi } from 'vitest'

import { useHmrAuthCallbackFlow } from '@/hmr/composables/useHmrAuthCallbackFlow'

function makeRoute(redirect: unknown = undefined) {
  return {
    query: redirect === undefined ? {} : { redirect },
  }
}

function makeRouter() {
  return {
    replace: vi.fn(async () => undefined),
  }
}

function makeAuth(overrides: Record<string, unknown> = {}) {
  return {
    error: null,
    exchangeGoogleCallback: vi.fn(async () => null),
    isAuthenticated: true,
    resolveSession: vi.fn(async () => undefined),
    ...overrides,
  }
}

const t = (key: string) => (key === 'auth.callbackBody' ? '正在完成登录。' : key)

describe('useHmrAuthCallbackFlow', () => {
  it('uses a safe nested fallback when the exchanged redirect points back to auth routes', async () => {
    const auth = makeAuth({
      exchangeGoogleCallback: vi.fn(async () => '/register?redirect=/settings'),
    })
    const router = makeRouter()
    const flow = useHmrAuthCallbackFlow({
      auth: auth as never,
      route: makeRoute('/login?redirect=/settings') as never,
      router: router as never,
      t,
    })

    await flow.completeCallback()

    expect(flow.nextRedirect.value).toBe('/settings')
    expect(auth.resolveSession).not.toHaveBeenCalled()
    expect(router.replace).toHaveBeenCalledExactlyOnceWith('/settings')
  })

  it('resolves the session before redirecting when the exchange does not authenticate immediately', async () => {
    const auth = makeAuth({
      isAuthenticated: false,
    })
    const router = makeRouter()
    auth.resolveSession = vi.fn(async () => {
      auth.isAuthenticated = true
    })
    const flow = useHmrAuthCallbackFlow({
      auth: auth as never,
      route: makeRoute('/profile') as never,
      router: router as never,
      t,
    })

    await flow.completeCallback()

    expect(auth.exchangeGoogleCallback).toHaveBeenCalledOnce()
    expect(auth.resolveSession).toHaveBeenCalledOnce()
    expect(router.replace).toHaveBeenCalledExactlyOnceWith('/profile')
  })

  it('uses auth errors as callback status copy', () => {
    const flow = useHmrAuthCallbackFlow({
      auth: makeAuth({ error: 'Google 登录失败' }) as never,
      route: makeRoute() as never,
      router: makeRouter() as never,
      t,
    })

    expect(flow.statusCopy.value).toBe('Google 登录失败')
  })
})
