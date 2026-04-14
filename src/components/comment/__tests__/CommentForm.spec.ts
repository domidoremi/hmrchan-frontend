import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
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
  commentService: {
    validateImageFiles: vi.fn(() => ({ valid: true })),
    validateImageFile: vi.fn(() => ({ valid: true })),
    uploadImage: vi.fn(async () => ({
      id: 'image-1',
      url: '/image.png',
      thumbnail_url: '/image-thumb.png',
    })),
    deleteImage: vi.fn().mockResolvedValue(undefined),
  },
  uploaderOpenPicker: vi.fn(),
  uploaderClear: vi.fn(),
  toastStore: {
    success: vi.fn(),
    error: vi.fn(),
  },
  authStore: {
    user: {
      username: 'alice',
    },
    isAuthenticated: true,
  },
}))

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
    useCommentsStore: () => ({
      addComment: state.addComment,
    }),
    useToastStore: () => state.toastStore,
  }
})

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
}))

vi.mock('@/api/commentService', () => ({
  commentService: state.commentService,
}))

vi.mock('@/components/comment/shared/CommentComposerShell.vue', () => ({
  default: {
    props: ['title', 'subtitle', 'authenticated'],
    template: `
      <section class="composer-shell-stub">
        <div class="composer-title">{{ title }}</div>
        <div class="composer-subtitle">{{ subtitle }}</div>
        <slot v-if="authenticated" />
        <slot v-else name="guest" />
        <slot name="toolbar" />
        <slot name="attachments" />
        <slot name="footer" />
      </section>
    `,
  },
}))

vi.mock('@/components/ui/Textarea.vue', () => ({
  default: {
    props: ['modelValue', 'placeholder', 'disabled', 'rows', 'maxlength'],
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
        <button type="button" class="toolbar-media-btn" @click="$emit('action', 'media')">media</button>
        <button type="button" class="toolbar-bold-btn" @click="$emit('action', 'bold')">bold</button>
      </div>
    `,
  },
}))

vi.mock('@/components/ui/SketchDropUploader.vue', () => ({
  default: {
    name: 'SketchDropUploader',
    props: [
      'modelValue',
      'hint',
      'uploadFn',
      'deleteFn',
      'validateFn',
      'disabled',
      'title',
      'description',
    ],
    emits: ['update:modelValue', 'error'],
    methods: {
      openPicker: state.uploaderOpenPicker,
      clear: state.uploaderClear,
    },
    template: `
      <div class="uploader-stub">
        <span class="uploader-hint">{{ hint }}</span>
        <button
          type="button"
          class="uploader-uploading-btn"
          @click="$emit('update:modelValue', [{ id: 'local-1', file: { name: 'uploading.png' }, status: 'uploading' }])"
        >
          uploading
        </button>
        <button
          type="button"
          class="uploader-success-btn"
          @click="$emit('update:modelValue', [{ id: 'local-2', file: { name: 'done.png' }, status: 'success', remoteId: 'image-2' }])"
        >
          success
        </button>
        <button type="button" class="uploader-error-btn" @click="$emit('error', 'upload failed')">error</button>
      </div>
    `,
  },
}))

import CommentForm from '../CommentForm.vue'

function mountCommentForm(props: Record<string, unknown> = {}) {
  return mount(CommentForm, {
    props: {
      postId: 'post-1',
      ...props,
    },
  })
}

describe('CommentForm', () => {
  beforeEach(() => {
    state.routerPush.mockReset()
    state.addComment.mockReset()
    state.updateBlocker.mockReset()
    state.applyPlainTextSnippet.mockClear()
    state.validateComment.mockClear()
    state.commentService.validateImageFiles.mockReset().mockReturnValue({ valid: true })
    state.commentService.validateImageFile.mockReset().mockReturnValue({ valid: true })
    state.commentService.uploadImage.mockClear()
    state.commentService.deleteImage.mockReset().mockResolvedValue(undefined)
    state.uploaderOpenPicker.mockReset()
    state.uploaderClear.mockReset()
    state.toastStore.success.mockReset()
    state.toastStore.error.mockReset()
    state.authStore.user = { username: 'alice' }
    state.authStore.isAuthenticated = true
  })

  it('renders reply placeholders and submits a reply successfully', async () => {
    state.addComment.mockResolvedValue({ success: true })

    const wrapper = mountCommentForm({
      replyTo: 'comment-1',
      replyToUsername: 'alice',
    })

    expect(wrapper.find('.composer-subtitle').text()).toContain('Reply to @alice')
    expect(wrapper.find('.textarea-stub').attributes('placeholder')).toContain('Reply to @alice')

    await wrapper.find('.textarea-stub').setValue('hello reply')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(state.addComment).toHaveBeenCalledWith('post-1', {
      content: 'hello reply',
      image_ids: [],
      parent_id: 'comment-1',
    })
    expect(state.toastStore.success).toHaveBeenCalledWith('comment.submitSuccess')
    expect(wrapper.emitted('submitted')).toHaveLength(1)
  })

  it('routes guests to login and register from the guest prompt', async () => {
    state.authStore.isAuthenticated = false

    const wrapper = mountCommentForm()
    const buttons = wrapper.findAll('.button-stub')
    expect(buttons).toHaveLength(3)

    await buttons[0]!.trigger('click')
    await buttons[1]!.trigger('click')
    expect(state.routerPush).toHaveBeenNthCalledWith(1, '/login')
    expect(state.routerPush).toHaveBeenNthCalledWith(2, '/register')
  })

  it('opens the uploader for media actions and handles toolbar snippet actions', async () => {
    const wrapper = mountCommentForm()

    await wrapper.find('.toolbar-media-btn').trigger('click')
    await flushPromises()
    expect(wrapper.find('.uploader-stub').exists()).toBe(true)
    expect(state.uploaderOpenPicker).toHaveBeenCalled()

    await wrapper.find('.textarea-stub').setValue('draft')
    await wrapper.find('.toolbar-bold-btn').trigger('click')
    await flushPromises()
    expect(state.applyPlainTextSnippet).toHaveBeenCalledWith('draft', 'bold', 5, 5)
    expect((wrapper.find('.textarea-stub').element as HTMLTextAreaElement).value).toBe(
      'formatted:draft'
    )
  })

  it('validates uploads, proxies uploader errors, and deletes remote images only when present', async () => {
    const wrapper = mountCommentForm()
    await wrapper.find('.toolbar-media-btn').trigger('click')
    await flushPromises()

    const uploader = wrapper.findComponent({ name: 'SketchDropUploader' })
    const validateFn = uploader.props('validateFn') as (
      file: File,
      queued: Array<{ file: File }>
    ) => string | null
    const uploadFn = uploader.props('uploadFn') as (file: File) => Promise<unknown>
    const deleteFn = uploader.props('deleteFn') as (item: { remoteId?: string }) => Promise<void>

    const file = new File(['x'], 'sample.png', { type: 'image/png' })
    expect(validateFn(file, [])).toBeNull()

    state.commentService.validateImageFiles.mockReturnValueOnce({
      valid: false,
      error: 'comment.image.tooManyImages',
    })
    expect(validateFn(file, [])).toBe('comment.image.tooManyImages')

    state.commentService.validateImageFiles.mockReturnValueOnce({ valid: true })
    state.commentService.validateImageFile.mockReturnValueOnce({
      valid: false,
      error: 'uploader.errors.uploadFailed',
    })
    expect(validateFn(file, [])).toBe('uploader.errors.uploadFailed')

    await uploadFn(file)
    expect(state.commentService.uploadImage).toHaveBeenCalledWith(file)

    await deleteFn({ remoteId: 'image-1' })
    expect(state.commentService.deleteImage).toHaveBeenCalledWith('image-1')

    await deleteFn({})
    expect(state.commentService.deleteImage).toHaveBeenCalledTimes(1)

    await wrapper.find('.uploader-error-btn').trigger('click')
    expect(state.toastStore.error).toHaveBeenCalledWith('upload failed')
  })

  it('tracks attachment state, blocks submission while uploading, and emits cancel for replies', async () => {
    const wrapper = mountCommentForm({
      replyTo: 'comment-1',
      replyToUsername: 'alice',
    })

    await wrapper.find('.toolbar-media-btn').trigger('click')
    await flushPromises()
    expect(wrapper.find('.uploader-stub').exists()).toBe(true)

    await wrapper.find('.uploader-uploading-btn').trigger('click')
    await flushPromises()
    expect(wrapper.find('.form-footer__note').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()

    await wrapper.find('.uploader-success-btn').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('1 / 9 comment.toolbar.media')

    const buttons = wrapper.findAll('.button-stub')
    await buttons[0]!.trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('exposes focus and setContent helpers for reply orchestration', async () => {
    const wrapper = mountCommentForm()
    const textarea = wrapper.find('.textarea-stub').element as HTMLTextAreaElement
    const focusSpy = vi.spyOn(textarea, 'focus')
    const selectionSpy = vi.spyOn(textarea, 'setSelectionRange')

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

  it('shows rate-limit errors and keyed submission failures', async () => {
    state.addComment.mockResolvedValue({
      success: false,
      error: 'comment.error.addFailed',
      remainingSeconds: 12,
    })

    const wrapper = mountCommentForm()
    await wrapper.find('.textarea-stub').setValue('limited')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(state.toastStore.error).toHaveBeenCalledWith('Rate limited: 12')

    state.addComment.mockResolvedValue({
      success: false,
      error: 'comment.error.addFailed',
    })
    const failureWrapper = mountCommentForm({ postId: 'post-2' })
    await failureWrapper.find('.textarea-stub').setValue('broken comment')
    await failureWrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(state.toastStore.error).toHaveBeenCalledWith('comment.error.addFailed')
  })

  it('uses root-mode defaults and falls back to generic upload/submission errors', async () => {
    state.authStore.user = { username: '   ' }
    state.addComment.mockResolvedValue({ success: false })

    const wrapper = mountCommentForm({ postId: 'post-root' })
    expect(wrapper.find('.composer-subtitle').text()).toBe('comment.placeholder')

    const uploaderOpenCount = state.uploaderOpenPicker.mock.calls.length
    await wrapper.find('.toolbar-media-btn').trigger('click')
    await flushPromises()
    expect(state.uploaderOpenPicker.mock.calls.length).toBe(uploaderOpenCount + 1)

    const uploader = wrapper.findComponent({ name: 'SketchDropUploader' })
    const validateFn = uploader.props('validateFn') as (
      file: File,
      queued: Array<{ file: File }>
    ) => string | null
    const file = new File(['x'], 'sample.png', { type: 'image/png' })

    state.commentService.validateImageFiles.mockReturnValueOnce({ valid: false })
    expect(validateFn(file, [])).toBe('uploader.errors.uploadFailed')

    state.commentService.validateImageFiles.mockReturnValueOnce({ valid: true })
    state.commentService.validateImageFile.mockReturnValueOnce({ valid: false })
    expect(validateFn(file, [])).toBe('uploader.errors.uploadFailed')

    await wrapper.find('.textarea-stub').setValue('root comment')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(state.addComment).toHaveBeenCalledWith('post-root', {
      content: 'root comment',
      image_ids: [],
    })
    expect(state.toastStore.error).toHaveBeenCalledWith('comment.error.addFailed')
  })
})
