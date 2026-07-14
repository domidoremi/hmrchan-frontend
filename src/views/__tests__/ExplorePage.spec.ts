import { flushPromises, mount, type Stubs } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'

import type { HmrExploreContent, HmrPost } from '@/api/hmrContent'
import type { HmrAsyncResource } from '@/hmr/types'
import type { IdleTaskHandle } from '@/utils/performance'
import ExplorePage from '@/views/ExplorePage.vue'

const mockReadPublicContent = vi.hoisted(() => vi.fn())
const mockRunWhenIdle = vi.hoisted(() =>
  vi.fn<(callback: () => void) => IdleTaskHandle | undefined>((callback) => {
    callback()
    return undefined
  })
)

vi.mock('@/utils/cache/publicContentCache', () => ({
  readPublicContent: mockReadPublicContent,
}))

vi.mock('@/utils/performance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/performance')>()
  return {
    ...actual,
    runWhenIdle: mockRunWhenIdle,
  }
})

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
  return mountExplorePageWithStubs()
}

async function mountExplorePageWithStubs(stubs: Stubs = defaultExploreStubs()) {
  const i18n = createI18n({
    legacy: false,
    locale: 'zh-CN',
    messages,
  })
  const wrapper = mount(ExplorePage, {
    global: {
      plugins: [i18n],
      stubs,
    },
  })
  await flushPromises()
  return wrapper
}

function defaultExploreStubs(): Stubs {
  return {
    HmrPostCard: {
      props: ['post', 'imageLoading', 'imageFetchPriority'],
      template:
        '<article class="hmr-post-card" :data-loading="imageLoading" :data-priority="imageFetchPriority">{{ post.title }}</article>',
    },
  }
}

describe('ExplorePage', () => {
  beforeEach(() => {
    mockReadPublicContent.mockReset()
    mockRunWhenIdle.mockReset()
    mockRunWhenIdle.mockImplementation((callback: () => void) => {
      callback()
      return undefined
    })
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

  it('prioritizes first-viewport post thumbnails', async () => {
    mockReadPublicContent.mockResolvedValue(
      makeResource({
        data: makeContent({
          posts: [
            makePost({ id: 'post-1', title: 'First post' }),
            makePost({ id: 'post-2', title: 'Second post' }),
            makePost({ id: 'post-3', title: 'Third post' }),
          ],
        }),
      })
    )

    const wrapper = await mountExplorePage()
    const cards = wrapper.findAll('.hmr-post-card')

    expect(cards.map((card) => card.attributes('data-loading'))).toEqual(['eager', 'eager', 'lazy'])
    expect(cards.map((card) => card.attributes('data-priority'))).toEqual(['high', 'high', 'auto'])
  })

  it('keeps filter menu targets mounted for aria-controls', async () => {
    mockReadPublicContent.mockResolvedValue(makeResource())
    const wrapper = await mountExplorePage()
    const menuIds = ['platform', 'sort', 'kind', 'duration']

    for (const id of menuIds) {
      const trigger = wrapper.get(`#hmr-filter-value-${id}`)
      const menu = wrapper.get(`#${trigger.attributes('aria-controls')}`)

      expect(menu.element).toBeDefined()
      expect(menu.attributes('hidden')).toBeDefined()
    }

    await wrapper.get('#hmr-filter-value-platform').trigger('click')

    expect(wrapper.get('#hmr-filter-menu-platform').attributes('hidden')).toBeUndefined()
  })

  it('renders real post cards with navigable thumbnails for visible public content', async () => {
    mockReadPublicContent.mockResolvedValue(
      makeResource({
        data: makeContent({
          posts: [
            makePost({
              id: 'real-post',
              title: 'Visible poster post',
              mediaUrl: '/api/v1/media/poster/thumbnail?size=small',
            }),
          ],
        }),
      })
    )

    const wrapper = await mountExplorePageWithStubs({
      RouterLink: {
        props: ['to'],
        template: '<a class="router-link-stub" :href="to"><slot /></a>',
      },
    })
    const card = wrapper.find('.hmr-post-card')
    const poster = card.find('.hmr-post-card__poster')

    expect(card.attributes('href')).toBe('/posts/real-post')
    expect(card.classes()).toContain('hmr-post-card--real-poster')
    expect(poster.attributes('src')).toBe('/api/v1/media/poster/thumbnail?size=small')
    expect(poster.attributes('srcset')).toContain('/api/v1/media/poster/thumbnail?size=medium')
    expect(poster.attributes('loading')).toBe('eager')
    expect(poster.attributes('fetchpriority')).toBe('high')
  })

  it('defers below-the-fold media and author sections until idle time', async () => {
    let idleCallback: (() => void) | undefined
    mockRunWhenIdle.mockImplementationOnce((callback: () => void) => {
      idleCallback = callback
      return { id: 1, type: 'timeout' }
    })
    mockReadPublicContent.mockResolvedValue(
      makeResource({
        data: makeContent({
          posts: [makePost()],
          authors: [
            {
              id: 'author-1',
              name: 'Momi',
              bio: 'Creator',
              avatarUrl: '',
            },
          ],
        }),
      })
    )

    const wrapper = await mountExplorePage()

    expect(wrapper.find('.hmr-cinema-section').exists()).toBe(false)
    expect(wrapper.find('.hmr-author-strip').exists()).toBe(false)

    idleCallback?.()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.hmr-cinema-section').exists()).toBe(true)
    expect(wrapper.find('.hmr-author-strip').exists()).toBe(true)
  })

  it('renders a compact initial post set before idle expansion', async () => {
    let idleCallback: (() => void) | undefined
    mockRunWhenIdle.mockImplementationOnce((callback: () => void) => {
      idleCallback = callback
      return { id: 1, type: 'timeout' }
    })
    mockReadPublicContent.mockResolvedValue(
      makeResource({
        data: makeContent({
          posts: Array.from({ length: 8 }, (_, index) =>
            makePost({ id: `post-${index + 1}`, title: `Post ${index + 1}` })
          ),
        }),
      })
    )

    const wrapper = await mountExplorePage()

    expect(wrapper.findAll('.hmr-post-card')).toHaveLength(6)

    idleCallback?.()
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.hmr-post-card')).toHaveLength(8)
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
    expect(
      wrapper.get('[data-hmr-page-state-block="true"]').attributes('data-hmr-page-state')
    ).toBe('error')
  })

  it('distinguishes an empty public catalog from filtered empty results', async () => {
    mockReadPublicContent.mockResolvedValue(makeResource())
    const wrapper = await mountExplorePage()

    expect(wrapper.text()).toContain('暂无公开内容')
    expect(
      wrapper.get('[data-hmr-page-state-block="true"]').attributes('data-hmr-page-state')
    ).toBe('empty')

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

  it('appends the next page when loading more public posts', async () => {
    mockReadPublicContent
      .mockResolvedValueOnce(
        makeResource({
          data: makeContent({
            posts: [makePost({ id: 'post-1', title: 'First page post' })],
            nextCursor: 'cursor-2',
            hasMore: true,
          }),
        })
      )
      .mockResolvedValueOnce(
        makeResource({
          data: makeContent({
            posts: [makePost({ id: 'post-2', title: 'Second page post' })],
            nextCursor: null,
            hasMore: false,
          }),
        })
      )
    const wrapper = await mountExplorePage()

    await wrapper.find('.hmr-load-more button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('First page post')
    expect(wrapper.text()).toContain('Second page post')
    expect(mockReadPublicContent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        key: 'hmr:explore:{"query":"","platform":"all","sortBy":"published_at","cursor":"cursor-2","limit":12}:all:all',
        scope: 'explore',
        strategy: 'network-first',
      })
    )
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
