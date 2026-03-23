import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import PostPreviewModal from '../PostPreviewModal.vue'
import type { PostListItem } from '@/api'

vi.mock('@/composables/useCachedPosts', () => ({
  useCachedPost: () => ({
    load: vi.fn(),
  }),
}))

vi.mock('@/utils/prefetch', () => ({
  prefetchPostDetail: vi.fn(),
}))

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
    ...overrides,
  }
}

function createWrapper(initialPost: PostListItem) {
  return mount(PostPreviewModal, {
    attachTo: document.body,
    props: {
      isOpen: true,
      postId: null,
      initialPost,
      initialThumbnailSrc: initialPost.thumbnail_url,
    },
    global: {
      plugins: [i18n],
      stubs: {
        teleport: true,
        transition: false,
        X: { template: '<span aria-hidden="true" />' },
        PostActionStrip: { template: '<div />' },
        VideoPlayer: { template: '<video />' },
      },
    },
  })
}

describe('PostPreviewModal', () => {
  it('renders media section when thumbnail is available (even if media_count is 0)', () => {
    const wrapper = createWrapper(
      createInitialPost({
        media_count: 0,
        file_count: 1,
      })
    )

    expect(wrapper.find('.post-preview-media').exists()).toBe(true)
    expect(wrapper.find('.post-preview-media-item').exists()).toBe(true)
    expect(wrapper.find('.post-preview-media-item').attributes('fetchpriority')).toBe('high')
    expect(wrapper.find('.post-preview-media-backdrop').attributes('fetchpriority')).toBe('low')
    expect(wrapper.find('.post-preview-content').text()).toContain('Test post')

    wrapper.unmount()
  })

  it('keeps media section when media exists and thumbnail is used as placeholder', () => {
    const wrapper = createWrapper(
      createInitialPost({
        media_count: 2,
        file_count: 2,
      })
    )

    expect(wrapper.find('.post-preview-media').exists()).toBe(true)
    expect(wrapper.find('.post-preview-media-item').exists()).toBe(true)
    expect(wrapper.find('.post-preview-media-item').attributes('fetchpriority')).toBe('high')
    expect(wrapper.find('.post-preview-media-backdrop').attributes('fetchpriority')).toBe('low')

    wrapper.unmount()
  })
})
