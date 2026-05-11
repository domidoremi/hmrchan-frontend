import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'

import type { HmrExploreContent, HmrPost } from '@/api/hmrContent'
import type { HmrAsyncResource } from '@/hmr/types'
import ExplorePage from '@/views/ExplorePage.vue'

const mockReadPublicContent = vi.hoisted(() => vi.fn())

vi.mock('@/utils/cache/publicContentCache', () => ({
  readPublicContent: mockReadPublicContent,
}))

vi.mock('@/api/hmrContent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/hmrContent')>()
  return {
    ...actual,
    loadExploreContentResource: vi.fn(),
  }
})

function makePost(overrides: Partial<HmrPost> = {}): HmrPost {
  return {
    id: 'post-1',
    title: 'YouTube live cut',
    excerpt: 'Public post summary',
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

function makeContent(overrides: Partial<HmrExploreContent> = {}): HmrExploreContent {
  return {
    posts: [],
    authors: [],
    suggestions: [],
    platforms: [],
    nextCursor: null,
    hasMore: false,
    activeQuery: '',
    activePlatform: 'all',
    ...overrides,
  }
}

function makeResource(
  overrides: Partial<HmrAsyncResource<HmrExploreContent>> = {}
): HmrAsyncResource<HmrExploreContent> {
  return {
    state: 'ready',
    data: makeContent(),
    source: 'api',
    error: null,
    paths: ['/posts'],
    updatedAt: '2026-05-11T00:00:00.000Z',
    ...overrides,
  }
}

const messages = {
  'zh-CN': {
    explore: {
      allMedia: '全部媒体',
      allPosts: '全部作品',
      apply: '应用',
      authorTitle: '创作者',
      authors: '作者',
      clear: '清除筛选',
      duration: '时长',
      durationAll: '全部时长',
      durationLong: '长内容',
      durationMedium: '中等',
      durationShort: '短内容',
      end: '已到底',
      eyebrow: '探索',
      grid: '网格',
      kindAll: '全部类型',
      kindMedia: '媒体',
      kindText: '文字',
      list: '列表',
      loadMore: '加载更多',
      platform: '平台',
      search: '搜索',
      searchPlaceholder: '搜索公开内容',
      sort: '排序',
      sortComments: '评论',
      sortLikes: '喜欢',
      sortPublished: '发布',
      sortScraped: '抓取',
      sortViews: '观看',
      title: '探索',
      type: '类型',
    },
  },
}

async function mountExplorePage() {
  const i18n = createI18n({
    legacy: false,
    locale: 'zh-CN',
    messages,
  })
  const wrapper = mount(ExplorePage, {
    global: {
      plugins: [i18n],
      stubs: {
        HmrPostCard: {
          props: ['post'],
          template: '<article class="hmr-post-card">{{ post.title }}</article>',
        },
      },
    },
  })
  await flushPromises()
  return wrapper
}

describe('ExplorePage', () => {
  beforeEach(() => {
    mockReadPublicContent.mockReset()
  })

  it('shows public posts when the resource has visible content', async () => {
    mockReadPublicContent.mockResolvedValue(
      makeResource({
        data: makeContent({
          posts: [makePost()],
        }),
      })
    )

    const wrapper = await mountExplorePage()

    expect(wrapper.text()).toContain('YouTube live cut')
    expect(wrapper.findAll('.hmr-post-card')).toHaveLength(1)
  })

  it('shows a blocking error when no content can be displayed', async () => {
    mockReadPublicContent.mockResolvedValue(
      makeResource({
        source: 'local',
        error: {
          kind: 'network',
          message: 'fetch failed',
          path: '/posts',
        },
      })
    )

    const wrapper = await mountExplorePage()

    expect(wrapper.text()).toContain('公开内容暂时不可用')
    expect(wrapper.text()).toContain('最新公开内容加载失败')
  })

  it('distinguishes an empty public catalog from filtered empty results', async () => {
    mockReadPublicContent.mockResolvedValue(makeResource())
    const wrapper = await mountExplorePage()

    expect(wrapper.text()).toContain('暂无公开内容')

    await wrapper.find('input').setValue('missing term')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('筛选无结果')
    expect(wrapper.text()).toContain('清除筛选')
  })

  it('keeps stale or cached content visible while surfacing a non-blocking error', async () => {
    mockReadPublicContent.mockResolvedValue(
      makeResource({
        source: 'local',
        error: {
          kind: 'network',
          message: 'offline',
          path: '/posts',
        },
        data: makeContent({
          posts: [makePost({ id: 'cached-post', title: 'Cached public post' })],
        }),
      })
    )

    const wrapper = await mountExplorePage()

    expect(wrapper.text()).toContain('Cached public post')
    expect(wrapper.text()).toContain('正在显示可用内容')
    expect(wrapper.text()).not.toContain('公开内容暂时不可用')
  })

  it('shows loading skeletons before the first resource resolves', async () => {
    mockReadPublicContent.mockReturnValue(new Promise(() => undefined))

    const wrapper = mount(ExplorePage, {
      global: {
        plugins: [
          createI18n({
            legacy: false,
            locale: 'zh-CN',
            messages,
          }),
        ],
        stubs: {
          HmrPostCard: true,
        },
      },
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.hmr-media-skeleton')).toHaveLength(6)
  })
})
