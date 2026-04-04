import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ForgotPasswordPage from '../ForgotPasswordPage.vue'
import LoginPage from '../LoginPage.vue'
import RegisterPage from '../RegisterPage.vue'
import ResetPasswordPage from '../ResetPasswordPage.vue'

const testState = vi.hoisted(() => ({
  route: { query: {} as Record<string, unknown> },
  routerReplace: vi.fn(),
  routerBack: vi.fn(),
  routerPush: vi.fn(),
  authStore: {
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    startGoogleAuth: vi.fn(),
    completeGoogleAuth: vi.fn(),
    fetchCurrentUser: vi.fn(),
    verifyRiskLogin: vi.fn(),
    completeMfaLogin: vi.fn(),
    beginWebAuthnLogin: vi.fn(),
    finishWebAuthnLogin: vi.fn(),
  },
  toastStore: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
  api: {
    authService: {
      sendRegistrationCode: vi.fn(),
    },
    userService: {
      restoreAccount: vi.fn(),
    },
  },
  turnstile: {
    siteKey: '',
    enabled: false,
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => testState.route,
  useRouter: () => ({
    replace: testState.routerReplace,
    back: testState.routerBack,
    push: testState.routerPush,
  }),
  RouterLink: {
    template: '<a><slot /></a>',
  },
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

vi.mock('pinia', async () => {
  const actual = await vi.importActual<typeof import('pinia')>('pinia')
  const { toRef } = await vi.importActual<typeof import('vue')>('vue')
  return {
    ...actual,
    storeToRefs: (store: { isAuthenticated: boolean; isLoading: boolean }) => ({
      isAuthenticated: toRef(store, 'isAuthenticated'),
      isLoading: toRef(store, 'isLoading'),
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
  userService: testState.api.userService,
  ApiError: class ApiError extends Error {
    status: number
    code?: string

    constructor(message: string, status: number, code?: string) {
      super(message)
      this.status = status
      this.code = code
    }
  },
}))

vi.mock('@/composables/useTurnstileConfig', () => ({
  useTurnstileConfig: () => ({
    turnstileSiteKey: testState.turnstile.siteKey,
    turnstileEnabled: testState.turnstile.enabled,
  }),
}))

const globalConfig = {
  mocks: {
    $t: (key: string) => key,
  },
  stubs: {
    TurnstileWidget: {
      props: ['size'],
      template: '<div class="turnstile-widget-stub" :data-size="size" />',
    },
    AuthMfaStep: true,
    EmailCodeInput: {
      emits: ['complete'],
      template: '<div class="email-code-input-stub" />',
    },
  },
}

describe('Auth entry pages', () => {
  beforeEach(() => {
    testState.route.query = {}
    testState.routerReplace.mockReset()
    testState.routerBack.mockReset()
    testState.routerPush.mockReset()

    testState.authStore.isAuthenticated = false
    testState.authStore.isLoading = false
    testState.authStore.login = vi.fn()
    testState.authStore.register = vi.fn()
    testState.authStore.startGoogleAuth = vi.fn().mockResolvedValue({ status: 'success' })
    testState.authStore.completeGoogleAuth = vi.fn().mockResolvedValue({
      status: 'success',
      user: {
        id: 'user-1',
        username: 'tester',
        email: 'tester@example.com',
        created_at: '2024-01-01T00:00:00Z',
      },
      redirectTo: '/feed',
    })
    testState.authStore.fetchCurrentUser = vi.fn().mockResolvedValue(null)
    testState.authStore.verifyRiskLogin = vi.fn()
    testState.authStore.completeMfaLogin = vi.fn()
    testState.authStore.beginWebAuthnLogin = vi.fn()
    testState.authStore.finishWebAuthnLogin = vi.fn()

    testState.api.authService.sendRegistrationCode.mockReset()
    testState.api.userService.restoreAccount.mockReset()

    testState.toastStore.success.mockReset()
    testState.toastStore.error.mockReset()
    testState.toastStore.warning.mockReset()
    testState.turnstile.siteKey = ''
    testState.turnstile.enabled = false
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('renders forgot password, tab navigation, and Google entry on the login page', () => {
    testState.turnstile.siteKey = 'site-key'
    testState.turnstile.enabled = true

    const wrapper = mount(LoginPage, {
      global: globalConfig,
    })

    expect(wrapper.find('.auth-shell--split').exists()).toBe(true)
    expect(wrapper.find('.auth-tab-nav').exists()).toBe(true)
    expect(wrapper.text()).toContain('auth.forgotPassword')
    expect(wrapper.text()).toContain('auth.googleDivider')
    expect(wrapper.text()).toContain('auth.googleLoginButton')
    expect(wrapper.find('.turnstile-widget-stub').attributes('data-size')).toBe('compact')
  })

  it('renders the shared shell and Google provider on the register page', () => {
    const wrapper = mount(RegisterPage, {
      global: globalConfig,
    })

    expect(wrapper.find('.auth-shell--split').exists()).toBe(true)
    expect(wrapper.find('.auth-tab-nav').exists()).toBe(true)
    expect(wrapper.text()).toContain('auth.googleDivider')
    expect(wrapper.text()).toContain('auth.googleRegisterButton')
    expect(wrapper.text()).toContain('nav.login')
  })

  it('reuses the split auth shell on forgot and reset password pages', () => {
    const forgotWrapper = mount(ForgotPasswordPage, {
      global: globalConfig,
    })

    testState.route.query = { token: 'reset-token' }
    const resetWrapper = mount(ResetPasswordPage, {
      global: globalConfig,
    })

    expect(forgotWrapper.find('.auth-shell--split').exists()).toBe(true)
    expect(resetWrapper.find('.auth-shell--split').exists()).toBe(true)
    expect(resetWrapper.text()).toContain('email.resetPasswordButton')
  })

  it('completes Google popup auth on the login page without leaving the current tab', async () => {
    const popup = {
      closed: false,
      focus: vi.fn(),
      close: vi.fn(),
    } as unknown as Window

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    )
    vi.spyOn(window, 'open').mockReturnValue(popup)

    const wrapper = mount(LoginPage, {
      global: globalConfig,
    })

    const googleButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('auth.googleLoginButton'))

    expect(googleButton).toBeDefined()

    await googleButton!.trigger('click')

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        data: {
          type: 'google-auth-result',
          status: 'success',
          handoffCode: 'popup-handoff',
        },
      })
    )

    await flushPromises()

    expect(testState.authStore.completeGoogleAuth).toHaveBeenCalledWith('popup-handoff')
    expect(testState.routerReplace).toHaveBeenCalledWith('/feed')
  })

  it('recovers login popup completion from the refresh cookie when the popup closes before bridging', async () => {
    vi.useFakeTimers()
    testState.route.query = { redirect: '/feed' }
    testState.authStore.fetchCurrentUser = vi.fn().mockResolvedValue({
      id: 'user-1',
      username: 'tester',
      email: 'tester@example.com',
      created_at: '2024-01-01T00:00:00Z',
    })

    const popup = {
      closed: false,
      focus: vi.fn(),
      close: vi.fn(),
    } as { closed: boolean; focus: () => void; close: () => void }

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    )
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)

    const wrapper = mount(LoginPage, {
      global: globalConfig,
    })

    const googleButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('auth.googleLoginButton'))

    await googleButton!.trigger('click')

    popup.closed = true
    vi.advanceTimersByTime(400)
    await flushPromises()

    expect(testState.authStore.fetchCurrentUser).toHaveBeenCalledWith(false)
    expect(testState.routerReplace).toHaveBeenCalledWith('/feed')
    expect(testState.toastStore.success).toHaveBeenCalledWith('auth.loginSuccess')
  })

  it('recovers register popup completion from the refresh cookie when the popup closes before bridging', async () => {
    vi.useFakeTimers()
    testState.route.query = { redirect: '/welcome' }
    testState.authStore.fetchCurrentUser = vi.fn().mockResolvedValue({
      id: 'user-2',
      username: 'new-user',
      email: 'new-user@example.com',
      created_at: '2024-01-01T00:00:00Z',
    })

    const popup = {
      closed: false,
      focus: vi.fn(),
      close: vi.fn(),
    } as { closed: boolean; focus: () => void; close: () => void }

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    )
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)

    const wrapper = mount(RegisterPage, {
      global: globalConfig,
    })

    const googleButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('auth.googleRegisterButton'))

    await googleButton!.trigger('click')

    popup.closed = true
    vi.advanceTimersByTime(400)
    await flushPromises()

    expect(testState.authStore.fetchCurrentUser).toHaveBeenCalledWith(false)
    expect(testState.routerReplace).toHaveBeenCalledWith('/welcome')
    expect(testState.toastStore.success).toHaveBeenCalledWith('auth.registerSuccess')
  })
})
