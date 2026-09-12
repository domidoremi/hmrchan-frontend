import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import PostPreviewModal from '../PostPreviewModal.vue'
import type { PostListItem } from '@/api'

const previewModalMocks = vi.hoisted(() => {
  class MockApiError extends Error {
    status: number

    constructor(message: string, status: number) {
      super(message)
      this.status = status
      this.name = 'ApiError'
    }
  }

  return {
    loadMock: vi.fn(),
    MockApiError,
  }
})

vi.mock('@/composables/useCachedPosts', () => ({
  useCachedPost: () => ({
    load: previewModalMocks.loadMock,
  }),
}))

vi.mock('@/utils/prefetch', () => ({
  prefetchPostDetail: vi.fn(),
}))

vi.mock('@/api', async () => {
  const actual = await vi.importActual<typeof import('@/api')>('@/api')
  return {
    ...actual,
    ApiError: previewModalMocks.MockApiError,
  }
})

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      common: {
        close: 'Close',
        loading: 'Loading',
        retry: 'Retry',
        error: 'Error',
      },
      post: {
        preview: 'Preview',
        viewDetail: 'View detail',
        noMedia: 'No media',
        views: 'views',
        likes: 'likes',
        subtitlesAvailable: 'Subtitles available',
      },
    },
  },
})

function createInitialPost(overrides: Partial<PostListItem> = {}): PostListItem {
  return {
    id: 'post-1',
    platform: 'twitter',
    title: 'Test post',
    content: 'Preview content',
    thumbnail_url: '/thumb.jpg',
    view_count: 100,
    like_count: 10,
    comment_count: 5,
    media_count: 0,
    external_links: [],
    ...overrides,
  }
}

function createWrapper(initialPost: PostListItem, postId: string | null = null) {
  return mount(PostPreviewModal, {
    attachTo: document.body,
    props: {
      isOpen: true,
      postId,
      initialPost,
      initialThumbnailSrc: initialPost.thumbnail_url,
    },
    global: {
      plugins: [i18n],
      stubs: {
        teleport: true,
        transition: false,
        X: { template: '<span aria-hidden="true" />' },
        PostActionStrip: {
          props: ['postId', 'externalLinks', 'variant'],
          emits: ['internalNavigate'],
          template:
            '<button class="post-action-strip-stub" :data-links="JSON.stringify(externalLinks)" @click="$emit(\'internalNavigate\', externalLinks[0]?.target_post_id)">linked post</button>',
        },
        VideoPlayer: { template: '<video />' },
      },
    },
  })
}

describe('PostPreviewModal', () => {
  it('restores focus without requesting scroll when the preview closes', async () => {
    previewModalMocks.loadMock.mockReset()
    const trigger = document.createElement('button')
    trigger.type = 'button'
    document.body.appendChild(trigger)
    const triggerFocus = vi.spyOn(trigger, 'focus')
    trigger.focus()
    triggerFocus.mockClear()

    const wrapper = createWrapper(createInitialPost(), 'post-1')
    await Promise.resolve()
    await Promise.resolve()

    await wrapper.setProps({ isOpen: false })
    await Promise.resolve()
    await Promise.resolve()

    expect(triggerFocus).toHaveBeenLastCalledWith({ preventScroll: true })

    wrapper.unmount()
    trigger.remove()
  })

  it('closes and releases body scroll before linked-post navigation continues', async () => {
    const targetPostId = '01890f47-6a35-7cc4-8a2d-7f5b56c9e002'
    previewModalMocks.loadMock.mockResolvedValueOnce({
      data: {
        ...createInitialPost(),
        description: 'Detail',
        created_at: '',
        external_links: [
          {
            platform: 'youtube',
            url: 'https://youtu.be/linked',
            target_post_id: targetPostId,
          },
        ],
      },
      fromCache: false,
    })
    const wrapper = createWrapper(createInitialPost(), 'post-1')
    await vi.waitFor(() =>
      expect(wrapper.find('.post-action-strip-stub').attributes('data-links')).toContain(
        targetPostId
      )
    )
    expect(document.body.style.position).toBe('fixed')

    await wrapper.find('.post-action-strip-stub').trigger('click')
    await wrapper.setProps({ isOpen: false })
    await nextTick()

    expect(wrapper.emitted('update:isOpen')).toEqual([[false]])
    expect(document.body.style.position).toBe('')
    expect(document.documentElement.style.overflow).toBe('')
    wrapper.unmount()
  })

  it('keeps rendering the initial summary when detail fetch returns 404', async () => {
    previewModalMocks.loadMock.mockRejectedValueOnce(
      new previewModalMocks.MockApiError('Post not found', 404)
    )

    const wrapper = createWrapper(createInitialPost(), 'post-1')

    await Promise.resolve()
    await Promise.resolve()

    expect(wrapper.find('.post-preview-error').exists()).toBe(false)
    expect(wrapper.find('.post-preview-heading').text()).toContain('Test post')
    expect(wrapper.find('.post-preview-text').text()).toContain('Preview content')

    wrapper.unmount()
  })

  it('revalidates cached summary links with detail and falls back to list links on failure', async () => {
    const listLinks = [{ platform: 'youtube' as const, url: 'https://youtu.be/list' }]
    const detailLinks = [{ platform: 'tiktok' as const, url: 'https://tiktok.com/detail' }]
    previewModalMocks.loadMock.mockResolvedValueOnce({
      data: {
        ...createInitialPost(),
        description: 'Detail',
        created_at: '',
        external_links: detailLinks,
      },
      fromCache: false,
    })

    const detailWrapper = createWrapper(createInitialPost({ external_links: listLinks }), 'post-1')
    expect(detailWrapper.find('.post-action-strip-stub').attributes('data-links')).toBe(
      JSON.stringify(listLinks)
    )
    await vi.waitFor(() =>
      expect(detailWrapper.find('.post-action-strip-stub').attributes('data-links')).toBe(
        JSON.stringify(detailLinks)
      )
    )
    expect(previewModalMocks.loadMock).toHaveBeenCalledWith(
      'post-1',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
    detailWrapper.unmount()

    previewModalMocks.loadMock.mockResolvedValueOnce({
      data: {
        ...createInitialPost(),
        description: 'Cached summary',
        created_at: '',
        external_links: [],
      },
      fromCache: true,
    })
    const staleWrapper = createWrapper(createInitialPost({ external_links: listLinks }), 'post-1')
    await vi.waitFor(() => expect(previewModalMocks.loadMock).toHaveBeenCalledTimes(2))
    expect(staleWrapper.find('.post-action-strip-stub').attributes('data-links')).toBe(
      JSON.stringify(listLinks)
    )
    staleWrapper.unmount()

    previewModalMocks.loadMock.mockRejectedValueOnce(new Error('offline'))
    const fallbackWrapper = createWrapper(
      createInitialPost({ external_links: listLinks }),
      'post-1'
    )
    await vi.waitFor(() => expect(fallbackWrapper.find('.post-preview-error').exists()).toBe(true))
    expect(fallbackWrapper.find('.post-action-strip-stub').attributes('data-links')).toBe(
      JSON.stringify(listLinks)
    )
    fallbackWrapper.unmount()
  })

  it('treats an explicit empty detail link array as authoritative', async () => {
    previewModalMocks.loadMock.mockResolvedValueOnce({
      data: {
        ...createInitialPost(),
        description: 'Detail',
        created_at: '',
        external_links: [],
      },
      fromCache: false,
    })
    const wrapper = createWrapper(
      createInitialPost({
        external_links: [{ platform: 'youtube', url: 'https://youtu.be/list' }],
      }),
      'post-1'
    )

    await vi.waitFor(() =>
      expect(wrapper.find('.post-action-strip-stub').attributes('data-links')).toBe('[]')
    )
    wrapper.unmount()
  })

  it('renders media section when thumbnail is available (even if media_count is 0)', () => {
    previewModalMocks.loadMock.mockReset()
    const wrapper = createWrapper(
      createInitialPost({
        media_count: 0,
        file_count: 1,
      })
    )

    expect(wrapper.find('.post-preview-media').exists()).toBe(true)
    expect(wrapper.find('.post-preview-media-item').exists()).toBe(true)
    expect(wrapper.find('.post-preview-media-item').attributes('fetchpriority')).toBe('auto')
    expect(wrapper.find('.post-preview-media-backdrop').attributes('fetchpriority')).toBe('low')
    expect(wrapper.find('.post-preview-content').text()).toContain('Test post')

    wrapper.unmount()
  })

  it('keeps media section when media exists and thumbnail is used as placeholder', () => {
    previewModalMocks.loadMock.mockReset()
    const wrapper = createWrapper(
      createInitialPost({
        media_count: 2,
        file_count: 2,
      })
    )

    expect(wrapper.find('.post-preview-media').exists()).toBe(true)
    expect(wrapper.find('.post-preview-media-item').exists()).toBe(true)
    expect(wrapper.find('.post-preview-media-item').attributes('fetchpriority')).toBe('auto')
    expect(wrapper.find('.post-preview-media-backdrop').attributes('fetchpriority')).toBe('low')

    wrapper.unmount()
  })
})
