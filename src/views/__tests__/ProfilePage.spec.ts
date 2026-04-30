import { reactive, toRefs } from 'vue'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  routerPush: vi.fn(),
  authStore: {
    user: {
      id: 'user-1',
      username: 'alice',
      avatar_url: null,
      full_name: 'Alice',
    },
  },
  notificationsStore: {
    unreadDisplayCount: 12,
    fetchSummary: vi.fn().mockResolvedValue(undefined),
  },
  ensureProtectedPageReady: vi.fn().mockResolvedValue(true),
  getDataSummary: vi.fn().mockResolvedValue({
    data_counts: {
      favorites: 5,
      comments: 3,
      followers: 11,
      following: 7,
      comment_favorites: 2,
      browsing_history: 4,
      likes: 9,
      reports: 1,
      notifications: 12,
      blocked: 0,
    },
  }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return {
    ...actual,
    useRoute: () => ({
      fullPath: '/profile',
    }),
    useRouter: () => ({
      push: state.routerPush,
    }),
  }
})

vi.mock('pinia', async () => {
  const actual = await vi.importActual<typeof import('pinia')>('pinia')
  return {
    ...actual,
    storeToRefs: <T extends object>(store: T) => toRefs(store),
  }
})

vi.mock('@/stores', () => {
  const authStore = reactive(state.authStore)
  const notificationsStore = reactive(state.notificationsStore)
  return {
    useAuthStore: () => authStore,
    useNotificationsStore: () => notificationsStore,
  }
})

vi.mock('@/composables/useUserAvatar', () => ({
  getUserAvatarUrl: vi.fn(() => '/avatar.png'),
}))

vi.mock('@/composables/useProtectedPageBootstrap', () => ({
  ensureProtectedPageReady: state.ensureProtectedPageReady,
}))

vi.mock('@/api/userService', () => ({
  userService: {
    getDataSummary: state.getDataSummary,
  },
}))

vi.mock('@/components/ui/Avatar.vue', () => ({
  default: {
    props: ['src', 'alt'],
    template: '<img class="avatar-stub" :src="src" :alt="alt" />',
  },
}))

vi.mock('@/components/appearance/ControlButton.vue', () => ({
  default: {
    emits: ['click'],
    template:
      '<button type="button" class="control-button-stub" @click="$emit(\'click\')"><slot /></button>',
  },
}))

import ProfilePage from '../ProfilePage.vue'
import { profileSections } from '@/config/profileSections'

const groupedProfileSectionRoutes = ['content', 'activity', 'network', 'account'].flatMap((group) =>
  profileSections
    .filter((section) => section.group === group)
    .map((section) => ({
      path: section.route,
      query: {
        returnTo: '/profile',
      },
    }))
)

describe('ProfilePage', () => {
  beforeEach(() => {
    state.routerPush.mockReset()
    state.notificationsStore.fetchSummary.mockClear()
    state.ensureProtectedPageReady.mockClear()
    state.ensureProtectedPageReady.mockResolvedValue(true)
    state.getDataSummary.mockClear()
    state.getDataSummary.mockResolvedValue({
      data_counts: {
        favorites: 5,
        comments: 3,
        followers: 11,
        following: 7,
        comment_favorites: 2,
        browsing_history: 4,
        likes: 9,
        reports: 1,
        notifications: 12,
        blocked: 0,
      },
    })
  })

  it('renders overview summary cards and section links for every profile child route', async () => {
    const wrapper = mount(ProfilePage, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    await flushPromises()

    expect(state.ensureProtectedPageReady).toHaveBeenCalledWith(expect.anything(), 'authenticated')
    expect(state.getDataSummary).toHaveBeenCalledTimes(1)
    expect(state.notificationsStore.fetchSummary).toHaveBeenCalledTimes(1)

    const summaryCards = wrapper.findAll('.summary-card')
    expect(summaryCards).toHaveLength(4)
    expect(wrapper.text()).toContain('5')
    expect(wrapper.text()).toContain('11')
    expect(wrapper.find('.profile-command-grid').exists()).toBe(true)
    expect(wrapper.findAll('.profile-command-link').length).toBeGreaterThanOrEqual(4)
    expect(wrapper.find('.profile-command-card--security').text()).toContain(
      'profile.securityHubTitle'
    )

    const links = wrapper.findAllComponents(RouterLinkStub)
    const linkTargets = links.map((link) => link.props('to'))
    expect(linkTargets).toEqual(
      expect.arrayContaining([
        {
          path: '/profile/security',
          query: { returnTo: '/profile' },
        },
        ...groupedProfileSectionRoutes,
      ])
    )
    expect(linkTargets).toContainEqual({
      path: '/profile/settings',
      query: { returnTo: '/profile' },
    })
    expect(linkTargets).toContainEqual({
      path: '/profile/notifications',
      query: { returnTo: '/profile' },
    })
    expect(linkTargets).toContainEqual({
      path: '/profile/favorites',
      query: { returnTo: '/profile' },
    })
    expect(linkTargets).not.toContainEqual({
      path: '/profile/devices',
      query: { returnTo: '/profile' },
    })
    expect(linkTargets).not.toContainEqual({
      path: '/profile/security-activity',
      query: { returnTo: '/profile' },
    })
    expect(wrapper.text()).toContain('profile.securityHubTitle')
  })

  it('redirects to login when protected bootstrap fails and routes edit button to profile settings', async () => {
    state.ensureProtectedPageReady.mockResolvedValueOnce(false)

    const wrapper = mount(ProfilePage, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    await flushPromises()

    expect(state.routerPush).toHaveBeenCalledWith('/login')

    await wrapper.find('.control-button-stub').trigger('click')
    expect(state.routerPush).toHaveBeenCalledWith({
      path: '/profile/settings',
      hash: '#basic-info',
      query: { returnTo: '/profile' },
    })
  })
})
