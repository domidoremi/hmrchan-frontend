import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const securityMocks = vi.hoisted(() => ({
  getMySecuritySummary: vi.fn(),
  getMyActivity: vi.fn(),
  formatRelativeTime: vi.fn((value: string | null | undefined) => `relative:${value ?? 'none'}`),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/api', () => {
  class MockApiError extends Error {}
  return {
    ApiError: MockApiError,
    auditService: {
      getMySecuritySummary: securityMocks.getMySecuritySummary,
      getMyActivity: securityMocks.getMyActivity,
    },
  }
})

vi.mock('@/utils/date', () => ({
  formatRelativeTime: securityMocks.formatRelativeTime,
}))

vi.mock('@/components/ui/Skeleton.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({ name: 'MockSkeleton', template: '<div data-testid="skeleton" />' }),
  }
})

vi.mock('@/components/ui/StateIndicator.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'MockStateIndicator',
      props: ['variant', 'description'],
      emits: ['action'],
      template:
        '<div data-testid="state-indicator" :data-variant="variant" :data-description="description" @click="$emit(\'action\')" />',
    }),
  }
})

import ProfileSecurityTab from '../ProfileSecurityTab.vue'

describe('ProfileSecurityTab', () => {
  beforeEach(() => {
    securityMocks.getMySecuritySummary.mockReset()
    securityMocks.getMyActivity.mockReset()
    securityMocks.formatRelativeTime.mockClear()

    securityMocks.getMySecuritySummary.mockResolvedValue({
      total_logins: 20,
      failed_logins: 2,
      password_changes: 1,
      new_devices: 3,
      security_events: 8,
      last_login: '2026-04-10T00:00:00.000Z',
      last_password_change: '2026-04-09T00:00:00.000Z',
    })
    securityMocks.getMyActivity.mockResolvedValue({
      logs: [
        {
          id: 'log-1',
          success: true,
          event_type: 'login',
          event_description: 'Successful login',
          created_at: '2026-04-10T00:00:00.000Z',
          request_path: '/login',
          ip_address: '127.0.0.1',
          device_type: 'desktop',
        },
      ],
    })
  })

  it('loads and renders security summary and activity feed', async () => {
    const wrapper = mount(ProfileSecurityTab, {
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    })
    await flushPromises()

    expect(securityMocks.getMySecuritySummary).toHaveBeenCalledWith(30)
    expect(securityMocks.getMyActivity).toHaveBeenCalledWith({ days: 30, limit: 10 })
    expect(wrapper.text()).toContain('8')
    expect(wrapper.text()).toContain('20')
    expect(wrapper.text()).toContain('Successful login')
    expect(wrapper.text()).toContain('relative:2026-04-10T00:00:00.000Z')
    expect(wrapper.text()).toContain('/login')
    expect(wrapper.text()).toContain('127.0.0.1')
  })

  it('shows error state and retries on action', async () => {
    securityMocks.getMySecuritySummary.mockRejectedValueOnce(new Error('boom'))
    securityMocks.getMyActivity.mockRejectedValueOnce(new Error('boom'))

    const wrapper = mount(ProfileSecurityTab, {
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    })
    await flushPromises()

    const indicator = wrapper.get('[data-testid="state-indicator"]')
    expect(indicator.attributes('data-variant')).toBe('error')
    expect(indicator.attributes('data-description')).toBe('common.error')

    await indicator.trigger('click')
    await flushPromises()

    expect(securityMocks.getMySecuritySummary).toHaveBeenCalledTimes(2)
    expect(securityMocks.getMyActivity).toHaveBeenCalledTimes(2)
  })
})
