import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, reactive, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DiscussionDetailPage from '../DiscussionDetailPage.vue'

const state = vi.hoisted(() => ({
  pushSpy: vi.fn(),
  backSpy: vi.fn(),
  replaceSpy: vi.fn(),
  fetchDiscussion: vi.fn(),
  updateDiscussionLocally: vi.fn(),
  authStore: {
    user: {
      id: 'viewer-1',
      is_admin: false,
      roles: [],
    },
  },
  toastStore: {
    success: vi.fn(),
    error: vi.fn(),
  },
  discussionStore: {
    currentDiscussion: null as Record<string, unknown> | null,
    source: 'live',
    error: null as string | null,
  },
  route: {
    params: { id: 'discussion-1' },
  },
}))

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return {
    ...actual,
    useRouter: () => ({
      push: state.pushSpy,
      back: state.backSpy,
      replace: state.replaceSpy,
    }),
    useRoute: () => state.route,
  }
})

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('pinia', () => ({
  storeToRefs: (store: Record<string, unknown>) => store,
}))

vi.mock('@/stores', () => {
  const discussionStore = Object.assign(reactive(state.discussionStore), {
    fetchDiscussion: state.fetchDiscussion,
    updateDiscussionLocally: state.updateDiscussionLocally,
  })
  return {
    useAuthStore: () => state.authStore,
    useToastStore: () => state.toastStore,
    useDiscussionsStore: () => discussionStore,
  }
})

vi.mock('@/api', () => ({
  discussionService: {
    delete: vi.fn(),
    pin: vi.fn(),
    unpin: vi.fn(),
  },
  ApiError: class MockApiError extends Error {},
}))

vi.mock('@/utils/avatarPresentation', () => ({
  getAvatarFallbackLabel: vi.fn(() => 'A'),
  resolveAvatarSrc: vi.fn(() => '/avatar.png'),
}))

vi.mock('@/utils/date', () => ({
  formatRelativeTime: vi.fn(() => 'just now'),
}))

vi.mock('@/components/ui/Button.vue', () => ({
  default: {
    emits: ['click'],
    template:
      '<button type="button" class="button-stub" @click="$emit(\'click\')"><slot /></button>',
  },
}))

vi.mock('@/components/ui/StateIndicator.vue', () => ({
  default: { template: '<div class="state-indicator-stub" />' },
}))
vi.mock('@/components/ui/Skeleton.vue', () => ({
  default: { template: '<div class="skeleton-stub" />' },
}))
vi.mock('@/components/ui/Avatar.vue', () => ({
  default: { template: '<img class="avatar-stub" />' },
}))
vi.mock('@/components/animation/AnimatedIcon.vue', () => ({
  default: { template: '<span class="animated-icon-stub" />' },
}))
vi.mock('@/components/community/DiscussionCommentList.vue', () => ({
  default: {
    props: ['discussionId', 'discussionAuthorId'],
    template:
      '<div class="discussion-comment-list-stub">{{ discussionId }}::{{ discussionAuthorId }}</div>',
  },
}))
vi.mock('@/components/community/ReferencedPostPreview.vue', () => ({
  default: { template: '<div class="referenced-post-preview-stub" />' },
}))
vi.mock('@/components/ui/ConfirmDialog.vue', () => ({
  default: { template: '<div class="confirm-dialog-stub" />' },
}))

const DiscussionCommentListHarness = defineComponent({
  name: 'DiscussionCommentListHarness',
  template: `
    <section class="discussion-comment-list">
      <form class="discussion-comment-form" @submit.prevent="submitRootSuccess">
        <button type="submit" class="discussion-submit-success">root success</button>
      </form>
      <button type="button" class="discussion-submit-failure" @click="submitReplyFailure">
        reply failure
      </button>
      <button type="button" class="discussion-reply-toggle" @click="startReply">reply</button>
      <form
        v-if="showReplyForm"
        class="discussion-comment-form discussion-comment-form--reply"
        @submit.prevent="submitReplySuccess"
      >
        <button type="submit" class="discussion-reply-success">reply success</button>
      </form>
      <button
        v-if="showReplyForm"
        type="button"
        class="discussion-reply-cancel"
        @click="cancelReply"
      >
        cancel
      </button>
      <div class="discussion-feedback discussion-feedback--success" v-if="successCount > 0">
        success:{{ successCount }}
      </div>
      <div class="discussion-feedback discussion-feedback--error" v-if="errorCount > 0">
        error:{{ errorCount }}
      </div>
      <div class="discussion-thread-state">{{ threadState }}</div>
      <div class="discussion-comment-count">{{ commentCount }}</div>
    </section>
  `,
  setup() {
    const commentCount = ref(1)
    const successCount = ref(0)
    const errorCount = ref(0)
    const showReplyForm = ref(false)
    const threadState = ref('idle')

    function submitRootSuccess() {
      commentCount.value += 1
      successCount.value += 1
      threadState.value = 'prepended'
    }

    function startReply() {
      showReplyForm.value = true
      threadState.value = 'replying'
    }

    function submitReplySuccess() {
      successCount.value += 1
      showReplyForm.value = false
      threadState.value = 'updated'
    }

    function submitReplyFailure() {
      errorCount.value += 1
      threadState.value = 'error'
    }

    function cancelReply() {
      showReplyForm.value = false
      threadState.value = 'cancelled'
    }

    return {
      commentCount,
      successCount,
      errorCount,
      showReplyForm,
      threadState,
      submitRootSuccess,
      startReply,
      submitReplySuccess,
      submitReplyFailure,
      cancelReply,
    }
  },
})

describe('DiscussionDetailPage', () => {
  beforeEach(() => {
    state.pushSpy.mockReset()
    state.backSpy.mockReset()
    state.replaceSpy.mockReset()
    state.toastStore.success.mockReset()
    state.toastStore.error.mockReset()
    state.discussionStore.currentDiscussion = null
    state.discussionStore.source = 'live'
    state.discussionStore.error = null
    state.fetchDiscussion.mockReset()
    state.updateDiscussionLocally.mockReset()
  })

  it('renders the discussion comment list when the discussion loads successfully', async () => {
    state.fetchDiscussion.mockImplementation(async () => {
      state.discussionStore.currentDiscussion = {
        id: 'discussion-1',
        title: 'Discussion title',
        content: 'Discussion body',
        created_at: '2026-04-14T00:00:00Z',
        updated_at: '2026-04-14T00:00:00Z',
        comments_count: 2,
        view_count: 9,
        tags: [],
        category: 'general',
        is_pinned: false,
        author: {
          id: 'author-1',
          username: 'alice',
          avatar_url: null,
        },
      }
    })

    const wrapper = mount(DiscussionDetailPage, {
      global: {
        stubs: {
          Transition: false,
        },
        mocks: {
          $t: (key: string) => key,
        },
      },
    })
    await flushPromises()

    expect(state.fetchDiscussion).toHaveBeenCalledWith('discussion-1', expect.any(Object))
    expect(wrapper.find('.discussion-comment-list-stub').exists()).toBe(true)
    expect(wrapper.text()).toContain('Discussion title')
  })

  it('surfaces the state indicator when the discussion fetch leaves an error state', async () => {
    state.fetchDiscussion.mockImplementation(async () => {
      state.discussionStore.error = 'community.error.loadFailed'
    })
    const wrapper = mount(DiscussionDetailPage, {
      global: {
        stubs: {
          Transition: false,
        },
        mocks: {
          $t: (key: string) => key,
        },
      },
    })
    await flushPromises()
    expect(wrapper.find('.state-indicator-stub').exists()).toBe(true)
  })

  it('keeps discussion comment submit and reply thread updates stable on the detail page', async () => {
    const errorHandler = vi.fn()
    state.fetchDiscussion.mockImplementation(async () => {
      state.discussionStore.currentDiscussion = {
        id: 'discussion-1',
        title: 'Discussion title',
        content: 'Discussion body',
        created_at: '2026-04-14T00:00:00Z',
        updated_at: '2026-04-14T00:00:00Z',
        comments_count: 2,
        view_count: 9,
        tags: [],
        category: 'general',
        is_pinned: false,
        author: {
          id: 'author-1',
          username: 'alice',
          avatar_url: null,
        },
      }
    })

    const wrapper = mount(DiscussionDetailPage, {
      global: {
        config: {
          errorHandler,
        },
        stubs: {
          Transition: false,
          DiscussionCommentList: DiscussionCommentListHarness,
        },
        mocks: {
          $t: (key: string) => key,
        },
      },
    })
    await flushPromises()

    expect(wrapper.find('.discussion-comment-form').exists()).toBe(true)

    await wrapper.get('.discussion-comment-form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.discussion-feedback--success').text()).toContain('1')
    expect(wrapper.find('.discussion-comment-count').text()).toContain('2')
    expect(wrapper.find('.discussion-thread-state').text()).toContain('prepended')

    await wrapper.get('.discussion-reply-toggle').trigger('click')
    expect(wrapper.find('.discussion-comment-form--reply').exists()).toBe(true)

    await wrapper.get('.discussion-comment-form--reply').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.discussion-comment-form--reply').exists()).toBe(false)
    expect(wrapper.find('.discussion-thread-state').text()).toContain('updated')
    expect(wrapper.find('.discussion-feedback--success').text()).toContain('2')

    await wrapper.get('.discussion-reply-toggle').trigger('click')
    expect(wrapper.find('.discussion-comment-form--reply').exists()).toBe(true)

    await wrapper.get('.discussion-reply-cancel').trigger('click')
    await flushPromises()

    expect(wrapper.find('.discussion-comment-form--reply').exists()).toBe(false)
    expect(wrapper.find('.discussion-thread-state').text()).toContain('cancelled')
    expect(errorHandler).not.toHaveBeenCalled()
  })

  it('surfaces only the discussion comment error state when a reply submission fails', async () => {
    const errorHandler = vi.fn()
    state.fetchDiscussion.mockImplementation(async () => {
      state.discussionStore.currentDiscussion = {
        id: 'discussion-1',
        title: 'Discussion title',
        content: 'Discussion body',
        created_at: '2026-04-14T00:00:00Z',
        updated_at: '2026-04-14T00:00:00Z',
        comments_count: 2,
        view_count: 9,
        tags: [],
        category: 'general',
        is_pinned: false,
        author: {
          id: 'author-1',
          username: 'alice',
          avatar_url: null,
        },
      }
    })

    const wrapper = mount(DiscussionDetailPage, {
      global: {
        config: {
          errorHandler,
        },
        stubs: {
          Transition: false,
          DiscussionCommentList: DiscussionCommentListHarness,
        },
        mocks: {
          $t: (key: string) => key,
        },
      },
    })
    await flushPromises()

    await wrapper.get('.discussion-submit-failure').trigger('click')
    await flushPromises()

    expect(wrapper.find('.discussion-feedback--error').text()).toContain('1')
    expect(wrapper.find('.discussion-feedback--success').exists()).toBe(false)
    expect(wrapper.find('.discussion-thread-state').text()).toContain('error')
    expect(errorHandler).not.toHaveBeenCalled()
  })
})
