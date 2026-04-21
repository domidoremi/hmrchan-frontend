import { flushPromises, mount } from '@vue/test-utils'
import { computed } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const securityPageState = vi.hoisted(() => ({
  sessions: [
    { id: 'current', is_trusted: true },
    { id: 'other', is_trusted: false },
  ],
  isLoading: false,
  otherSessionsCount: 1,
  fetchSessions: vi.fn().mockResolvedValue(undefined),
  revokeAllOthers: vi.fn().mockResolvedValue(undefined),
  getProfile: vi.fn().mockResolvedValue({
    username: 'domi',
    full_name: 'Domi',
    email: 'domi@example.com',
    bio: '',
    avatar_url: '',
    created_at: '2026-04-01T00:00:00.000Z',
    identity_provider: 'local',
  }),
  authUser: {
    username: 'domi',
    email: 'domi@example.com',
    identity_provider: 'local',
  },
}))

vi.mock('@/composables/useSessionManagement', () => ({
  useSessionManagement: () => ({
    sessions: computed(() => securityPageState.sessions),
    isLoading: computed(() => securityPageState.isLoading),
    otherSessionsCount: computed(() => securityPageState.otherSessionsCount),
    fetchSessions: securityPageState.fetchSessions,
    revokeAllOthers: securityPageState.revokeAllOthers,
  }),
}))

vi.mock('@/components/profile/ProfileSubPageHeader.vue', () => ({
  default: {
    props: ['title', 'subtitle', 'hint'],
    template:
      '<header><h1>{{ title }}</h1><p>{{ subtitle }}</p><p>{{ hint }}</p><slot name="actions" /></header>',
  },
}))

vi.mock('@/components/profile/ProfileSecurityCredentialsSection.vue', () => ({
  default: {
    props: ['profile', 'authUser'],
    template: '<section data-testid="profile-security-credentials" />',
  },
}))

vi.mock('@/components/profile/ProfileSecurityMfaSection.vue', () => ({
  default: {
    template: '<section data-testid="profile-security-mfa" />',
  },
}))

vi.mock('@/components/profile/ProfileSecurityTab.vue', () => ({
  default: {
    props: ['showHeader'],
    template:
      '<section data-testid="profile-security-activity" :data-header="String(showHeader)" />',
  },
}))

vi.mock('@/components/profile/DeviceManagement.vue', () => ({
  default: {
    props: ['sessions', 'isLoading'],
    template:
      '<div data-testid="profile-security-devices" :data-count="sessions.length" :data-loading="String(isLoading)" />',
  },
}))

vi.mock('@/components/ui/Button.vue', () => ({
  default: {
    emits: ['click'],
    template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
  },
}))

vi.mock('@/components/ui/StateIndicator.vue', () => ({
  default: {
    props: ['variant', 'description'],
    emits: ['action'],
    template:
      '<div data-testid="state-indicator" :data-variant="variant" :data-description="description" />',
  },
}))

vi.mock('@/api', () => {
  class MockApiError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  }

  return {
    ApiError: MockApiError,
    userService: {
      getProfile: securityPageState.getProfile,
    },
  }
})

vi.mock('@/stores', () => ({
  useAuthStore: () => ({
    user: securityPageState.authUser,
  }),
}))

import ProfileSecurityPage from '../ProfileSecurityPage.vue'

describe('ProfileSecurityPage', () => {
  beforeEach(() => {
    securityPageState.fetchSessions.mockClear()
    securityPageState.revokeAllOthers.mockClear()
    securityPageState.getProfile.mockClear()
  })

  it('renders credentials, mfa, devices, and activity sections in one security center', async () => {
    const wrapper = mount(ProfileSecurityPage, {
      global: {
        mocks: {
          $t: (key: string) => key,
        },
        stubs: {
          Shield: true,
          ShieldAlert: true,
          Monitor: true,
          History: true,
        },
      },
    })

    await flushPromises()

    expect(wrapper.get('[data-testid="profile-security-page"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('profile.securityHubTitle')
    expect(wrapper.find('[data-testid="profile-security-credentials"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="profile-security-mfa"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="profile-security-devices"]').attributes('data-count')).toBe(
      '2'
    )
    expect(
      wrapper.find('[data-testid="profile-security-activity"]').attributes('data-header')
    ).toBe('false')
    expect(securityPageState.fetchSessions).toHaveBeenCalledTimes(1)
    expect(securityPageState.getProfile).toHaveBeenCalledTimes(1)
  })

  it('keeps the revoke-all action wired from the security center devices section', async () => {
    const wrapper = mount(ProfileSecurityPage, {
      global: {
        mocks: {
          $t: (key: string) => key,
        },
        stubs: {
          Shield: true,
          ShieldAlert: true,
          Monitor: true,
          History: true,
        },
      },
    })

    await flushPromises()
    await wrapper.findAll('button').at(-1)?.trigger('click')

    expect(securityPageState.revokeAllOthers).toHaveBeenCalledTimes(1)
  })
})
