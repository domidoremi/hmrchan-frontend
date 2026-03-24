import { describe, expect, it, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ReferencedPostPreview from '../ReferencedPostPreview.vue'

const referencedPostPreviewMocks = vi.hoisted(() => ({
  cachePostThumbnailPreviewMock: vi.fn(),
}))

vi.mock('@/utils/thumbnailPresentation', async () => {
  const actual = await vi.importActual<typeof import('@/utils/thumbnailPresentation')>(
    '@/utils/thumbnailPresentation'
  )

  return {
    ...actual,
    cachePostThumbnailPreview: referencedPostPreviewMocks.cachePostThumbnailPreviewMock,
  }
})

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      community: {
        referencedPost: 'Referenced post',
      },
    },
  },
})

describe('ReferencedPostPreview', () => {
  it('renders the referenced post label, title, and compact state', () => {
    const wrapper = mount(ReferencedPostPreview, {
      global: {
        plugins: [i18n],
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
      props: {
        post: {
          id: 'post-1',
          title: 'Referenced post title',
          thumbnail_url: '/api/v1/media/123e4567-e89b-12d3-a456-426614174000/thumbnail?size=small',
        },
        compact: true,
      },
    })

    expect(wrapper.getComponent(RouterLinkStub).props('to')).toBe('/post/post-1')
    expect(wrapper.get('.referenced-post').classes()).toContain('referenced-post--compact')
    expect(wrapper.get('.referenced-label').text()).toBe('Referenced post')
    expect(wrapper.get('.referenced-title').text()).toBe('Referenced post title')
    expect(wrapper.get('img').attributes('src')).toContain('/thumbnail?size=medium')
  })

  it('caches the thumbnail preview before navigating', async () => {
    referencedPostPreviewMocks.cachePostThumbnailPreviewMock.mockClear()

    const wrapper = mount(ReferencedPostPreview, {
      global: {
        plugins: [i18n],
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
      props: {
        post: {
          id: 'post-2',
          title: 'Another post',
          thumbnail_url: 'https://example.com/thumb.jpg',
        },
      },
    })

    await wrapper.getComponent(RouterLinkStub).trigger('click')

    expect(referencedPostPreviewMocks.cachePostThumbnailPreviewMock).toHaveBeenCalledWith(
      'post-2',
      'https://example.com/thumb.jpg'
    )
  })
})
