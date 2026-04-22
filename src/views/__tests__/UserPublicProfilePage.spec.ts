import { flushPromises, mount } from '@vue/test-utils'
import { reactive, toRefs } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  route: {
    params: { id: 'user-2' },
    fullPath: '/users/user-2',
  },
  router: {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  },
  authStore: {
    user: null as null | { id: string },
    isAuthenticated: false,
  },
  toastStore: {
    success: vi.fn(),
    error: vi.fn(),
  },
  userRelationsService: {
    getUserProfile: vi.fn(),
    getRelation: vi.fn(),
    followUser: vi.fn(),
    unfollowUser: vi.fn(),
    blockUser: vi.fn(),
    unblockUser: vi.fn(),
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => state.route,
  useRouter: () => state.router,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('pinia', () => ({
  storeToRefs: <T extends object>(store: T) => toRefs(reactive(store)),
}))

vi.mock('@/stores', () => ({
  useAuthStore: () => state.authStore,
  useToastStore: () => state.toastStore,
}))

vi.mock('@/api', () => {
  class MockApiError extends Error {}

  return {
    ApiError: MockApiError,
    userRelationsService: state.userRelationsService,
  }
})

vi.mock('@/utils/avatarPresentation', () => ({
  getAvatarFallbackLabel: vi.fn(() => 'A'),
  resolveAvatarSrc: vi.fn(() => '/avatar.png'),
}))

vi.mock('@/components/ui/Avatar.vue', () => ({
  default: {
    props: ['src', 'alt'],
    template: '<img class="avatar-stub" :src="src" :alt="alt" />',
  },
}))

vi.mock('@/components/ui/Button.vue', () => ({
  default: {
    props: ['loading', 'disabled', 'variant', 'size', 'type'],
    emits: ['click'],
    template:
      '<button :disabled="disabled" :type="type || \'button\'" @click="$emit(\'click\')"><slot /></button>',
  },
}))

vi.mock('@/components/ui/Skeleton.vue', () => ({
  default: {
    template: '<div class="skeleton-stub" />',
  },
}))

vi.mock('@/components/ui/StateIndicator.vue', () => ({
  default: {
    emits: ['action'],
    template: '<div class="state-indicator-stub" />',
  },
}))

import UserPublicProfilePage from '../UserPublicProfilePage.vue'

function mountPage() {
  return mount(UserPublicProfilePage, {
    global: {
      mocks: {
        $t: (key: string) => key,
      },
    },
  })
}

describe('UserPublicProfilePage', () => {
  beforeEach(() => {
    state.route.params.id = 'user-2'
    state.route.fullPath = '/users/user-2'
    state.router.push.mockReset()
    state.router.replace.mockReset()
    state.router.back.mockReset()
    state.toastStore.success.mockReset()
    state.toastStore.error.mockReset()
    state.authStore.user = { id: 'viewer-1' }
    state.authStore.isAuthenticated = true
    state.userRelationsService.getUserProfile.mockReset().mockResolvedValue({
      id: 'user-2',
      username: 'alice',
      avatar_url: null,
      bio: 'hello',
      follower_count: 3,
      following_count: 4,
      is_following: false,
      is_followed_by: false,
      is_blocking: false,
      is_blocked_by: false,
      created_at: '2026-04-01T00:00:00Z',
    })
    state.userRelationsService.getRelation.mockReset().mockResolvedValue({
      is_following: false,
      is_followed_by: false,
      is_blocking: false,
      is_blocked_by: false,
    })
    state.userRelationsService.followUser.mockReset().mockResolvedValue(undefined)
    state.userRelationsService.unfollowUser.mockReset().mockResolvedValue(undefined)
    state.userRelationsService.blockUser.mockReset().mockResolvedValue(undefined)
    state.userRelationsService.unblockUser.mockReset().mockResolvedValue(undefined)
  })

  it('loads authenticated relation-domain profile data with relation state', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(state.userRelationsService.getUserProfile).toHaveBeenCalledWith('user-2')
    expect(state.userRelationsService.getRelation).toHaveBeenCalledWith('user-2')
    expect(wrapper.text()).toContain('alice')
  })

  it('redirects self-profile visits and allows authenticated follow actions', async () => {
    state.route.params.id = 'viewer-1'
    const selfWrapper = mountPage()
    await flushPromises()

    expect(state.router.replace).toHaveBeenCalledWith('/profile')
    selfWrapper.unmount()

    state.route.params.id = 'user-2'
    state.route.fullPath = '/users/user-2'
    state.router.replace.mockReset()

    const authWrapper = mountPage()
    await flushPromises()

    const authFollowButton = authWrapper
      .findAll('button')
      .find((button) => button.text().includes('profile.followAction'))
    await authFollowButton!.trigger('click')
    await flushPromises()

    expect(state.userRelationsService.followUser).toHaveBeenCalledWith('user-2')
  })
})
