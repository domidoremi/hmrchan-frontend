import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api'
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
  clientSecurity: {
    verify: vi.fn(),
  },
  turnstile: {
    siteKey: '',
    enabled: false,
  },
  googleAuth: {
    prepareGoogleAuthHandoff: vi.fn(),
    resolveGoogleAuthSecurityError: vi.fn(),
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

vi.mock('@/api/clientSecurityService', () => ({
  clientSecurityService: {
    verify: testState.clientSecurity.verify,
  },
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
    prepareGoogleAuthHandoff: testState.googleAuth.prepareGoogleAuthHandoff,
    resolveGoogleAuthSecurityError: testState.googleAuth.resolveGoogleAuthSecurityError,
  }
})

const globalConfig = {
  mocks: {
    $t: (key: string) => key,
  },
  stubs: {
    TurnstileWidget: {
      name: 'TurnstileWidget',
      props: ['size'],
      template: '<div class="turnstile-widget-stub" :data-size="size" />',
    },
    AuthMfaStep: true,
    EmailCodeInput: {
      name: 'EmailCodeInput',
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
    testState.clientSecurity.verify.mockReset()
    testState.clientSecurity.verify.mockResolvedValue({
      success: true,
      trust_level: 'basic',
    })

    testState.toastStore.success.mockReset()
    testState.toastStore.error.mockReset()
    testState.toastStore.warning.mockReset()
    testState.turnstile.siteKey = ''
    testState.turnstile.enabled = false
    testState.googleAuth.prepareGoogleAuthHandoff.mockReset()
    testState.googleAuth.prepareGoogleAuthHandoff.mockImplementation(
      async (handoffCode: string) => ({
        status: 'ready',
        handoffCode,
      })
    )
    testState.googleAuth.resolveGoogleAuthSecurityError.mockReset()
    testState.googleAuth.resolveGoogleAuthSecurityError.mockReturnValue({
      messageKey: 'auth.error.turnstileFailed',
      detail: 'turnstile failed',
    })
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
    expect(wrapper.find('.turnstile-widget-stub').exists()).toBe(false)
  })

  it('reveals the login Turnstile widget only after a challenge-required response', async () => {
    testState.turnstile.siteKey = 'site-key'
    testState.turnstile.enabled = true
    testState.authStore.login = vi.fn().mockResolvedValue({
      status: 'error',
      error: 'auth.error.turnstileRequired',
      code: 'CHALLENGE_REQUIRED',
    })

    const wrapper = mount(LoginPage, {
      global: globalConfig,
    })

    await wrapper.find('#login-identifier').setValue('tester@example.com')
    await wrapper.find('#login-password').setValue('password123')
    await wrapper.find('form.auth-form').trigger('submit.prevent')
    await flushPromises()

    expect(testState.authStore.login).toHaveBeenCalled()
    expect(wrapper.find('.turnstile-widget-stub').attributes('data-size')).toBe('compact')
  })

  it('renders the shared shell and Google provider on the register page', () => {
    testState.turnstile.siteKey = 'site-key'
    testState.turnstile.enabled = true
    const wrapper = mount(RegisterPage, {
      global: globalConfig,
    })

    expect(wrapper.find('.auth-shell--split').exists()).toBe(true)
    expect(wrapper.find('.auth-tab-nav').exists()).toBe(true)
    expect(wrapper.text()).toContain('auth.googleDivider')
    expect(wrapper.text()).toContain('auth.googleRegisterButton')
    expect(wrapper.text()).toContain('nav.login')
    expect(wrapper.find('.turnstile-widget-stub').exists()).toBe(false)
  })

  it('reveals the register Turnstile widget only after a challenge-required send-code response', async () => {
    testState.turnstile.siteKey = 'site-key'
    testState.turnstile.enabled = true
    testState.api.authService.sendRegistrationCode.mockRejectedValue(
      new ApiError('Challenge required', 403, 'CHALLENGE_REQUIRED')
    )

    const wrapper = mount(RegisterPage, {
      global: globalConfig,
    })

    await wrapper.find('#reg-email').setValue('tester@gmail.com')
    await wrapper.find('form.auth-form').trigger('submit.prevent')
    await flushPromises()

    expect(testState.authStore.register).not.toHaveBeenCalled()
    expect(wrapper.find('.turnstile-widget-stub').attributes('data-size')).toBe('compact')
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

    expect(testState.googleAuth.prepareGoogleAuthHandoff).toHaveBeenCalledWith('popup-handoff', '')
    expect(testState.authStore.completeGoogleAuth).toHaveBeenCalledWith('popup-handoff')
    expect(testState.routerReplace).toHaveBeenCalledWith('/feed')
  })

  it('automatically switches login popup auth back to current-page flow after 12 seconds', async () => {
    vi.useFakeTimers()
    testState.route.query = { redirect: '/feed' }

    const popup = {
      focus: vi.fn(),
      close: vi.fn(),
    } as { focus: () => void; close: () => void }

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

    vi.advanceTimersByTime(12_000)
    await flushPromises()

    expect(testState.authStore.startGoogleAuth).toHaveBeenCalledWith('login', '/feed')
    expect(testState.authStore.completeGoogleAuth).not.toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('auth.error.googlePopupClosed')
  })

  it('automatically switches register popup auth back to current-page flow after 12 seconds', async () => {
    vi.useFakeTimers()
    testState.route.query = { redirect: '/welcome' }

    const popup = {
      focus: vi.fn(),
      close: vi.fn(),
    } as { focus: () => void; close: () => void }

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

    vi.advanceTimersByTime(12_000)
    await flushPromises()

    expect(testState.authStore.startGoogleAuth).toHaveBeenCalledWith('register', '/welcome')
    expect(testState.authStore.completeGoogleAuth).not.toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('auth.error.googlePopupClosed')
  })

  it('keeps Google challenge errors visible on the login page after verify succeeds but exchange fails', async () => {
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
    vi.spyOn(window, 'open').mockReturnValue({
      closed: false,
      focus: vi.fn(),
      close: vi.fn(),
    } as unknown as Window)

    testState.googleAuth.prepareGoogleAuthHandoff.mockResolvedValueOnce({
      status: 'challenge-required',
      handoffCode: 'popup-handoff',
      siteKey: 'site-key',
    })
    testState.authStore.completeGoogleAuth = vi.fn().mockResolvedValue({
      status: 'error',
      error: 'auth.error.googleLoginFailed',
      code: 'google_login_completion_failed',
      detail: 'Failed to complete Google login',
    })

    const wrapper = mount(LoginPage, {
      global: globalConfig,
    })

    const googleButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('auth.googleLoginButton'))

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

    const turnstileWidgets = wrapper.findAllComponents({ name: 'TurnstileWidget' })
    turnstileWidgets.at(-1)!.vm.$emit('verify', 'verified-token')
    await flushPromises()

    expect(testState.clientSecurity.verify).toHaveBeenCalledWith('verified-token')
    expect(testState.authStore.completeGoogleAuth).toHaveBeenCalledWith('popup-handoff')
    expect(wrapper.text()).toContain('auth.error.googleLoginFailed')
    expect(wrapper.text()).toContain('Failed to complete Google login')
  })

  it('exits the login Google challenge state when the handoff has expired', async () => {
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
    vi.spyOn(window, 'open').mockReturnValue({
      closed: false,
      focus: vi.fn(),
      close: vi.fn(),
    } as unknown as Window)

    testState.googleAuth.prepareGoogleAuthHandoff.mockResolvedValueOnce({
      status: 'challenge-required',
      handoffCode: 'popup-handoff',
      siteKey: 'site-key',
    })
    testState.authStore.completeGoogleAuth = vi.fn().mockResolvedValue({
      status: 'error',
      error: 'auth.error.googleLoginExpired',
      code: 'invalid_google_handoff',
      detail: 'Invalid or expired Google handoff code',
    })

    const wrapper = mount(LoginPage, {
      global: globalConfig,
    })

    const googleButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('auth.googleLoginButton'))

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

    const turnstileWidgets = wrapper.findAllComponents({ name: 'TurnstileWidget' })
    turnstileWidgets.at(-1)!.vm.$emit('verify', 'verified-token')
    await flushPromises()

    expect(wrapper.text()).toContain('auth.error.googleLoginExpired')
    expect(wrapper.text()).not.toContain('auth.clientChallengeHint')
  })

  it('exits the register Google challenge state when the handoff has expired', async () => {
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
    vi.spyOn(window, 'open').mockReturnValue({
      closed: false,
      focus: vi.fn(),
      close: vi.fn(),
    } as unknown as Window)

    testState.googleAuth.prepareGoogleAuthHandoff.mockResolvedValueOnce({
      status: 'challenge-required',
      handoffCode: 'popup-handoff',
      siteKey: 'site-key',
    })
    testState.authStore.completeGoogleAuth = vi.fn().mockResolvedValue({
      status: 'error',
      error: 'auth.error.googleLoginExpired',
      code: 'invalid_google_handoff',
      detail: 'Invalid or expired Google handoff code',
    })

    const wrapper = mount(RegisterPage, {
      global: globalConfig,
    })

    const googleButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('auth.googleRegisterButton'))

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

    const turnstileWidgets = wrapper.findAllComponents({ name: 'TurnstileWidget' })
    turnstileWidgets.at(-1)!.vm.$emit('verify', 'verified-token')
    await flushPromises()

    expect(wrapper.text()).toContain('auth.error.googleLoginExpired')
    expect(wrapper.text()).not.toContain('auth.clientChallengeHint')
  })
})
