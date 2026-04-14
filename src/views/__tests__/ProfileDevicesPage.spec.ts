import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  sessions: [
    { id: 'current', is_trusted: true },
    { id: 'other', is_trusted: false },
  ],
  isLoading: false,
  otherSessionsCount: 1,
  fetchSessions: vi.fn().mockResolvedValue(undefined),
  revokeAllOthers: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/composables/useSessionManagement', async () => {
  const { computed } = await import('vue')
  return {
    useSessionManagement: () => ({
      sessions: computed(() => state.sessions),
      isLoading: computed(() => state.isLoading),
      otherSessionsCount: computed(() => state.otherSessionsCount),
      fetchSessions: state.fetchSessions,
      revokeAllOthers: state.revokeAllOthers,
    }),
  }
})

vi.mock('@/components/profile/ProfileSubPageHeader.vue', () => ({
  default: {
    props: ['title', 'subtitle', 'hint'],
    template: `
      <header class="profile-sub-page-header-stub">
        <h1>{{ title }}</h1>
        <p>{{ subtitle }}</p>
        <small>{{ hint }}</small>
        <slot name="actions" />
      </header>
    `,
  },
}))

vi.mock('@/components/profile/DeviceManagement.vue', () => ({
  default: {
    props: ['sessions', 'isLoading'],
    template: `
      <div
        class="device-management-stub"
        data-testid="profile-devices-management"
        :data-loading="String(isLoading)"
        :data-count="sessions.length"
      />
    `,
  },
}))

vi.mock('@/components/ui/Button.vue', () => ({
  default: {
    emits: ['click'],
    template:
      '<button type="button" class="button-stub" @click="$emit(\'click\')"><slot /></button>',
  },
}))

vi.mock('@/components/animation/AnimatedIcon.vue', () => ({
  default: { template: '<span class="animated-icon-stub" />' },
}))

import ProfileDevicesPage from '../ProfileDevicesPage.vue'

describe('ProfileDevicesPage', () => {
  beforeEach(() => {
    state.sessions = [
      { id: 'current', is_trusted: true },
      { id: 'other', is_trusted: false },
    ]
    state.isLoading = false
    state.otherSessionsCount = 1
    state.fetchSessions.mockClear()
    state.revokeAllOthers.mockClear()
  })

  it('loads device sessions and renders the devices sub-page header copy', async () => {
    const wrapper = mount(ProfileDevicesPage, {
      global: {
        mocks: {
          $t: (key: string) => key,
        },
        stubs: {
          Monitor: true,
          ShieldCheck: true,
          ShieldAlert: true,
          Fingerprint: true,
          Check: true,
        },
      },
    })

    await flushPromises()

    expect(state.fetchSessions).toHaveBeenCalledTimes(1)
    expect(wrapper.attributes('data-testid')).toBe('profile-devices-page')
    expect(wrapper.find('[data-testid="profile-devices-stats"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('profile.tabs.devices')
    expect(wrapper.text()).toContain('profile.devicesSubtitle')
    expect(
      wrapper.find('[data-testid="profile-devices-management"]').attributes('data-count')
    ).toBe('2')
    expect(wrapper.text()).toContain('devices.activeSessions')
    expect(wrapper.text()).toContain('devices.trustedDevices')
  })

  it('keeps the revoke-all action on the devices page wired to the current session state', async () => {
    const wrapper = mount(ProfileDevicesPage, {
      global: {
        mocks: {
          $t: (key: string) => key,
        },
        stubs: {
          Monitor: true,
          ShieldCheck: true,
          ShieldAlert: true,
          Fingerprint: true,
          Check: true,
        },
      },
    })

    await flushPromises()

    await wrapper.get('.button-stub').trigger('click')
    expect(state.revokeAllOthers).toHaveBeenCalledTimes(1)
  })
})
