import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const exploreMocks = vi.hoisted(() => ({
  loadCachedPosts: vi.fn(),
  total: null as { value: number } | null,
  createResizeObserver: vi.fn(),
  storePostNavigationContext: vi.fn(),
  cachePostThumbnailPreview: vi.fn(),
  getFallbackExplorePosts: vi.fn(),
  isServiceUnavailableError: vi.fn(),
}))

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')

  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
  }
})

vi.mock('@/api/client', () => {
  class MockApiError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  }

  return {
    ApiError: MockApiError,
  }
})

vi.mock('@/api/postService', () => ({
  postService: {
    listPosts: vi.fn(),
  },
}))

vi.mock('@/composables/useCachedPosts', async () => {
  const { ref } = await import('vue')
  const total = ref(0)
  exploreMocks.total = total

  return {
    useCachedPostList: () => ({
      total,
      load: async (...args: Parameters<typeof exploreMocks.loadCachedPosts>) => {
        const result = await exploreMocks.loadCachedPosts(...args)
        total.value = result.total ?? 0
        return result
      },
    }),
  }
})

vi.mock('@/composables/useInfiniteScroll', () => ({
  useInfiniteScroll: vi.fn(),
}))

vi.mock('@/composables/usePreferredPageSize', async () => {
  const { ref } = await import('vue')
  return {
    usePreferredPageSize: () => ref(24),
  }
})

vi.mock('@/composables/useForwardedElementRef', async () => {
  const { ref } = await import('vue')
  return {
    useForwardedElementRef: () => {
      const elementRef = ref<HTMLElement | null>(null)
      return {
        elementRef,
        setElementRef: (element: HTMLElement | null) => {
          elementRef.value = element
        },
      }
    },
  }
})

vi.mock('@/composables/useProgressiveRender', async () => {
  const { computed } = await import('vue')
  return {
    useProgressiveRender: (source: { value: unknown[] }) => ({
      visibleItems: computed(() => source.value),
      hasMoreToRender: { value: false },
      revealNextBatch: vi.fn(),
    }),
  }
})

vi.mock('@/composables/useMasonryColumns', async () => {
  const { ref } = await import('vue')

  return {
    useMasonryColumns: ({ initialColumnCount }: { initialColumnCount: number }) => {
      const columnCount = ref(initialColumnCount)
      const columns = ref<unknown[][]>(Array.from({ length: columnCount.value }, () => []))
      const columnHeights = ref<number[]>(Array.from({ length: columnCount.value }, () => 0))

      const initColumns = () => {
        columns.value = Array.from({ length: columnCount.value }, () => [])
        columnHeights.value = Array.from({ length: columnCount.value }, () => 0)
      }

      const fillColumns = (items: unknown[]) => {
        initColumns()
        items.forEach((item, index) => {
          columns.value[index % columnCount.value].push(item)
        })
      }

      return {
        columns,
        columnCount,
        columnHeights,
        distributePosts: (items: unknown[]) => {
          items.forEach((item, index) => {
            columns.value[index % columnCount.value].push(item)
          })
        },
        distributePostsRoundRobin: (items: unknown[], startIndex = 0) => {
          items.forEach((item, index) => {
            columns.value[(startIndex + index) % columnCount.value].push(item)
          })
        },
        redistribute: (items: unknown[]) => {
          fillColumns(items)
        },
        getColumnWidth: () => 320,
        initColumns,
      }
    },
  }
})

vi.mock('@/utils/performance', () => ({
  throttleRAF: (fn: (...args: unknown[]) => unknown) => {
    const wrapped = (...args: unknown[]) => fn(...args)
    ;(wrapped as typeof wrapped & { cancel?: () => void }).cancel = vi.fn()
    return wrapped
  },
}))

vi.mock('@/utils/modernAPIs', () => ({
  createResizeObserver: exploreMocks.createResizeObserver,
}))

vi.mock('@/utils/postNavigation', () => ({
  storePostNavigationContext: exploreMocks.storePostNavigationContext,
}))

vi.mock('@/utils/thumbnailPresentation', () => ({
  cachePostThumbnailPreview: exploreMocks.cachePostThumbnailPreview,
}))

vi.mock('@/fallbacks/exploreFallback', () => ({
  getFallbackExplorePosts: exploreMocks.getFallbackExplorePosts,
}))

vi.mock('@/fallbacks/publicPageFallback', () => ({
  isServiceUnavailableError: exploreMocks.isServiceUnavailableError,
}))

vi.mock('@/views/explore/exploreFeed', () => ({
  buildExploreListParams: (params: Record<string, unknown>) => params,
  extractExploreCursorState: (meta: { next_cursor?: string | null; has_more?: boolean }) => ({
    nextCursor: meta.next_cursor ?? null,
    hasMore: Boolean(meta.has_more),
  }),
  mergeUniquePostsById: (current: Array<{ id: string }>, incoming: Array<{ id: string }>) => {
    const seen = new Set(current.map((item) => item.id))
    return [...current, ...incoming.filter((item) => !seen.has(item.id))]
  },
}))

vi.mock('@/components/ui/StateIndicator.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'StateIndicator',
      props: ['variant', 'description'],
      template:
        '<div data-testid="state-indicator" :data-variant="variant" :data-description="description" />',
    }),
  }
})

vi.mock('@/components/business/PostCard.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'PostCard',
      props: ['post'],
      template: '<article class="post-card-stub">{{ post.title }}</article>',
    }),
  }
})

vi.mock('@/components/business/PostCardSkeleton.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'PostCardSkeleton',
      template: '<div data-testid="post-card-skeleton" />',
    }),
  }
})

vi.mock('@/components/ui/LoadMoreSection.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'LoadMoreSection',
      props: ['count', 'total', 'hasMore', 'loading'],
      template:
        '<div data-testid="load-more-section" :data-count="count" :data-total="total" :data-has-more="String(hasMore)" :data-loading="String(loading)" />',
    }),
  }
})

vi.mock('@/components/animation/AnimatedIcon.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'AnimatedIcon',
      template: '<span data-stub="animated-icon" />',
    }),
  }
})

vi.mock('@/components/ui/NextPostFab.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'NextPostFab',
      template: '<div data-testid="next-post-fab" />',
    }),
  }
})

vi.mock('@/components/appearance/ControlButton.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'ControlButton',
      emits: ['click'],
      template:
        '<button type="button" @click="$emit(\'click\', $event)"><slot name="start" /><slot /><slot name="end" /></button>',
    }),
  }
})

vi.mock('@/components/appearance/ControlGroup.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'ControlGroup',
      template: '<div><slot /></div>',
    }),
  }
})

vi.mock('@/components/appearance/PageHeroShell.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'PageHeroShell',
      template:
        '<div><slot name="heading" /><slot name="actions" /><slot name="meta" /><slot /></div>',
    }),
  }
})

vi.mock('@/components/appearance/PageMetaChip.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'PageMetaChip',
      template: '<span><slot /></span>',
    }),
  }
})

vi.mock('@/components/appearance/PageMetaRow.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'PageMetaRow',
      template: '<div><slot /></div>',
    }),
  }
})

vi.mock('@/components/appearance/PageToolbar.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'PageToolbar',
      template: '<div><slot /></div>',
    }),
  }
})

import ExplorePage from '../ExplorePage.vue'

function createWrapper() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div>home</div>' } },
      { path: '/explore', name: 'explore', component: ExplorePage },
      { path: '/search', name: 'search', component: { template: '<div>search</div>' } },
      { path: '/post/:id', name: 'post-detail', component: { template: '<div>post</div>' } },
    ],
  })

  return { router }
}

describe('ExplorePage', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1280,
    })

    exploreMocks.total!.value = 0
    exploreMocks.loadCachedPosts.mockReset()
    exploreMocks.createResizeObserver.mockReset()
    exploreMocks.createResizeObserver.mockReturnValue({
      observe: vi.fn(),
      disconnect: vi.fn(),
    })
    exploreMocks.storePostNavigationContext.mockReset()
    exploreMocks.cachePostThumbnailPreview.mockReset()
    exploreMocks.getFallbackExplorePosts.mockReset()
    exploreMocks.isServiceUnavailableError.mockReset()
    exploreMocks.isServiceUnavailableError.mockReturnValue(false)
  })

  it('renders loaded posts, navigates with "/" shortcut, and refetches for filters', async () => {
    exploreMocks.loadCachedPosts.mockResolvedValue({
      data: [
        { id: 'post-1', title: 'First post', platform: 'youtube' },
        { id: 'post-2', title: 'Second post', platform: 'twitter' },
      ],
      meta: { next_cursor: 'next-1', has_more: true },
      fromCache: false,
    })

    const { router } = createWrapper()
    await router.push('/explore')
    await router.isReady()

    const wrapper = mount(ExplorePage, {
      global: {
        plugins: [router],
        mocks: {
          $t: (key: string) => key,
        },
        stubs: {
          transition: false,
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('explore.title')
    expect(wrapper.text()).toContain('2 search.tab.posts')
    expect(wrapper.findAll('.post-card-stub')).toHaveLength(2)
    expect(wrapper.get('[data-testid="load-more-section"]').attributes('data-total')).toBe('26')
    expect(exploreMocks.loadCachedPosts).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: null,
        pageSize: 24,
        sortBy: 'published_at',
        sortOrder: 'desc',
        thumbnailQuality: 'large',
      }),
      expect.any(Object)
    )

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('explore.popular'))!
      .trigger('click')
    await flushPromises()

    expect(exploreMocks.loadCachedPosts).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sortBy: 'like_count',
        sortOrder: 'desc',
      }),
      expect.any(Object)
    )

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('YouTube'))!
      .trigger('click')
    await flushPromises()

    expect(exploreMocks.loadCachedPosts).toHaveBeenLastCalledWith(
      expect.objectContaining({
        platform: 'youtube',
      }),
      expect.any(Object)
    )

    const shortcutEvent = new KeyboardEvent('keydown', {
      key: '/',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(shortcutEvent)
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('search')
  })

  it('renders an error state when loading fails outside fallback mode', async () => {
    const { ApiError } = await import('@/api/client')

    exploreMocks.loadCachedPosts.mockRejectedValue(new ApiError(500, 'boom'))

    const { router } = createWrapper()
    await router.push('/explore')
    await router.isReady()

    const wrapper = mount(ExplorePage, {
      global: {
        plugins: [router],
        mocks: {
          $t: (key: string) => key,
        },
        stubs: {
          transition: false,
        },
      },
    })

    await flushPromises()

    expect(wrapper.get('[data-testid="state-indicator"]').attributes('data-variant')).toBe('error')
    expect(wrapper.get('[data-testid="state-indicator"]').attributes('data-description')).toBe(
      'boom'
    )
  })
})
