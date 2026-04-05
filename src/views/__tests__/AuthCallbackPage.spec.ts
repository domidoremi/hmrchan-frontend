import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AuthCallbackPage from '../AuthCallbackPage.vue'

const testState = vi.hoisted(() => ({
  route: { query: {} as Record<string, unknown> },
  routerReplace: vi.fn(),
  publishGooglePopupResult: vi.fn(),
  api: {
    authService: {
      getTurnstileConfig: vi.fn(),
    },
    clientSecurityService: {
      init: vi.fn(),
      verify: vi.fn(),
    },
  },
  turnstile: {
    siteKey: '',
    enabled: false,
  },
  pendingGoogleAuthRequest: {
    requestId: 'popup-request-1',
    mode: 'popup' as const,
    intent: 'login' as const,
    redirectTo: '/profile',
    createdAt: 0,
  },
  authStore: {
    isLoading: false,
    completeGoogleAuth: vi.fn(),
    verifyRiskLogin: vi.fn(),
  },
  toastStore: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => testState.route,
  useRouter: () => ({
    replace: testState.routerReplace,
  }),
}))

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
  }
})

vi.mock('@/stores', async () => {
  const { reactive } = await vi.importActual<typeof import('vue')>('vue')
  const authStore = reactive(testState.authStore)
  return {
    useAuthStore: () => authStore,
    useToastStore: () => testState.toastStore,
  }
})

vi.mock('@/api', () => ({
  authService: testState.api.authService,
}))

vi.mock('@/api/clientSecurityService', () => ({
  clientSecurityService: testState.api.clientSecurityService,
}))

vi.mock('@/composables/useTurnstileConfig', async () => {
  const { computed, ref, watch } = await vi.importActual<typeof import('vue')>('vue')

  return {
    useTurnstileConfig: () => {
      const turnstileSiteKey = ref(testState.turnstile.siteKey)
      watch(
        () => testState.turnstile.siteKey,
        (nextValue) => {
          turnstileSiteKey.value = nextValue
        }
      )

      return {
        turnstileSiteKey,
        turnstileEnabled: computed(() => testState.turnstile.enabled),
      }
    },
  }
})

vi.mock('@/services/googleAuthService', async () => {
  const actual = await vi.importActual<typeof import('@/services/googleAuthService')>(
    '@/services/googleAuthService'
  )
  return {
    ...actual,
    getPendingGoogleAuthRequest: () => testState.pendingGoogleAuthRequest,
    publishGooglePopupResult: testState.publishGooglePopupResult,
  }
})

const globalConfig = {
  mocks: {
    $t: (key: string) => key,
  },
  stubs: {
    AuthEntryShell: {
      template: '<div><slot name="eyebrow" /><slot /><slot name="footer" /></div>',
    },
    Button: {
      template: '<button><slot /></button>',
    },
    Input: {
      template: '<input />',
    },
    TurnstileWidget: {
      name: 'TurnstileWidget',
      emits: ['verify', 'expire', 'error'],
      template: '<div class="turnstile-widget-stub" />',
    },
    AuthMfaStep: true,
  },
}

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'name', {
      configurable: true,
      value: '',
      writable: true,
    })
    testState.route.query = { handoff_code: 'popup-handoff' }
    testState.routerReplace.mockReset()
    testState.api.authService.getTurnstileConfig.mockReset()
    testState.api.clientSecurityService.init.mockReset()
    testState.api.clientSecurityService.verify.mockReset()
    testState.api.authService.getTurnstileConfig.mockResolvedValue({
      enabled: true,
      site_key: 'site-key',
    })
    testState.api.clientSecurityService.init.mockResolvedValue({
      trust_level: 'basic',
      challenge_required: false,
    })
    testState.api.clientSecurityService.verify.mockResolvedValue({
      success: true,
      trust_level: 'basic',
    })
    testState.turnstile.siteKey = 'site-key'
    testState.turnstile.enabled = true
    testState.pendingGoogleAuthRequest = {
      requestId: 'popup-request-1',
      mode: 'popup',
      intent: 'login',
      redirectTo: '/profile',
      createdAt: Date.now(),
    }
    testState.authStore.completeGoogleAuth = vi.fn()
    testState.authStore.verifyRiskLogin = vi.fn()
    testState.publishGooglePopupResult.mockReset()
    testState.toastStore.success.mockReset()
    testState.toastStore.error.mockReset()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('bridges popup results back to the opener and closes the window', async () => {
    vi.stubEnv('VITE_FRONTEND_ORIGIN', 'http://127.0.0.1:4173')
    const postMessage = vi.fn()
    const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => undefined)

    Object.defineProperty(window, 'opener', {
      configurable: true,
      value: { postMessage },
    })

    mount(AuthCallbackPage, {
      global: globalConfig,
    })

    await flushPromises()
    vi.advanceTimersByTime(400)

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'google-auth-result',
        requestId: 'popup-request-1',
        status: 'success',
        handoffCode: 'popup-handoff',
        redirectTo: '/profile',
        intent: 'login',
      }),
      'http://127.0.0.1:4173'
    )
    expect(testState.publishGooglePopupResult).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'google-auth-result',
        requestId: 'popup-request-1',
        status: 'success',
        handoffCode: 'popup-handoff',
      })
    )
    expect(testState.authStore.completeGoogleAuth).not.toHaveBeenCalled()
    expect(closeSpy).toHaveBeenCalled()
  })

  it('still bridges popup results when popup session state is missing but opener survives', async () => {
    const postMessage = vi.fn()
    const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => undefined)

    testState.pendingGoogleAuthRequest = null as never

    Object.defineProperty(window, 'opener', {
      configurable: true,
      value: { postMessage },
    })

    mount(AuthCallbackPage, {
      global: globalConfig,
    })

    await flushPromises()
    vi.advanceTimersByTime(400)

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'google-auth-result',
        status: 'success',
        handoffCode: 'popup-handoff',
      }),
      window.location.origin
    )
    expect(testState.publishGooglePopupResult).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'google-auth-result',
        status: 'success',
        handoffCode: 'popup-handoff',
      })
    )
    expect(testState.authStore.completeGoogleAuth).not.toHaveBeenCalled()
    expect(closeSpy).toHaveBeenCalled()
  })

  it('uses popup relay mode without opener and does not exchange in the popup', async () => {
    const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => undefined)

    Object.defineProperty(window, 'name', {
      configurable: true,
      value: 'momi-google-auth:popup-request-1',
      writable: true,
    })
    Object.defineProperty(window, 'opener', {
      configurable: true,
      value: undefined,
    })

    mount(AuthCallbackPage, {
      global: globalConfig,
    })

    await flushPromises()
    vi.advanceTimersByTime(400)

    expect(testState.publishGooglePopupResult).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'google-auth-result',
        requestId: 'popup-request-1',
        status: 'success',
        handoffCode: 'popup-handoff',
      })
    )
    expect(testState.authStore.completeGoogleAuth).not.toHaveBeenCalled()
    expect(closeSpy).toHaveBeenCalled()
  })

  it('does not call google exchange when callback contains an OAuth error', async () => {
    testState.route.query = { error: 'access_denied' }
    testState.pendingGoogleAuthRequest = {
      requestId: 'redirect-error-1',
      mode: 'redirect',
      intent: 'login',
      redirectTo: '/profile',
      createdAt: Date.now(),
    }
    Object.defineProperty(window, 'opener', {
      configurable: true,
      value: undefined,
    })

    const wrapper = mount(AuthCallbackPage, {
      global: globalConfig,
    })

    await flushPromises()

    expect(testState.authStore.completeGoogleAuth).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('auth.error.googleAccessDenied')
  })

  it('continues full-page exchange when the pending auth mode is redirect', async () => {
    testState.route.query = { handoff_code: 'redirect-handoff' }
    testState.pendingGoogleAuthRequest = {
      requestId: 'redirect-request-1',
      mode: 'redirect',
      intent: 'login',
      redirectTo: '/profile',
      createdAt: Date.now(),
    }
    testState.authStore.completeGoogleAuth = vi.fn().mockResolvedValue({
      status: 'success',
      redirectTo: '/profile',
      user: {
        id: 'user-1',
      },
    })

    Object.defineProperty(window, 'opener', {
      configurable: true,
      value: undefined,
    })

    mount(AuthCallbackPage, {
      global: globalConfig,
    })

    await flushPromises()

    expect(testState.publishGooglePopupResult).not.toHaveBeenCalled()
    expect(testState.api.authService.getTurnstileConfig).toHaveBeenCalledTimes(1)
    expect(testState.api.clientSecurityService.init).toHaveBeenCalledWith(false, {
      promptChallenge: false,
    })
    expect(testState.authStore.completeGoogleAuth).toHaveBeenCalledWith('redirect-handoff')
  })

  it('shows an inline client challenge step before exchange when client init requires verification', async () => {
    testState.route.query = { handoff_code: 'redirect-handoff' }
    testState.pendingGoogleAuthRequest = {
      requestId: 'redirect-request-1',
      mode: 'redirect',
      intent: 'login',
      redirectTo: '/profile',
      createdAt: Date.now(),
    }
    testState.api.clientSecurityService.init.mockResolvedValueOnce({
      trust_level: 'untrusted',
      challenge_required: true,
      turnstile_site_key: 'site-key',
    })

    Object.defineProperty(window, 'opener', {
      configurable: true,
      value: undefined,
    })

    const wrapper = mount(AuthCallbackPage, {
      global: globalConfig,
    })

    await flushPromises()

    expect(testState.authStore.completeGoogleAuth).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('auth.clientChallengeHint')
    expect(wrapper.find('.turnstile-widget-stub').exists()).toBe(true)
  })

  it('verifies the inline client challenge before exchanging the Google handoff', async () => {
    testState.route.query = { handoff_code: 'redirect-handoff' }
    testState.pendingGoogleAuthRequest = {
      requestId: 'redirect-request-1',
      mode: 'redirect',
      intent: 'login',
      redirectTo: '/profile',
      createdAt: Date.now(),
    }
    testState.api.clientSecurityService.init.mockResolvedValueOnce({
      trust_level: 'untrusted',
      challenge_required: true,
      turnstile_site_key: 'site-key',
    })
    testState.authStore.completeGoogleAuth = vi.fn().mockResolvedValue({
      status: 'success',
      redirectTo: '/profile',
      user: {
        id: 'user-1',
      },
    })

    Object.defineProperty(window, 'opener', {
      configurable: true,
      value: undefined,
    })

    const wrapper = mount(AuthCallbackPage, {
      global: globalConfig,
    })

    await flushPromises()
    await wrapper.findComponent({ name: 'TurnstileWidget' }).vm.$emit('verify', 'turnstile-token')
    await flushPromises()

    expect(testState.api.clientSecurityService.verify).toHaveBeenCalledWith('turnstile-token')
    expect(testState.authStore.completeGoogleAuth).toHaveBeenCalledWith('redirect-handoff')
  })
})
