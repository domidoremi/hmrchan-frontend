import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => {
  class MockApiError extends Error {}

  return {
    ApiError: MockApiError,
    routerPush: vi.fn(),
    addComment: vi.fn(),
    updateBlocker: vi.fn(),
    applyPlainTextSnippet: vi.fn((value: string) => ({
      value: `formatted:${value}`,
      caretStart: 0,
      caretEnd: 0,
    })),
    validateComment: vi.fn((value: string) => ({
      valid: value.trim().length > 0,
    })),
    sanitizeComment: vi.fn((value: string) => value.trim()),
    rateLimiter: {
      canProceed: vi.fn(() => true),
      getRemainingTime: vi.fn(() => 0),
      record: vi.fn(),
    },
    toastStore: {
      success: vi.fn(),
      error: vi.fn(),
    },
    authStore: {
      user: {
        username: 'moderator',
      },
      isAuthenticated: true,
    },
  }
})

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'comment.replyPlaceholder' && params?.username) {
        return `Reply to @${params.username}`
      }
      if (key === 'comment.error.rateLimitedWithTime' && params?.seconds != null) {
        return `Rate limited: ${params.seconds}`
      }
      return key
    },
  }),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: state.routerPush,
  }),
}))

vi.mock('pinia', () => ({
  storeToRefs: (store: Record<string, unknown>) => store,
}))

vi.mock('@/stores', () => {
  const authStore = reactive(state.authStore)
  state.authStore = authStore as typeof state.authStore

  return {
    useAuthStore: () => authStore,
    useToastStore: () => state.toastStore,
  }
})

vi.mock('@/api', () => ({
  discussionService: {
    addComment: state.addComment,
  },
  ApiError: state.ApiError,
}))

vi.mock('@/composables/useUserAvatar', () => ({
  useUserAvatar: () => ({
    avatarUrl: '/avatar.png',
  }),
}))

vi.mock('@/utils/app-update/updateBlockers', () => ({
  useUpdateBlocker: state.updateBlocker,
}))

vi.mock('@/utils/plainTextTools', () => ({
  applyPlainTextSnippet: state.applyPlainTextSnippet,
}))

vi.mock('@/utils/security', () => ({
  validateComment: state.validateComment,
  sanitizeComment: state.sanitizeComment,
  commentRateLimiter: state.rateLimiter,
}))

vi.mock('@/components/comment/shared', () => ({
  CommentComposerShell: {
    props: ['title', 'subtitle', 'authenticated'],
    template: `
      <section class="composer-shell-stub">
        <div class="composer-title">{{ title }}</div>
        <div class="composer-subtitle">{{ subtitle }}</div>
        <slot v-if="authenticated" />
        <slot v-else name="guest" />
        <slot name="toolbar" />
        <slot name="footer" />
      </section>
    `,
  },
}))

vi.mock('@/components/ui/Textarea.vue', () => ({
  default: {
    props: ['modelValue', 'placeholder', 'disabled'],
    emits: ['update:modelValue'],
    data() {
      return {
        el: null as HTMLTextAreaElement | null,
      }
    },
    mounted() {
      this.el = this.$el as HTMLTextAreaElement
    },
    template: `
      <textarea
        class="textarea-stub"
        :placeholder="placeholder"
        :disabled="disabled"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
      />
    `,
  },
}))

vi.mock('@/components/ui/Button.vue', () => ({
  default: {
    props: ['type', 'disabled', 'loading', 'variant', 'size'],
    emits: ['click'],
    template:
      '<button class="button-stub" :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  },
}))

vi.mock('@/components/animation/AnimatedIcon.vue', () => ({
  default: {
    template: '<span class="animated-icon-stub" />',
  },
}))

vi.mock('@/components/thread/PlainTextToolbar.vue', () => ({
  default: {
    emits: ['action'],
    template: `
      <div class="toolbar-stub">
        <button type="button" class="toolbar-bold-btn" @click="$emit('action', 'bold')">bold</button>
      </div>
    `,
  },
}))

import DiscussionCommentForm from '../DiscussionCommentForm.vue'

function mountDiscussionCommentForm(props: Record<string, unknown> = {}) {
  return mount(DiscussionCommentForm, {
    props: {
      discussionId: 'discussion-1',
      ...props,
    },
  })
}

describe('DiscussionCommentForm', () => {
  beforeEach(() => {
    state.routerPush.mockReset()
    state.addComment.mockReset()
    state.updateBlocker.mockReset()
    state.applyPlainTextSnippet.mockClear()
    state.validateComment.mockClear()
    state.sanitizeComment.mockClear()
    state.rateLimiter.canProceed.mockReset().mockReturnValue(true)
    state.rateLimiter.getRemainingTime.mockReset().mockReturnValue(0)
    state.rateLimiter.record.mockReset()
    state.toastStore.success.mockReset()
    state.toastStore.error.mockReset()
    state.authStore.user = { username: 'moderator' }
    state.authStore.isAuthenticated = true
  })

  it('renders reply placeholders and emits the created discussion reply', async () => {
    state.addComment.mockResolvedValue({
      id: 'reply-1',
      content: 'hello',
    })

    const wrapper = mountDiscussionCommentForm({
      parentId: 'comment-root',
      replyToUsername: 'alice',
    })

    expect(wrapper.find('.composer-subtitle').text()).toContain('Reply to @alice')
    expect(wrapper.find('.textarea-stub').attributes('placeholder')).toContain('Reply to @alice')

    await wrapper.find('.textarea-stub').setValue('hello')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(state.sanitizeComment).toHaveBeenCalledWith('hello')
    expect(state.addComment).toHaveBeenCalledWith('discussion-1', {
      content: 'hello',
      parent_id: 'comment-root',
    })
    expect(state.rateLimiter.record).toHaveBeenCalled()
    expect(state.toastStore.success).toHaveBeenCalledWith('comment.submitSuccess')
    expect(wrapper.emitted('submitted')?.[0]?.[0]).toMatchObject({
      id: 'reply-1',
      content: 'hello',
    })
  })

  it('routes guests to login and register from the guest prompt', async () => {
    state.authStore.isAuthenticated = false

    const wrapper = mountDiscussionCommentForm()
    const buttons = wrapper.findAll('.button-stub')
    expect(buttons).toHaveLength(3)

    await buttons[0]!.trigger('click')
    await buttons[1]!.trigger('click')
    expect(state.routerPush).toHaveBeenNthCalledWith(1, '/login')
    expect(state.routerPush).toHaveBeenNthCalledWith(2, '/register')
  })

  it('applies toolbar snippets and exposes focus/setContent helpers', async () => {
    const wrapper = mountDiscussionCommentForm()
    const textarea = wrapper.find('.textarea-stub').element as HTMLTextAreaElement
    const focusSpy = vi.spyOn(textarea, 'focus')
    const selectionSpy = vi.spyOn(textarea, 'setSelectionRange')

    await wrapper.find('.textarea-stub').setValue('draft')
    await wrapper.find('.toolbar-bold-btn').trigger('click')
    await flushPromises()
    expect(state.applyPlainTextSnippet).toHaveBeenCalledWith('draft', 'bold', 5, 5)
    expect(textarea.value).toBe('formatted:draft')
    focusSpy.mockClear()
    selectionSpy.mockClear()

    wrapper.vm.setContent('prefilled')
    await nextTick()
    await nextTick()
    expect(textarea.value).toBe('prefilled')

    wrapper.vm.focus()
    await nextTick()
    await nextTick()
    expect(focusSpy).toHaveBeenCalled()
    expect(selectionSpy).not.toHaveBeenCalled()
  })

  it('blocks submissions when rate limited and reports the remaining cooldown', async () => {
    state.rateLimiter.canProceed.mockReturnValue(false)
    state.rateLimiter.getRemainingTime.mockReturnValue(3200)

    const wrapper = mountDiscussionCommentForm()
    await wrapper.find('.textarea-stub').setValue('blocked')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(state.addComment).not.toHaveBeenCalled()
    expect(state.toastStore.error).toHaveBeenCalledWith('Rate limited: 4')
  })

  it('surfaces API and generic submission failures on discussion comments', async () => {
    state.addComment.mockRejectedValueOnce(new state.ApiError('add failed'))
    const apiErrorWrapper = mountDiscussionCommentForm()
    await apiErrorWrapper.find('.textarea-stub').setValue('broken')
    await apiErrorWrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(state.toastStore.error).toHaveBeenCalledWith('add failed')

    state.addComment.mockRejectedValueOnce(new Error('boom'))
    const genericErrorWrapper = mountDiscussionCommentForm({
      discussionId: 'discussion-2',
    })
    await genericErrorWrapper.find('.textarea-stub').setValue('broken again')
    await genericErrorWrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(state.toastStore.error).toHaveBeenCalledWith('comment.error.addFailed')
  })

  it('emits cancel for replies and registers a scoped update blocker id', async () => {
    const wrapper = mountDiscussionCommentForm({
      discussionId: 'discussion-42',
      parentId: 'comment-root',
      replyToUsername: 'alice',
    })

    expect(state.updateBlocker).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'discussion-comment-form:discussion-42:comment-root' }),
      expect.any(Object)
    )

    const buttons = wrapper.findAll('.button-stub')
    await buttons[0]!.trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('uses root-mode defaults and short-circuits invalid submissions before rate limiting', async () => {
    state.authStore.user = { username: '   ' }
    const wrapper = mountDiscussionCommentForm({
      discussionId: 'discussion-root',
    })

    expect(wrapper.find('.composer-subtitle').text()).toBe('community.mentionHint')
    expect(wrapper.find('.textarea-stub').attributes('placeholder')).toBe('comment.placeholder')
    expect(state.updateBlocker).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'discussion-comment-form:discussion-root:root' }),
      expect.any(Object)
    )

    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(state.rateLimiter.canProceed).not.toHaveBeenCalled()
    expect(state.addComment).not.toHaveBeenCalled()

    state.addComment.mockResolvedValueOnce({ id: 'top-level-1', content: 'clean' })
    await wrapper.find('.textarea-stub').setValue('clean')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(state.addComment).toHaveBeenCalledWith('discussion-root', { content: 'clean' })
  })
})
