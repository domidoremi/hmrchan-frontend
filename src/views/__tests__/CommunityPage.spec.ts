import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'

import type { HmrCommunityContent } from '@/api/hmrContent'
import { loadCommunityContentResource } from '@/api/hmrContent'
import type { HmrAsyncResource } from '@/hmr/types'
import { readPublicContent } from '@/utils/cache/publicContentCache'
import CommunityPage from '@/views/CommunityPage.vue'

vi.mock('@/api/hmrContent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/hmrContent')>()
  return {
    ...actual,
    loadCommunityContentResource: vi.fn(),
  }
})

vi.mock('@/utils/cache/publicContentCache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/cache/publicContentCache')>()
  return {
    ...actual,
    readPublicContent: vi.fn(),
  }
})

const loadCommunityContentResourceMock = vi.mocked(loadCommunityContentResource)
const readPublicContentMock = vi.mocked(readPublicContent)

const messages = {
  'zh-CN': {
    community: {
      allDiscussions: '全部',
      channels: '频道',
      eyebrow: '社区讨论',
      feed: '动态',
      hot: '热门',
      hotTitle: '热门回应',
      latest: '最新',
      latestTitle: '最新动态',
      openFromContent: '查看内容',
      risingTitle: '升温',
      submitFeedback: '反馈',
      submitTopic: '提交',
      threadTitle: '讨论',
      title: '社区',
      topicTitle: '话题',
    },
    explore: {
      loadMore: '重新加载',
    },
  },
}

function makeContent(overrides: Partial<HmrCommunityContent> = {}): HmrCommunityContent {
  return {
    stats: [{ id: 'stat-1', title: 'Active members', excerpt: 'Daily active', metric: '128' }],
    discussions: [
      {
        id: 'post-1',
        title: 'General thread',
        excerpt: 'Open discussion',
        metric: '12 replies',
      },
    ],
    hot: [
      {
        id: 'hot-1',
        title: 'Hot thread',
        excerpt: 'Trending topic',
        metric: '99 replies',
      },
    ],
    latest: [
      {
        id: 'latest-1',
        title: 'Latest thread',
        excerpt: 'New topic',
        metric: '刚刚',
      },
    ],
    feed: [
      {
        id: 'feed-1',
        title: 'Feed item',
        excerpt: 'Feed summary',
        metric: '1 min',
      },
    ],
    ...overrides,
  }
}

function makeResource(data = makeContent()): HmrAsyncResource<HmrCommunityContent> {
  return {
    state: 'ready',
    data,
    source: 'api',
    error: null,
    paths: ['/community/stats'],
    updatedAt: '2026-05-28T00:00:00.000Z',
  }
}

async function mountCommunityPage() {
  const i18n = createI18n({
    legacy: false,
    locale: 'zh-CN',
    messages,
  })
  const wrapper = mount(CommunityPage, {
    global: {
      plugins: [i18n],
      stubs: {
        HmrPageStateBlock: true,
        RouterLink: {
          props: ['to'],
          template: '<a :href="typeof to === `string` ? to : to?.path"><slot /></a>',
        },
      },
    },
  })
  await flushPromises()
  return wrapper
}

describe('CommunityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const resource = makeResource()
    readPublicContentMock.mockResolvedValue(resource)
    loadCommunityContentResourceMock.mockResolvedValue(resource)
  })

  it('renders community content from the public resource cache', async () => {
    const wrapper = await mountCommunityPage()

    expect(wrapper.text()).toContain('General thread')
    expect(wrapper.text()).toContain('Active members')
    expect(wrapper.text()).toContain('Hot thread')
    expect(wrapper.text()).toContain('Feed item')
    expect(readPublicContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'hmr:community',
        scope: 'community',
        strategy: 'network-first',
      })
    )
  })

  it('switches discussion tabs and keeps post-backed rows linked to posts', async () => {
    const wrapper = await mountCommunityPage()
    const latestTab = wrapper
      .findAll('.hmr-community-tab')
      .find((button) => button.text().includes('最新'))

    await latestTab?.trigger('click')

    expect(wrapper.text()).toContain('Latest thread')
    const latestLink = wrapper
      .findAll('.hmr-discussion-row')
      .find((link) => link.text().includes('Latest thread'))
    expect(latestLink?.attributes('href')).toBe('/posts/latest-1')
  })
})
