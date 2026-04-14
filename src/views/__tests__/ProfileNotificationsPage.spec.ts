import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const testState = vi.hoisted(() => ({
  store: {
    items: [],
    status: 'all' as 'all' | 'unread' | 'archived',
    category: 'all' as 'all' | 'interaction' | 'security' | 'system',
    unreadCount: 99,
    unreadDisplayCount: '99+',
    isLoading: false,
    isSummaryLoading: false,
    isPreferencesLoading: false,
    error: null as string | null,
    summaryError: null as string | null,
    preferencesError: null as string | null,
    streamError: null as string | null,
    streamState: 'live' as 'idle' | 'connecting' | 'live' | 'reconnecting' | 'degraded',
    summary: {
      total: { count: 99, is_capped: true },
      categories: {
        interaction: { count: 12, is_capped: false },
        security: { count: 2, is_capped: false },
        system: { count: 0, is_capped: false },
      },
    },
    preferencesLoaded: false,
    hasMore: false,
    savingPreferences: {
      interaction: false,
      security: false,
      system: false,
    },
    preferencesByCategory: {
      interaction: { category: 'interaction', inbox_enabled: true, email_enabled: false },
      security: { category: 'security', inbox_enabled: true, email_enabled: true },
      system: { category: 'system', inbox_enabled: true, email_enabled: true },
    },
    initialize: vi.fn().mockResolvedValue(true),
    stopStream: vi.fn(),
    retryStream: vi.fn().mockResolvedValue(true),
    fetchPreferences: vi.fn().mockResolvedValue(true),
    markAllAsRead: vi.fn().mockResolvedValue(true),
    archiveRead: vi.fn().mockResolvedValue(true),
    savePreferences: vi.fn().mockResolvedValue(true),
    setStatus: vi.fn(),
    setCategory: vi.fn(),
  },
  toastStore: {
    success: vi.fn(),
    error: vi.fn(),
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

vi.mock('@/stores', async () => {
  const { reactive } = await vi.importActual<typeof import('vue')>('vue')
  const store = reactive(testState.store)
  return {
    useNotificationsStore: () => store,
    useToastStore: () => testState.toastStore,
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

vi.mock('@/components/profile/ProfileNotificationsTab.vue', () => ({
  default: {
    template:
      '<div class="profile-notifications-tab-stub" data-testid="profile-notifications-tab" />',
  },
}))

vi.mock('@/components/ui/Button.vue', () => ({
  default: {
    emits: ['click'],
    template: `<button type="button" @click="$emit('click')"><slot /></button>`,
  },
}))

vi.mock('@/components/ui/Switch.vue', () => ({
  default: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: `
      <button
        type="button"
        class="switch-stub"
        @click="$emit('update:modelValue', !modelValue)"
      >
        {{ modelValue }}
      </button>
    `,
  },
}))

import ProfileNotificationsPage from '../ProfileNotificationsPage.vue'

const globalConfig = {
  mocks: {
    $t: (key: string) => key,
  },
  stubs: {
    Transition: {
      template: '<div><slot /></div>',
    },
  },
}

describe('ProfileNotificationsPage', () => {
  beforeEach(() => {
    testState.store.status = 'all'
    testState.store.category = 'all'
    testState.store.unreadCount = 99
    testState.store.unreadDisplayCount = '99+'
    testState.store.summary = {
      total: { count: 99, is_capped: true },
      categories: {
        interaction: { count: 12, is_capped: false },
        security: { count: 2, is_capped: false },
        system: { count: 0, is_capped: false },
      },
    }
    testState.store.preferencesLoaded = false
    testState.store.preferencesError = null
    testState.store.streamError = null
    testState.store.streamState = 'live'

    testState.store.initialize.mockClear()
    testState.store.stopStream.mockClear()
    testState.store.retryStream.mockClear()
    testState.store.fetchPreferences.mockClear()
    testState.store.markAllAsRead.mockClear()
    testState.store.archiveRead.mockClear()
    testState.store.savePreferences.mockClear()
    testState.store.setStatus.mockClear()
    testState.store.setCategory.mockClear()
    testState.toastStore.success.mockClear()
    testState.toastStore.error.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initializes the inbox view and renders status/category filters with summary badges', () => {
    const wrapper = mount(ProfileNotificationsPage, {
      global: globalConfig,
    })

    expect(testState.store.initialize).toHaveBeenCalledTimes(1)
    expect(wrapper.attributes('data-testid')).toBe('profile-notifications-page')
    expect(wrapper.find('[data-testid="profile-notifications-tab"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('99+')
    expect(wrapper.text()).toContain('profile.notificationStatus.all')
    expect(wrapper.text()).toContain('profile.notificationStatus.unread')
    expect(wrapper.text()).toContain('profile.notificationCategories.interaction')
    expect(wrapper.text()).toContain('profile.notificationCategories.security')
  })

  it('loads preferences lazily when the preferences panel opens', async () => {
    const wrapper = mount(ProfileNotificationsPage, {
      global: globalConfig,
    })

    expect(wrapper.attributes('data-testid')).toBe('profile-notifications-page')

    const preferencesButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('profile.notificationPreferences'))

    expect(preferencesButton).toBeDefined()

    await preferencesButton!.trigger('click')
    await flushPromises()

    expect(testState.store.fetchPreferences).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('profile.notificationInApp')
    expect(wrapper.text()).toContain('profile.notificationEmail')
  })

  it('runs mark-all-read, archive-read, and retry actions from the page header', async () => {
    testState.store.streamState = 'degraded'
    testState.store.streamError = 'notification.error.streamDegraded'

    const wrapper = mount(ProfileNotificationsPage, {
      global: globalConfig,
    })

    expect(wrapper.find('[data-testid="profile-notifications-tab"]').exists()).toBe(true)

    const buttons = wrapper.findAll('button')
    const markAllReadButton = buttons.find((button) =>
      button.text().includes('profile.markAllRead')
    )
    const archiveReadButton = buttons.find((button) =>
      button.text().includes('profile.archiveRead')
    )
    const retryButton = buttons.find((button) => button.text().includes('profile.retryRealtime'))

    expect(markAllReadButton).toBeDefined()
    expect(archiveReadButton).toBeDefined()
    expect(retryButton).toBeDefined()

    await markAllReadButton!.trigger('click')
    await archiveReadButton!.trigger('click')
    await retryButton!.trigger('click')
    await flushPromises()

    expect(testState.store.markAllAsRead).toHaveBeenCalledTimes(1)
    expect(testState.store.archiveRead).toHaveBeenCalledTimes(1)
    expect(testState.store.retryStream).toHaveBeenCalledTimes(1)
    expect(testState.toastStore.success).toHaveBeenCalledWith('profile.allMarkedRead')
    expect(testState.toastStore.success).toHaveBeenCalledWith('profile.archiveReadSuccess')
  })
})
