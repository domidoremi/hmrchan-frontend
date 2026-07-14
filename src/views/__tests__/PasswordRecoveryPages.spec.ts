import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import ForgotPasswordPage from '@/views/ForgotPasswordPage.vue'
import ResetPasswordPage from '@/views/ResetPasswordPage.vue'

const mocks = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}))

vi.mock('@/api/authService', () => ({
  requestPasswordReset: mocks.requestPasswordReset,
  resetPassword: mocks.resetPassword,
}))

async function mountRecoveryPage(path: string, component: typeof ForgotPasswordPage) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/forgot-password', component: ForgotPasswordPage },
      { path: '/reset-password', component: ResetPasswordPage },
      { path: '/login', component: { template: '<div class="login-page" />' } },
    ],
  })
  await router.push(path)
  await router.isReady()

  return {
    router,
    wrapper: mount(component, {
      global: { plugins: [router] },
    }),
  }
}

describe('password recovery pages', () => {
  beforeEach(() => {
    mocks.requestPasswordReset.mockReset()
    mocks.requestPasswordReset.mockResolvedValue({})
    mocks.resetPassword.mockReset()
    mocks.resetPassword.mockResolvedValue({})
  })

  it('requests a reset code without exposing account existence', async () => {
    const { wrapper } = await mountRecoveryPage('/forgot-password', ForgotPasswordPage)

    await wrapper.find('#email').setValue('momi@example.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.requestPasswordReset).toHaveBeenCalledExactlyOnceWith({
      email: 'momi@example.com',
    })
    expect(wrapper.find('.status-icon--success').exists()).toBe(true)
    expect(wrapper.text()).toContain('如果该邮箱存在')
  })

  it('prefills the reset code and submits matching passwords', async () => {
    const { wrapper } = await mountRecoveryPage('/reset-password?token=246810', ResetPasswordPage)

    expect(wrapper.find<HTMLInputElement>('#reset_token').element.value).toBe('246810')
    await wrapper.find('#new_password').setValue('New-password-123')
    await wrapper.find('#confirm_password').setValue('New-password-123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.resetPassword).toHaveBeenCalledExactlyOnceWith({
      token: '246810',
      newPassword: 'New-password-123',
    })
    expect(wrapper.find('.status-icon--success').exists()).toBe(true)
  })

  it('blocks mismatched passwords before calling the reset API', async () => {
    const { wrapper } = await mountRecoveryPage('/reset-password?code=246810', ResetPasswordPage)

    await wrapper.find('#new_password').setValue('New-password-123')
    await wrapper.find('#confirm_password').setValue('Different-password-456')
    await wrapper.find('form').trigger('submit')

    expect(mocks.resetPassword).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').text()).toContain('不一致')
  })
})
