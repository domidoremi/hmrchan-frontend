import { ref } from 'vue'
import { describe, expect, it } from 'vitest'

import type { HmrCommunityContent, HmrCommunityItem } from '@/api/hmrContent'
import { useHmrCommunityBoard } from '@/hmr/composables/useHmrCommunityBoard'

const labels: Record<string, string> = {
  'community.allDiscussions': '全部',
  'community.feed': '动态',
  'community.hot': '热门',
  'community.latest': '最新',
}
const t = (key: string) => labels[key] ?? key

function makeItem(overrides: Partial<HmrCommunityItem> = {}): HmrCommunityItem {
  return {
    id: 'post-1',
    title: 'Community thread',
    excerpt: 'Thread summary',
    metric: '12 replies',
    ...overrides,
  }
}

function makeContent(overrides: Partial<HmrCommunityContent> = {}): HmrCommunityContent {
  return {
    stats: [],
    discussions: [],
    hot: [],
    latest: [],
    feed: [],
    ...overrides,
  }
}

describe('useHmrCommunityBoard', () => {
  it('builds tab options and falls back to discussions for empty tabs', () => {
    const content = ref(
      makeContent({
        discussions: [makeItem({ id: 'discussion-1', title: 'All discussion' })],
        latest: [makeItem({ id: 'latest-1', title: 'Latest discussion' })],
      })
    )
    const board = useHmrCommunityBoard(content, t)

    expect(board.discussionTabs.value).toEqual([
      { id: 'discussions', label: '全部', count: 1 },
      { id: 'hot', label: '热门', count: 0 },
      { id: 'latest', label: '最新', count: 1 },
      { id: 'feed', label: '动态', count: 0 },
    ])

    board.activeTab.value = 'hot'
    expect(board.activeTabLabel.value).toBe('热门')
    expect(board.visibleThreads.value.map((item) => item.id)).toEqual(['discussion-1'])

    board.activeTab.value = 'latest'
    expect(board.visibleThreads.value.map((item) => item.id)).toEqual(['latest-1'])
  })

  it('prioritizes hot threads and limits the hot section to four items', () => {
    const content = ref(
      makeContent({
        discussions: Array.from({ length: 6 }, (_, index) =>
          makeItem({ id: `discussion-${index + 1}` })
        ),
        hot: Array.from({ length: 5 }, (_, index) => makeItem({ id: `hot-${index + 1}` })),
      })
    )
    const board = useHmrCommunityBoard(content, t)

    expect(board.hotThreads.value.map((item) => item.id)).toEqual([
      'hot-1',
      'hot-2',
      'hot-3',
      'hot-4',
    ])

    content.value = makeContent({
      discussions: Array.from({ length: 5 }, (_, index) =>
        makeItem({ id: `discussion-${index + 1}` })
      ),
    })
    expect(board.hotThreads.value.map((item) => item.id)).toEqual([
      'discussion-1',
      'discussion-2',
      'discussion-3',
      'discussion-4',
    ])
  })

  it('resolves thread targets for explicit, demo, community, and post-backed rows', () => {
    const board = useHmrCommunityBoard(ref(makeContent()), t)

    expect(board.threadTarget(makeItem({ id: 'post-1', target: '/contact' }))).toBe('/contact')
    expect(board.threadTarget(makeItem({ id: 'demo-thread' }))).toBe('/community')
    expect(board.threadTarget(makeItem({ id: 'community-thread' }))).toBe('/community')
    expect(board.threadTarget(makeItem({ id: 'post-1' }))).toBe('/posts/post-1')
  })
})
