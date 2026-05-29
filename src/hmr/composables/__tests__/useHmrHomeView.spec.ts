import { ref } from 'vue'
import { describe, expect, it } from 'vitest'

import type { HmrHomeContent, HmrPost } from '@/api/hmrContent'
import {
  HMR_HOME_PLATFORM_ITEMS,
  normalizeHomePosts,
  toCssContentString,
  useHmrHomeView,
} from '@/hmr/composables/useHmrHomeView'

function makePost(overrides: Partial<HmrPost> = {}): HmrPost {
  return {
    id: 'post-1',
    title: 'Home post',
    excerpt: 'Public summary',
    authorName: 'MomiChan',
    tag: 'YouTube',
    createdAt: '刚刚',
    statsLabel: '12 views',
    ...overrides,
  }
}

function makeContent(overrides: Partial<HmrHomeContent> = {}): HmrHomeContent {
  return {
    featured: [],
    storyDeck: [],
    highlights: [],
    trends: [],
    scheduleHighlights: [],
    ...overrides,
  }
}

describe('useHmrHomeView', () => {
  it('normalizes the featured home posts and limits the visible set', () => {
    const content = ref(
      makeContent({
        featured: Array.from({ length: 8 }, (_, index) => makePost({ id: `post-${index + 1}` })),
      })
    )
    const view = useHmrHomeView(content)

    expect(view.featuredPosts.value.map((post) => post.id)).toEqual([
      'post-1',
      'post-2',
      'post-3',
      'post-4',
      'post-5',
      'post-6',
    ])
    expect(normalizeHomePosts([makePost({ id: 'keep' }), null, undefined], 3)).toEqual([
      expect.objectContaining({ id: 'keep' }),
    ])
  })

  it('exposes platform strip labels and escaped CSS content strings', () => {
    const view = useHmrHomeView(ref(makeContent()))

    expect(view.platformItems).toBe(HMR_HOME_PLATFORM_ITEMS)
    expect(toCssContentString('A "quote" \\ slash')).toBe('"A \\"quote\\" \\\\ slash"')
    expect(view.cssContent('TikTok')).toBe('"TikTok"')
  })
})
