import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const deviceMocks = vi.hoisted(() => ({
  fetchSessions: vi.fn(),
  revokeSession: vi.fn(),
  toggleTrust: vi.fn(),
  updateDeviceName: vi.fn(),
  startEditing: vi.fn(),
  cancelEditing: vi.fn(),
  getDeviceIcon: vi.fn(() => ({ name: 'DeviceIcon' })),
  formatRelativeTime: vi.fn((value: string | null | undefined) => `relative:${value ?? 'none'}`),
}))

type DeviceSession = {
  id: string
  is_current: boolean
  is_trusted: boolean
  device_name?: string
  device_type?: string
  device_browser?: string
  device_os?: string
  browser?: string
  os?: string
  ip_address?: string
  last_ip?: string
  city?: string
  country?: string
  last_active_at?: string
  last_used_at?: string
  last_login_at?: string
  first_seen_at?: string
  login_count?: number | null
  device_info?: string
  ip_change_count?: number
}

const ownSessionState = {
  sessions: ref<DeviceSession[]>([]),
  isLoading: ref(false),
  fetchSessions: deviceMocks.fetchSessions,
  revokeSession: deviceMocks.revokeSession,
  toggleTrust: deviceMocks.toggleTrust,
  updateDeviceName: deviceMocks.updateDeviceName,
}

const editingState = {
  editingSessionId: ref<string | number | null>(null),
  editingDeviceName: ref(''),
  startEditing: deviceMocks.startEditing,
  cancelEditing: deviceMocks.cancelEditing,
}

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}))

vi.mock('@/composables/useSessionManagement', () => ({
  useSessionManagement: () => ownSessionState,
}))

vi.mock('@/composables/useDeviceNameEditor', () => ({
  useDeviceNameEditor: () => editingState,
}))

vi.mock('@/utils/deviceHelpers', () => ({
  getDeviceIcon: deviceMocks.getDeviceIcon,
  formatRelativeTime: deviceMocks.formatRelativeTime,
}))

vi.mock('@/components/animation/AnimatedIcon.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'MockAnimatedIcon',
      props: ['fallbackIcon', 'size'],
      template: '<span data-testid="animated-icon" :data-size="size" />',
    }),
  }
})

import DeviceManagement from '../DeviceManagement.vue'

describe('DeviceManagement', () => {
  beforeEach(() => {
    deviceMocks.fetchSessions.mockReset()
    deviceMocks.revokeSession.mockReset()
    deviceMocks.toggleTrust.mockReset()
    deviceMocks.updateDeviceName.mockReset()
    deviceMocks.startEditing.mockReset()
    deviceMocks.cancelEditing.mockReset()
    deviceMocks.getDeviceIcon.mockClear()
    deviceMocks.formatRelativeTime.mockClear()
    ownSessionState.sessions.value = []
    ownSessionState.isLoading.value = false
    editingState.editingSessionId.value = null
    editingState.editingDeviceName.value = ''
    deviceMocks.updateDeviceName.mockResolvedValue(true)
  })

  it('fetches own sessions on mount and renders loading state when external props are absent', async () => {
    const wrapper = mount(DeviceManagement, {
      props: {
        isLoading: true,
      },
    })
    await flushPromises()

    expect(deviceMocks.fetchSessions).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('.skeleton-card')).toHaveLength(3)
  })

  it('renders provided sessions and supports trust/revoke/edit actions', async () => {
    const sessions = [
      {
        id: 'current',
        is_current: true,
        is_trusted: true,
        device_name: 'Work Mac',
        device_type: 'desktop',
        device_browser: 'Chrome',
        device_os: 'macOS',
        ip_address: '127.0.0.1',
        city: 'Tokyo',
        country: 'JP',
        last_active_at: '2026-04-11T00:00:00.000Z',
        last_login_at: '2026-04-10T00:00:00.000Z',
        first_seen_at: '2026-04-01T00:00:00.000Z',
        login_count: 5,
        device_info: 'Chrome on macOS',
        ip_change_count: 6,
      },
      {
        id: 'other',
        is_current: false,
        is_trusted: false,
        device_name: '',
        device_type: 'mobile',
        browser: 'Safari',
        os: 'iOS',
        last_ip: '192.168.0.2',
        country: 'US',
        last_used_at: '2026-04-12T00:00:00.000Z',
      },
    ]

    const wrapper = mount(DeviceManagement, {
      props: {
        sessions,
        isLoading: false,
      },
    })

    expect(deviceMocks.fetchSessions).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Work Mac')
    expect(wrapper.text()).toContain('devices.currentDevice')
    expect(wrapper.text()).toContain('devices.trusted')
    expect(wrapper.text()).toContain('127.0.0.1 · Tokyo, JP')
    expect(wrapper.text()).toContain('devices.ipChangeWarning:{"count":6}')
    expect(wrapper.text()).toContain('Safari on iOS')
    expect(wrapper.text()).toContain('192.168.0.2 · US')

    await wrapper.get('.btn-trust').trigger('click')
    expect(deviceMocks.toggleTrust).toHaveBeenCalledWith(sessions[0])

    await wrapper.get('.btn-revoke').trigger('click')
    expect(deviceMocks.revokeSession).toHaveBeenCalledWith('other')

    await wrapper.get('.btn-edit').trigger('click')
    expect(deviceMocks.startEditing).toHaveBeenCalledWith(sessions[0])
  })

  it('saves edited device names and clears editor state on success', async () => {
    editingState.editingSessionId.value = 'current'
    editingState.editingDeviceName.value = 'Renamed device'

    const wrapper = mount(DeviceManagement, {
      props: {
        sessions: [
          {
            id: 'current',
            is_current: true,
            is_trusted: false,
            device_name: 'Old name',
            device_type: 'desktop',
          },
        ],
      },
    })

    await wrapper.get('.device-name-input').trigger('keyup.enter')
    await flushPromises()

    expect(deviceMocks.updateDeviceName).toHaveBeenCalledWith('current', 'Renamed device')
    expect(deviceMocks.cancelEditing).toHaveBeenCalled()
  })
})
