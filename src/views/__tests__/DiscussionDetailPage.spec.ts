import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'

import type { HmrDiscussionDetailContent } from '@/api/hmrContent'
import type { HmrAsyncResource } from '@/hmr/types'
import i18n, { applyLocale } from '@/i18n'
import DiscussionDetailPage from '@/views/DiscussionDetailPage.vue'

const DISCUSSION_ID = '018f6d22-3cc7-7a1d-a456-4d2c59b6f4f0'

const mocks = vi.hoisted(() => ({
  loadDiscussionDetailContentResource: vi.fn(),
  readPublicContent: vi.fn(),
}))

vi.mock('@/api/hmrContent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/hmrContent')>()
  return {
    ...actual,
    loadDiscussionDetailContentResource: mocks.loadDiscussionDetailContentResource,
  }
})

vi.mock('@/utils/cache/publicContentCache', () => ({
  readPublicContent: mocks.readPublicContent,
}))

function makeDetailContent(
  overrides: Partial<HmrDiscussionDetailContent> = {}
): HmrDiscussionDetailContent {
  return {
    discussion: {
      id: DISCUSSION_ID,
      title: 'Loaded discussion',
      content: 'Loaded discussion body',
      category: 'general',
      authorName: 'thread-owner',
      createdAt: '5/28 08:00',
      updatedAt: '5/28 08:30',
      lastActivityAt: '5/28 09:00',
      tags: ['release', 'qa'],
      viewCount: 1200,
      likeCount: 23,
      commentCount: 1,
      isPinned: true,
      isClosed: false,
    },
    comments: [
      {
        id: '018f6d22-3cc7-7a1d-a456-4d2c59b6f4f2',
        title: 'reply-owner',
        excerpt: 'First public reply',
        metric: '1 回复 · 4 喜欢',
      },
    ],
    relatedPost: {
      id: '018f6d22-3cc7-7a1d-a456-4d2c59b6f4f1',
      title: 'Related post',
      authorName: 'content-owner',
      thumbnailUrl: '/api/v1/media/related/thumbnail?size=small',
    },
    viewState: 'available',
    ...overrides,
  }
}

function makeResource(
  data: HmrDiscussionDetailContent
): HmrAsyncResource<HmrDiscussionDetailContent> {
  return {
    state: 'ready',
    data,
    source: 'api',
    error: null,
    paths: [`/discussions/${DISCUSSION_ID}`, `/discussions/${DISCUSSION_ID}/comments`],
    updatedAt: '2026-05-28T00:00:00.000Z',
  }
}

async function mountDiscussionDetail(
  path = `/community/discussions/${DISCUSSION_ID}`,
  locale: 'zh-CN' | 'en-US' = 'zh-CN'
) {
  applyLocale(locale)
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/community/discussions/:id', component: DiscussionDetailPage },
      { path: '/community', component: { template: '<div />' } },
      { path: '/posts/:id', component: { template: '<div />' } },
      { path: '/explore', component: { template: '<div />' } },
      { path: '/', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  await router.isReady()

  const wrapper = mount(DiscussionDetailPage, {
    global: {
      plugins: [router, i18n],
    },
  })
  await flushPromises()
  return { wrapper, router }
}

describe('DiscussionDetailPage', () => {
  beforeEach(() => {
    mocks.loadDiscussionDetailContentResource.mockReset()
    mocks.readPublicContent.mockReset()
  })

  it('loads discussion detail through the public cache using the route id', async () => {
    mocks.readPublicContent.mockResolvedValue(makeResource(makeDetailContent()))

    const { wrapper } = await mountDiscussionDetail()

    expect(mocks.readPublicContent).toHaveBeenCalledWith({
      key: `hmr:discussion-detail:${DISCUSSION_ID}`,
      scope: 'discussion-detail',
      strategy: 'stale-while-revalidate',
      loader: expect.any(Function),
    })
    const loader = mocks.readPublicContent.mock.calls[0]?.[0]?.loader as () => Promise<unknown>
    await loader()
    expect(mocks.loadDiscussionDetailContentResource).toHaveBeenCalledExactlyOnceWith(DISCUSSION_ID)
    expect(wrapper.find('.discussion-detail-page').exists()).toBe(true)
    expect(wrapper.find('.discussion-comments').exists()).toBe(true)
    expect(wrapper.find('[data-testid="comment-thread-header"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="discussion-comment-composer"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Loaded discussion')
    expect(wrapper.text()).toContain('First public reply')
  })

  it('maps not-found detail resources to the empty page state', async () => {
    const notFoundContent = makeDetailContent({
      discussion: {
        ...makeDetailContent().discussion,
        title: '讨论不存在或已下架',
        content: '',
      },
      comments: [],
      viewState: 'not-found',
    })
    delete notFoundContent.relatedPost
    mocks.readPublicContent.mockResolvedValue(makeResource(notFoundContent))

    const { wrapper } = await mountDiscussionDetail()

    expect(wrapper.text()).toContain('未找到 · 讨论已移除或下架')
    expect(wrapper.text()).toContain('讨论不存在或已下架')
    expect(wrapper.find('.discussion-comments').exists()).toBe(false)
    expect(wrapper.text()).toContain('当前讨论仍可继续浏览')
    expect(wrapper.text()).toContain('返回社区查看最新讨论')
    expect(wrapper.findAll('.hmr-detail-fallback-card')).toHaveLength(3)
    expect(wrapper.text()).toContain('这条讨论没有可继续显示的公开内容')
    expect(wrapper.text()).not.toContain('重试会重新请求公开讨论接口')
  })

  it('keeps restricted fallback guidance distinct from retryable failures', async () => {
    mocks.readPublicContent.mockResolvedValue(
      makeResource(makeDetailContent({ viewState: 'restricted' }))
    )

    const { wrapper } = await mountDiscussionDetail()

    expect(wrapper.text()).toContain('公开预览受限')
    expect(wrapper.text()).toContain('当前讨论对公开访问受限')
    expect(wrapper.text()).not.toContain('重试会重新请求公开讨论接口')
  })

  it('keeps temporary discussion failures explicitly retryable', async () => {
    mocks.readPublicContent.mockResolvedValue(
      makeResource(makeDetailContent({ viewState: 'temporary-unavailable' }))
    )

    const { wrapper } = await mountDiscussionDetail()

    expect(wrapper.text()).toContain('讨论暂不可用')
    expect(wrapper.text()).toContain('重试会重新请求公开讨论接口')
  })

  it('localizes the complete discussion fallback experience', async () => {
    mocks.readPublicContent.mockResolvedValue(
      makeResource(makeDetailContent({ viewState: 'temporary-unavailable' }))
    )

    const { wrapper } = await mountDiscussionDetail(
      `/community/discussions/${DISCUSSION_ID}`,
      'en-US'
    )

    expect(wrapper.text()).toContain('Discussion unavailable')
    expect(wrapper.text()).toContain('Status overview')
    expect(wrapper.text()).toContain('Continue from this discussion')
    expect(wrapper.text()).toContain('Back to the latest discussions')
    expect(wrapper.get('.hmr-detail-meta-grid').attributes('aria-label')).toBe(
      'Discussion information'
    )
    expect(wrapper.text()).not.toContain('当前讨论仍可继续浏览')
  })

  it('keeps a stable comments readiness anchor when an available discussion has no replies', async () => {
    mocks.readPublicContent.mockResolvedValue(
      makeResource(
        makeDetailContent({
          comments: [],
          discussion: {
            ...makeDetailContent().discussion,
            commentCount: 0,
          },
        })
      )
    )

    const { wrapper } = await mountDiscussionDetail()

    expect(wrapper.find('.discussion-comments').exists()).toBe(true)
    expect(wrapper.find('.hmr-detail-comment-list').exists()).toBe(true)
    expect(wrapper.find('[data-testid="comment-thread-header"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="discussion-comment-composer"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('暂无公开回应')
  })
})
