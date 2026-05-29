import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { HmrExploreContent, HmrPost } from '@/api/hmrContent'
import { useHmrExploreCatalog } from '@/hmr/composables/useHmrExploreCatalog'
import type { HmrAsyncResource } from '@/hmr/types'
import { readPublicContent } from '@/utils/cache/publicContentCache'
import { runWhenIdle } from '@/utils/performance'

vi.mock('@/utils/cache/publicContentCache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/cache/publicContentCache')>()
  return {
    ...actual,
    readPublicContent: vi.fn(),
  }
})

vi.mock('@/api/hmrContent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/hmrContent')>()
  return {
    ...actual,
    loadExploreContentResource: vi.fn(),
  }
})

vi.mock('@/utils/performance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/performance')>()
  return {
    ...actual,
    cancelIdleTask: vi.fn(actual.cancelIdleTask),
    runWhenIdle: vi.fn(actual.runWhenIdle),
  }
})

const readPublicContentMock = vi.mocked(readPublicContent)
const runWhenIdleMock = vi.mocked(runWhenIdle)
const t = (key: string) => (key === 'explore.clear' ? '清除筛选' : key)

function makePost(overrides: Partial<HmrPost> = {}): HmrPost {
  return {
    id: 'post-1',
    title: 'YouTube live cut',
    excerpt: 'Public summary',
    authorName: 'MomiChan',
    tag: 'YouTube',
    createdAt: '刚刚',
    statsLabel: '12 views',
    platform: 'youtube',
    durationSec: 45,
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
    updatedAt: '2026-05-28T00:00:00.000Z',
    ...overrides,
  }
}

describe('useHmrExploreCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    runWhenIdleMock.mockImplementation((callback) => {
      callback()
      return undefined
    })
  })

  it('defers below-the-fold Explore sections until idle time', () => {
    let idleCallback: (() => void) | undefined
    runWhenIdleMock.mockImplementationOnce((callback) => {
      idleCallback = callback
      return { id: 1, type: 'timeout' }
    })

    const catalog = useHmrExploreCatalog(t)

    expect(catalog.showDeferredSections.value).toBe(false)

    idleCallback?.()

    expect(catalog.showDeferredSections.value).toBe(true)
  })

  it('keeps the initial rendered post list compact until deferred sections are enabled', async () => {
    let idleCallback: (() => void) | undefined
    runWhenIdleMock.mockImplementationOnce((callback) => {
      idleCallback = callback
      return { id: 1, type: 'timeout' }
    })
    readPublicContentMock.mockResolvedValueOnce(
      makeResource({
        data: makeContent({
          posts: Array.from({ length: 8 }, (_, index) =>
            makePost({ id: `post-${index + 1}`, title: `Post ${index + 1}` })
          ),
        }),
      })
    )
    const catalog = useHmrExploreCatalog(t)

    await catalog.refreshExplore()

    expect(catalog.visiblePosts.value).toHaveLength(8)
    expect(catalog.renderedPosts.value).toHaveLength(6)

    idleCallback?.()

    expect(catalog.renderedPosts.value).toHaveLength(8)
  })

  it('filters visible posts by content kind and duration', async () => {
    readPublicContentMock.mockResolvedValueOnce(
      makeResource({
        data: makeContent({
          posts: [
            makePost({ id: 'short-media', title: 'Short media', durationSec: 45 }),
            makePost({
              id: 'long-media',
              title: 'Long media',
              durationSec: 900,
            }),
            makePost({
              id: 'text-post',
              title: 'Text note',
              durationSec: 0,
              hasRenderableMedia: false,
              mediaCount: 0,
              mediaUrl: undefined,
            }),
          ],
        }),
      })
    )
    const catalog = useHmrExploreCatalog(t)

    await catalog.refreshExplore()
    catalog.contentKind.value = 'media'
    catalog.durationRange.value = 'short'

    expect(catalog.visiblePosts.value.map((post) => post.id)).toEqual(['short-media'])
    expect(catalog.hasActiveFilters.value).toBe(true)
    expect(catalog.catalogStateActionLabel.value).toBe('清除筛选')
  })

  it('builds platform summaries from visible posts when API summaries are absent', async () => {
    readPublicContentMock.mockResolvedValueOnce(
      makeResource({
        data: makeContent({
          posts: [
            makePost({ id: 'yt', platform: 'youtube' }),
            makePost({ id: 'tw', platform: 'twitter' }),
          ],
        }),
      })
    )
    const catalog = useHmrExploreCatalog(t)

    await catalog.refreshExplore()

    expect(catalog.platformOptions.value).toEqual(
      expect.arrayContaining([
        { id: 'all', label: '全部平台', count: 2 },
        { id: 'youtube', label: 'YouTube', count: 1 },
        { id: 'x', label: 'X', count: 1 },
      ])
    )
  })

  it('appends next-page posts with the active cache key', async () => {
    readPublicContentMock
      .mockResolvedValueOnce(
        makeResource({
          data: makeContent({
            posts: [makePost({ id: 'first', title: 'First page' })],
            nextCursor: 'cursor-2',
            hasMore: true,
          }),
        })
      )
      .mockResolvedValueOnce(
        makeResource({
          data: makeContent({
            posts: [makePost({ id: 'second', title: 'Second page' })],
            nextCursor: null,
            hasMore: false,
          }),
        })
      )
    const catalog = useHmrExploreCatalog(t)

    await catalog.refreshExplore()
    await catalog.loadMore()

    expect(catalog.content.value.posts.map((post) => post.id)).toEqual(['first', 'second'])
    expect(readPublicContentMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        key: 'hmr:explore:{"query":"","platform":"all","sortBy":"published_at","cursor":"cursor-2","limit":12}:all:all',
        scope: 'explore',
      })
    )
  })

  it('clears active filters through the catalog state action', async () => {
    readPublicContentMock.mockResolvedValue(makeResource())
    const catalog = useHmrExploreCatalog(t)
    catalog.query.value = 'missing'
    catalog.platform.value = 'youtube'
    catalog.contentKind.value = 'media'
    catalog.durationRange.value = 'long'

    catalog.handleCatalogStateAction()

    expect(catalog.query.value).toBe('')
    expect(catalog.platform.value).toBe('all')
    expect(catalog.contentKind.value).toBe('all')
    expect(catalog.durationRange.value).toBe('all')
  })
})
