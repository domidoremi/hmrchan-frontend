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
})
