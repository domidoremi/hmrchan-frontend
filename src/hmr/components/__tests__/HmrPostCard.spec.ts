import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { HmrPost } from '@/api/hmrContent'
import HmrPostCard from '@/hmr/components/HmrPostCard.vue'

function makePost(overrides: Partial<HmrPost> = {}): HmrPost {
  return {
    id: 'post-1',
    title: 'Public post',
    excerpt: 'Summary',
    authorName: 'MomiChan',
    tag: 'YouTube',
    createdAt: '刚刚',
    statsLabel: '12 views',
    platform: 'youtube',
    hasRenderableMedia: true,
    mediaCount: 1,
    ...overrides,
  }
}

describe('HmrPostCard', () => {
  it('keeps decorative badge rows hidden without prohibited ARIA labels', () => {
    const wrapper = mount(HmrPostCard, {
      props: {
        post: makePost(),
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    })

    const badgeRow = wrapper.find('.hmr-post-card__badge-row')

    expect(badgeRow.attributes('aria-hidden')).toBe('true')
    expect(badgeRow.attributes('aria-label')).toBeUndefined()
  })

  it('defaults poster images to lazy auto priority and supports eager hero loading', () => {
    const lazyWrapper = mount(HmrPostCard, {
      props: {
        post: makePost(),
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    })
    const heroWrapper = mount(HmrPostCard, {
      props: {
        post: makePost(),
        imageLoading: 'eager',
        imageFetchPriority: 'high',
        variant: 'hero',
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    })

    expect(lazyWrapper.find('.hmr-post-card__poster').attributes('loading')).toBe('lazy')
    expect(lazyWrapper.find('.hmr-post-card__poster').attributes('fetchpriority')).toBe('auto')
    expect(heroWrapper.find('.hmr-post-card__poster').attributes('loading')).toBe('eager')
    expect(heroWrapper.find('.hmr-post-card__poster').attributes('fetchpriority')).toBe('high')
  })

  it('omits an unavailable poster srcset and renders responsive candidates when available', () => {
    const fallbackWrapper = mount(HmrPostCard, {
      props: {
        post: makePost(),
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    })
    const mediaWrapper = mount(HmrPostCard, {
      props: {
        post: makePost({ mediaUrl: 'https://cdn.example.test/poster.jpg' }),
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    })

    expect(fallbackWrapper.find('.hmr-post-card__poster').attributes('srcset')).toBeUndefined()
    expect(mediaWrapper.find('.hmr-post-card__poster').attributes('srcset')).toContain('640w')
  })

  it('uses shared platform visual fallback values for unknown platforms', () => {
    const wrapper = mount(HmrPostCard, {
      props: {
        post: makePost({ platform: 'unknown' }),
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    })

    expect(wrapper.attributes('data-platform')).toBe('default')
    expect(wrapper.attributes('style')).toContain('--hmr-card-start: #ff7722')
    expect(wrapper.attributes('style')).toContain('--hmr-card-end: #3d2fa9')
  })
})
