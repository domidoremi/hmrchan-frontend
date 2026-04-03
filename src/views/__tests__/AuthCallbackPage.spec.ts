import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AuthCallbackPage from '../AuthCallbackPage.vue'

const testState = vi.hoisted(() => ({
  route: { query: {} as Record<string, unknown> },
  routerReplace: vi.fn(),
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

vi.mock('@/composables/useTurnstileConfig', () => ({
  useTurnstileConfig: () => ({
    turnstileSiteKey: '',
    turnstileEnabled: false,
  }),
}))

vi.mock('@/services/googleAuthService', async () => {
  const actual = await vi.importActual<typeof import('@/services/googleAuthService')>(
    '@/services/googleAuthService'
  )
  return {
    ...actual,
    getPendingGoogleAuthRequest: () => ({
      intent: 'login' as const,
      redirectTo: '/profile',
      createdAt: Date.now(),
    }),
  }
})

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    testState.route.query = { handoff_code: 'popup-handoff' }
    testState.routerReplace.mockReset()
    testState.authStore.completeGoogleAuth = vi.fn()
    testState.authStore.verifyRiskLogin = vi.fn()
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
      global: {
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
          TurnstileWidget: true,
          AuthMfaStep: true,
        },
      },
    })

    await flushPromises()
    vi.advanceTimersByTime(100)

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'google-auth-result',
        status: 'success',
        handoffCode: 'popup-handoff',
        redirectTo: '/profile',
        intent: 'login',
      }),
      'http://127.0.0.1:4173'
    )
    expect(testState.authStore.completeGoogleAuth).not.toHaveBeenCalled()
    expect(closeSpy).toHaveBeenCalled()
  })

  it('does not call google exchange when callback contains an OAuth error', async () => {
    testState.route.query = { error: 'access_denied' }
    Object.defineProperty(window, 'opener', {
      configurable: true,
      value: undefined,
    })

    const wrapper = mount(AuthCallbackPage, {
      global: {
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
          TurnstileWidget: true,
          AuthMfaStep: true,
        },
      },
    })

    await flushPromises()

    expect(testState.authStore.completeGoogleAuth).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('auth.error.googleAccessDenied')
  })
})
