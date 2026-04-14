import { flushPromises, mount } from '@vue/test-utils'
import { reactive, ref, toRefs } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  routerPush: vi.fn(),
  getFollowers: vi.fn(),
  getFollowing: vi.fn(),
  getBlockedUsers: vi.fn(),
  getSummary: vi.fn(),
  unfollowUser: vi.fn(),
  unblockUser: vi.fn(),
  authStore: {
    user: {
      id: 'self-user',
    },
  },
  toastStore: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: state.routerPush,
  }),
}))

vi.mock('pinia', async () => {
  const actual = await vi.importActual<typeof import('pinia')>('pinia')
  return {
    ...actual,
    storeToRefs: <T extends object>(store: T) => toRefs(store),
  }
})

vi.mock('@/stores', () => {
  const authStore = reactive(state.authStore)
  return {
    useAuthStore: () => authStore,
    useToastStore: () => state.toastStore,
  }
})

vi.mock('@/api', () => {
  class MockApiError extends Error {}

  return {
    ApiError: MockApiError,
    userRelationsService: {
      getFollowers: state.getFollowers,
      getFollowing: state.getFollowing,
      getBlockedUsers: state.getBlockedUsers,
      getSummary: state.getSummary,
      unfollowUser: state.unfollowUser,
      unblockUser: state.unblockUser,
    },
  }
})

vi.mock('@/api/summaryCounts', () => ({
  normalizeRelationsSummaryCounts: vi.fn(
    (value: { followers?: number | null; following?: number | null; blocked?: number | null }) => ({
      followers: value.followers ?? null,
      following: value.following ?? null,
      blocked: value.blocked ?? null,
    })
  ),
}))

vi.mock('@/composables/usePreferredPageSize', () => ({
  usePreferredPageSize: () => ref(20),
}))

vi.mock('@/utils/avatarPresentation', () => ({
  getAvatarFallbackLabel: vi.fn((username: string) => username.slice(0, 1).toUpperCase()),
  resolveAvatarSrc: vi.fn((value: string | null | undefined) => value ?? ''),
}))

vi.mock('@/components/profile/ProfileTabHeader.vue', () => ({
  default: {
    template: '<div class="profile-tab-header-stub" />',
  },
}))

vi.mock('@/components/ui/Avatar.vue', () => ({
  default: {
    props: ['src', 'alt', 'fallback'],
    template:
      '<div class="avatar-stub" :data-src="src" :data-alt="alt" :data-fallback="fallback" />',
  },
}))

vi.mock('@/components/ui/Button.vue', () => ({
  default: {
    props: ['loading', 'variant', 'size', 'type'],
    emits: ['click'],
    template:
      '<button type="button" class="button-stub" :data-loading="String(loading)" @click="$emit(\'click\')"><slot /></button>',
  },
}))

vi.mock('@/components/ui/LoadMoreSection.vue', () => ({
  default: {
    template: '<div class="load-more-section-stub" />',
  },
}))

vi.mock('@/components/ui/Skeleton.vue', () => ({
  default: {
    template: '<div class="skeleton-stub" />',
  },
}))

vi.mock('@/components/ui/StateIndicator.vue', () => ({
  default: {
    props: ['variant', 'description'],
    template:
      '<div class="state-indicator-stub" :data-variant="variant" :data-description="description" />',
  },
}))

import ProfileRelationsTab from '../ProfileRelationsTab.vue'

describe('ProfileRelationsTab', () => {
  beforeEach(() => {
    state.routerPush.mockReset()
    state.getFollowers.mockReset()
    state.getFollowing.mockReset()
    state.getBlockedUsers.mockReset()
    state.getSummary.mockReset()
    state.unfollowUser.mockReset()
    state.unblockUser.mockReset()
    state.toastStore.success.mockReset()
    state.toastStore.error.mockReset()
    state.authStore.user.id = 'self-user'
  })

  it('renders followers mode with self badge and routes the current user back to /profile', async () => {
    state.getFollowers.mockResolvedValue({
      items: [
        {
          id: 'self-user',
          username: 'me',
          bio: 'Owner account',
          follower_count: 10,
          following_count: 5,
          created_at: '2026-04-14T08:00:00.000Z',
        },
      ],
      has_more: false,
      next_cursor: null,
    })
    state.getSummary.mockResolvedValue({ followers: 1 })

    const wrapper = mount(ProfileRelationsTab, {
      props: {
        mode: 'followers',
        showHeader: false,
      },
      global: {
        mocks: {
          $t: (key: string, params?: { count?: number }) =>
            params?.count != null ? `${key}:${params.count}` : key,
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('me')
    expect(wrapper.text()).toContain('profile.you')
    expect(wrapper.text()).not.toContain('profile.unfollowAction')
    expect(wrapper.text()).not.toContain('profile.unblockAction')

    await wrapper.get('.button-stub').trigger('click')
    expect(state.routerPush).toHaveBeenCalledWith('/profile')
  })

  it('handles following mode actions by removing the target locally and emitting a single success toast', async () => {
    state.getFollowing.mockResolvedValue({
      items: [
        {
          id: 'followed-user',
          username: 'alice',
          bio: 'Followed account',
          follower_count: 3,
          following_count: 7,
          created_at: '2026-04-14T09:00:00.000Z',
        },
      ],
      has_more: false,
      next_cursor: null,
    })
    state.getSummary.mockResolvedValue({ following: 1 })
    state.unfollowUser.mockResolvedValue(undefined)

    const wrapper = mount(ProfileRelationsTab, {
      props: {
        mode: 'following',
        showHeader: false,
      },
      global: {
        mocks: {
          $t: (key: string, params?: { count?: number }) =>
            params?.count != null ? `${key}:${params.count}` : key,
        },
      },
    })

    await flushPromises()

    const buttons = wrapper.findAll('.button-stub')
    await buttons[1]!.trigger('click')
    await flushPromises()

    expect(state.unfollowUser).toHaveBeenCalledWith('followed-user')
    expect(wrapper.findAll('.relation-card')).toHaveLength(0)
    expect(state.toastStore.success).toHaveBeenCalledWith('profile.unfollowSuccess')
    expect(state.toastStore.error).not.toHaveBeenCalled()
  })

  it('handles blocked mode actions by unblocking the target and preserving single-path feedback', async () => {
    state.getBlockedUsers.mockResolvedValue({
      items: [
        {
          id: 'blocked-user',
          username: 'bob',
          bio: null,
          follower_count: 0,
          following_count: 1,
          created_at: '2026-04-14T10:00:00.000Z',
        },
      ],
      has_more: false,
      next_cursor: null,
    })
    state.getSummary.mockResolvedValue({ blocked: 1 })
    state.unblockUser.mockResolvedValue(undefined)

    const wrapper = mount(ProfileRelationsTab, {
      props: {
        mode: 'blocked',
        showHeader: false,
      },
      global: {
        mocks: {
          $t: (key: string, params?: { count?: number }) =>
            params?.count != null ? `${key}:${params.count}` : key,
        },
      },
    })

    await flushPromises()

    const buttons = wrapper.findAll('.button-stub')
    await buttons[1]!.trigger('click')
    await flushPromises()

    expect(state.unblockUser).toHaveBeenCalledWith('blocked-user')
    expect(wrapper.findAll('.relation-card')).toHaveLength(0)
    expect(state.toastStore.success).toHaveBeenCalledWith('profile.unblockSuccess')
    expect(state.toastStore.error).not.toHaveBeenCalled()
  })
})
