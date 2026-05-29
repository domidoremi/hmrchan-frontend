import { computed, getCurrentInstance, onBeforeUnmount, ref } from 'vue'

import {
  loadExploreContentResource,
  MOMICHAN_PLATFORMS,
  normalizePlatformId,
  seedAuthors,
  summarizePlatforms,
  type HmrExploreContent,
  type HmrExploreLoadOptions,
  type HmrPost,
} from '@/api/hmrContent'
import { useHmrPublicContentResource } from '@/hmr/composables/useHmrPublicContentResource'
import { readPublicContent } from '@/utils/cache/publicContentCache'
import { cancelIdleTask, runWhenIdle, type IdleTaskHandle } from '@/utils/performance'

export type HmrExploreViewMode = 'grid' | 'list'
export type HmrExploreContentKind = 'all' | 'media' | 'text'
export type HmrExploreDurationRange = 'all' | 'short' | 'medium' | 'long'

const RIBBON_COLOR_PAIRS = [
  ['#ff7722', '#3d2fa9'],
  ['#3d2fa9', '#ff3c34'],
  ['#ffc765', '#ff7722'],
  ['#171412', '#3d2fa9'],
]
const INITIAL_RENDERED_POST_LIMIT = 6

const initialExploreContent: HmrExploreContent = {
  posts: [],
  authors: seedAuthors,
  suggestions: [],
  platforms: [],
  nextCursor: null,
  hasMore: false,
  activeQuery: '',
  activePlatform: 'all',
}

function hasVisibleMedia(post: HmrPost): boolean {
  return Boolean(post.mediaUrl) || Boolean(post.hasRenderableMedia) || (post.mediaCount ?? 0) > 0
}

function matchesDurationRange(post: HmrPost, durationRange: HmrExploreDurationRange): boolean {
  const duration = post.durationSec ?? 0
  return (
    durationRange === 'all' ||
    (durationRange === 'short' && duration > 0 && duration <= 60) ||
    (durationRange === 'medium' && duration > 60 && duration <= 600) ||
    (durationRange === 'long' && duration > 600)
  )
}

function matchesContentKind(post: HmrPost, contentKind: HmrExploreContentKind): boolean {
  return (
    contentKind === 'all' ||
    (contentKind === 'media' && hasVisibleMedia(post)) ||
    (contentKind === 'text' && !hasVisibleMedia(post))
  )
}

export function useHmrExploreCatalog(t: (key: string) => string) {
  const viewMode = ref<HmrExploreViewMode>('grid')
  const query = ref('')
  const platform = ref('all')
  const sortBy = ref('published_at')
  const contentKind = ref<HmrExploreContentKind>('all')
  const durationRange = ref<HmrExploreDurationRange>('all')
  const showDeferredSections = ref(false)
  let deferredSectionsHandle: IdleTaskHandle | undefined

  if (typeof window !== 'undefined') {
    deferredSectionsHandle = runWhenIdle(
      () => {
        showDeferredSections.value = true
        deferredSectionsHandle = undefined
      },
      { timeout: 1800, fallbackDelay: 900 }
    )
  } else {
    showDeferredSections.value = true
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      cancelIdleTask(deferredSectionsHandle)
    })
  }

  function activeOptions(cursor: string | null = null): HmrExploreLoadOptions {
    return {
      query: query.value,
      platform: platform.value,
      sortBy: sortBy.value,
      cursor,
      limit: 12,
    }
  }

  function cacheKeyForOptions(options: HmrExploreLoadOptions): string {
    return `hmr:explore:${JSON.stringify(options)}:${contentKind.value}:${durationRange.value}`
  }

  function activeCacheKey(): string {
    return cacheKeyForOptions(activeOptions())
  }

  const {
    content,
    pageState,
    resource,
    refresh: refreshExploreResource,
    applyResource: applyExploreResource,
  } = useHmrPublicContentResource<HmrExploreContent>({
    initialData: initialExploreContent,
    paths: ['/posts/mixed', '/posts', '/authors', '/search/suggestions'],
    cacheKey: () => activeCacheKey(),
    scope: 'explore',
    strategy: 'network-first',
    loader: () => loadExploreContentResource(activeOptions()),
    isEmpty: (data) => data.posts.length === 0,
  })

  const posts = computed(() => content.value.posts.filter((post): post is HmrPost => Boolean(post)))
  const visiblePosts = computed(() =>
    posts.value.filter(
      (post) =>
        Boolean(post.id) &&
        post.title.trim().length > 0 &&
        matchesContentKind(post, contentKind.value) &&
        matchesDurationRange(post, durationRange.value)
    )
  )
  const hasActiveFilters = computed(
    () =>
      Boolean(query.value.trim()) ||
      platform.value !== 'all' ||
      contentKind.value !== 'all' ||
      durationRange.value !== 'all'
  )
  const hasVisiblePosts = computed(() => visiblePosts.value.length > 0)
  const renderedPosts = computed(() =>
    showDeferredSections.value
      ? visiblePosts.value
      : visiblePosts.value.slice(0, INITIAL_RENDERED_POST_LIMIT)
  )
  const showLoadingSkeleton = computed(
    () => pageState.value === 'loading' && !hasVisiblePosts.value
  )
  const blockingError = computed(() => (hasVisiblePosts.value ? null : resource.value.error))
  const nonBlockingError = computed(() => (hasVisiblePosts.value ? resource.value.error : null))
  const catalogStateTitle = computed(() => (hasActiveFilters.value ? '筛选无结果' : '暂无公开内容'))
  const catalogStateBody = computed(() =>
    hasActiveFilters.value
      ? '当前条件下没有匹配的公开内容，可以清除筛选后重新浏览。'
      : '当前没有可显示的公开帖子，稍后刷新可重新拉取最新内容。'
  )
  const catalogStateActionLabel = computed(() =>
    hasActiveFilters.value && !blockingError.value ? t('explore.clear') : '重新加载'
  )
  const balancedRibbonPosts = computed(() => {
    const grouped = new Map<string, HmrPost[]>()
    for (const post of visiblePosts.value) {
      const key = normalizePlatformId(post.platform)
      const bucket = grouped.get(key) ?? []
      bucket.push(post)
      grouped.set(key, bucket)
    }

    const result: HmrPost[] = []
    const platformIds = MOMICHAN_PLATFORMS
    for (let index = 0; result.length < 8 && index < 8; index += 1) {
      for (const platformId of platformIds) {
        const nextPost = grouped.get(platformId)?.[index]
        if (nextPost) result.push(nextPost)
        if (result.length >= 8) break
      }
    }

    return result
  })
  const platformOptions = computed(() => {
    if (content.value.platforms.length) return content.value.platforms
    return summarizePlatforms(
      visiblePosts.value.length ? visiblePosts.value : posts.value,
      platform.value
    )
  })

  function glyphFor(post: HmrPost, index: number): string {
    return post.title.trim().slice(0, 1).toUpperCase() || String(index + 1)
  }

  function cardStyle(index: number): Record<string, string> {
    const pair = RIBBON_COLOR_PAIRS[index % RIBBON_COLOR_PAIRS.length] ?? RIBBON_COLOR_PAIRS[0]
    return {
      '--hmr-card-start': pair?.[0] ?? '#ff7722',
      '--hmr-card-end': pair?.[1] ?? '#3d2fa9',
    }
  }

  async function refreshExplore(): Promise<void> {
    await refreshExploreResource()
  }

  async function loadMore(): Promise<void> {
    if (!content.value.hasMore || pageState.value === 'loading') return

    pageState.value = 'loading'
    const options = activeOptions(content.value.nextCursor)
    const nextResource = await readPublicContent({
      key: cacheKeyForOptions(options),
      scope: 'explore',
      strategy: 'network-first',
      loader: () => loadExploreContentResource(options),
    })
    applyExploreResource({
      ...nextResource,
      data: {
        ...nextResource.data,
        posts: [...content.value.posts, ...nextResource.data.posts],
      },
    })
  }

  function applySuggestion(value: string): void {
    query.value = value
    void refreshExplore()
  }

  function applyPlatform(value: string): void {
    platform.value = value
    void refreshExplore()
  }

  function clearFilters(): void {
    query.value = ''
    platform.value = 'all'
    sortBy.value = 'published_at'
    contentKind.value = 'all'
    durationRange.value = 'all'
    void refreshExplore()
  }

  function handleCatalogStateAction(): void {
    if (hasActiveFilters.value && !blockingError.value) {
      clearFilters()
      return
    }

    void refreshExplore()
  }

  return {
    activeOptions,
    balancedRibbonPosts,
    blockingError,
    cacheKeyForOptions,
    cardStyle,
    catalogStateActionLabel,
    catalogStateBody,
    catalogStateTitle,
    clearFilters,
    content,
    contentKind,
    durationRange,
    glyphFor,
    handleCatalogStateAction,
    hasActiveFilters,
    hasVisiblePosts,
    loadMore,
    nonBlockingError,
    pageState,
    platform,
    platformOptions,
    query,
    renderedPosts,
    refreshExplore,
    resource,
    showLoadingSkeleton,
    showDeferredSections,
    sortBy,
    viewMode,
    visiblePosts,
    applyPlatform,
    applySuggestion,
  }
}
