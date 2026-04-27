import { flushPromises, mount } from '@vue/test-utils'
import { computed } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'

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
  getMySecuritySummary: vi.fn().mockResolvedValue({
    total_logins: 12,
    failed_logins: 1,
    password_changes: 1,
    new_devices: 2,
    security_events: 4,
    last_login: '2026-04-28T00:00:00.000Z',
    last_password_change: '2026-04-21T00:00:00.000Z',
  }),
  authUser: {
    username: 'domi',
    email: 'domi@example.com',
    identity_provider: 'local',
  },
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
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
    auditService: {
      getMySecuritySummary: securityPageState.getMySecuritySummary,
    },
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

function createTestRouter(initialPath = '/profile/security') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/profile/security', component: ProfileSecurityPage }],
  })

  return router
    .push(initialPath)
    .then(() => router.isReady())
    .then(() => router)
}

describe('ProfileSecurityPage', () => {
  beforeEach(() => {
    securityPageState.fetchSessions.mockClear()
    securityPageState.revokeAllOthers.mockClear()
    securityPageState.getProfile.mockClear()
    securityPageState.getMySecuritySummary.mockClear()
  })

  it('renders the security console with overview entries and a default credentials workspace', async () => {
    const router = await createTestRouter()
    const wrapper = mount(ProfileSecurityPage, {
      global: {
        plugins: [router],
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
    expect(wrapper.findAll('.security-entry')).toHaveLength(4)
    expect(wrapper.find('[data-testid="profile-security-workspace"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="profile-security-credentials-panel"]').isVisible()).toBe(
      true
    )
    expect(wrapper.find('[data-testid="profile-security-credentials"]').exists()).toBe(true)
    expect(securityPageState.fetchSessions).toHaveBeenCalledTimes(1)
    expect(securityPageState.getProfile).toHaveBeenCalledTimes(1)
  })

  it('opens the devices workspace and keeps revoke-all wired', async () => {
    const router = await createTestRouter('/profile/security#devices')
    const wrapper = mount(ProfileSecurityPage, {
      global: {
        plugins: [router],
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

    expect(wrapper.find('[data-testid="profile-security-devices-section"]').isVisible()).toBe(true)
    expect(wrapper.find('[data-testid="profile-security-devices"]').attributes('data-count')).toBe(
      '2'
    )

    const revokeButton = wrapper
      .findAll('button')
      .find((node) => node.text().includes('devices.revokeAll'))

    await revokeButton?.trigger('click')

    expect(securityPageState.revokeAllOthers).toHaveBeenCalledTimes(1)
  })

  it('switches workspace when activity hash is requested', async () => {
    const router = await createTestRouter('/profile/security#activity')
    const wrapper = mount(ProfileSecurityPage, {
      global: {
        plugins: [router],
        mocks: {
          $t: (key: string) => key,
        },
        stubs: {
          Shield: true,
          ShieldAlert: true,
          Monitor: true,
          History: true,
          RefreshCw: true,
          Fingerprint: true,
          Mail: true,
          ChevronRight: true,
        },
      },
    })

    await flushPromises()

    expect(wrapper.find('[data-testid="profile-security-activity-section"]').isVisible()).toBe(true)
    expect(
      wrapper.find('[data-testid="profile-security-activity"]').attributes('data-header')
    ).toBe('false')
  })
})
