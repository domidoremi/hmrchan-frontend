import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'

import type { HmrCommunityContent } from '@/api/hmrContent'
import { loadCommunityContentResource } from '@/api/hmrContent'
import type { HmrAsyncResource } from '@/hmr/types'
import { useAuthStore } from '@/stores/auth'
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
      loginCtaBody: '参与社区讨论，与同好分享观点、收藏回应并接收后续提醒。',
      loginCtaPrimary: '登录参与',
      loginCtaSecondary: '先去探索',
      loginCtaTitle: '发起讨论，留下你的观点',
      openFromContent: '查看内容',
      risingTitle: '升温',
      stats: '社区摘要',
      submitFeedback: '反馈',
      submitTopic: '提交',
      threadTitle: '讨论',
      title: '社区',
      topicTitle: '话题',
      previewTitle: '当前显示公开预览',
      previewEmptyBody: '讨论结构保持可浏览，可重新加载公开内容。',
      previewErrorBody: '公开内容暂不可用，预览结构保持可浏览。',
      previewBody: '公开接口恢复后会在当前结构中更新。',
      previewMetric: '预览',
      previewSync: '同步中',
      listLabel: '讨论列表',
    },
    explore: {
      loadMore: '重新加载',
    },
  },
  'en-US': {
    community: {
      allDiscussions: 'All',
      channels: 'Channels',
      eyebrow: 'Community discussions',
      feed: 'Feed',
      hot: 'Hot',
      hotTitle: 'Hot replies',
      latest: 'Latest',
      latestTitle: 'Latest activity',
      loginCtaBody: 'Join discussions and follow updates.',
      loginCtaPrimary: 'Sign in to join',
      loginCtaSecondary: 'Explore first',
      loginCtaTitle: 'Start a discussion',
      openFromContent: 'View content',
      risingTitle: 'Rising',
      stats: 'Community summary',
      submitFeedback: 'Feedback',
      submitTopic: 'Submit',
      threadTitle: 'Threads',
      title: 'Community',
      topicTitle: 'Topics',
      previewTitle: 'Public preview',
      previewEmptyBody: 'The discussion structure remains available. Reload public content.',
      previewErrorBody: 'Public content is unavailable. The preview remains available.',
      previewBody: 'This section updates in place when the public API recovers.',
      previewMetric: 'Preview',
      previewSync: 'Syncing',
      listLabel: 'Discussion list',
    },
    explore: {
      loadMore: 'Reload',
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

function renderRouteHref(to: string | { path: string; query?: Record<string, unknown> }): string {
  if (typeof to === 'string') return to

  const redirect = to.query?.['redirect']
  if (typeof redirect !== 'string') return to.path

  return `${to.path}?redirect=${redirect}`
}

async function mountCommunityPage(
  options: { authenticated?: boolean; locale?: 'zh-CN' | 'en-US' } = {}
) {
  const i18n = createI18n({
    legacy: false,
    locale: options.locale ?? 'zh-CN',
    messages,
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  if (options.authenticated) {
    const auth = useAuthStore()
    auth.user = {
      id: 'user-1',
      username: 'member',
      email: 'member@example.test',
    }
  }
  const wrapper = mount(CommunityPage, {
    global: {
      plugins: [pinia, i18n],
      stubs: {
        RouterLink: {
          props: ['to'],
          methods: { renderRouteHref },
          template: '<a :href="renderRouteHref(to)"><slot /></a>',
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
    setActivePinia(createPinia())
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

  it('renders a guest discussion CTA with clear primary and secondary actions', async () => {
    const wrapper = await mountCommunityPage()
    const card = wrapper.find('.community-priority-card.surface-editorial')

    expect(card.exists()).toBe(true)
    expect(card.text()).toContain('发起讨论，留下你的观点')
    expect(card.text()).toContain('参与社区讨论')
    expect(card.find('.community-priority-card__action--primary').attributes('href')).toBe(
      '/login?redirect=/community'
    )
    expect(card.find('.community-priority-card__action--secondary').attributes('href')).toBe(
      '/explore'
    )
    expect(card.text()).not.toContain('讨论与帖子分离')
  })

  it('hides the guest discussion CTA for authenticated members', async () => {
    const wrapper = await mountCommunityPage({ authenticated: true })

    expect(wrapper.find('.community-priority-card').exists()).toBe(false)
  })

  it('keeps the public preview retryable when the resource is empty', async () => {
    const resource = makeResource({
      stats: [],
      discussions: [],
      hot: [],
      latest: [],
      feed: [],
    })
    readPublicContentMock.mockResolvedValue(resource)

    const wrapper = await mountCommunityPage()
    const state = wrapper.get('[data-hmr-page-state-block="true"]')

    expect(state.attributes('data-hmr-page-state')).toBe('empty')
    expect(state.text()).toContain('当前显示公开预览')
    await state.get('button').trigger('click')
    await flushPromises()
    expect(readPublicContentMock).toHaveBeenCalledTimes(2)
  })

  it('treats latest-only content as real community data', async () => {
    const resource = makeResource({
      stats: [],
      discussions: [],
      hot: [],
      feed: [],
      latest: [
        {
          id: 'latest-only',
          title: 'Latest-only thread',
          excerpt: 'Partial endpoint success',
          metric: 'Now',
        },
      ],
    })
    readPublicContentMock.mockResolvedValue(resource)

    const wrapper = await mountCommunityPage()
    const latestTab = wrapper
      .findAll('.hmr-community-tab')
      .find((button) => button.text().includes('最新'))
    await latestTab?.trigger('click')

    expect(wrapper.classes()).not.toContain('is-preview')
    expect(wrapper.find('[data-hmr-page-state-block="true"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Latest-only thread')
  })

  it('renders preview content in the active locale', async () => {
    const resource = makeResource({
      stats: [],
      discussions: [],
      hot: [],
      latest: [],
      feed: [],
    })
    readPublicContentMock.mockResolvedValue(resource)

    const wrapper = await mountCommunityPage({ locale: 'en-US' })

    expect(wrapper.text()).toContain('Public preview')
    expect(wrapper.text()).toContain('This section updates in place')
    expect(wrapper.text()).not.toContain('当前显示公开预览')
    expect(wrapper.get('.hmr-community-main').attributes('aria-label')).toBe('Discussion list')
  })
})
