<template>
  <div class="explore-page">
    <div class="container">
      <PageHeroShell class="explore-hero" bare>
        <template #heading>
          <h1 class="page-hero-shell__title">{{ $t('explore.title') }}</h1>
          <p class="page-hero-shell__subtitle">{{ $t('explore.subtitle') }}</p>
          <span class="sr-only" aria-live="polite">{{ heroBadgeLabel }}</span>
        </template>

        <template #actions>
          <div class="page-actions page-actions--comfortable">
            <ControlButton
              class="search-trigger"
              :aria-label="$t('search.title')"
              @click="goToSearch"
            >
              <template #start>
                <AnimatedIcon name="search" :fallback-icon="Search" size="sm" />
              </template>
              <span class="search-trigger-text">{{ $t('explore.searchAction') }}</span>
              <template #end>
                <kbd class="search-kbd">/</kbd>
              </template>
            </ControlButton>
            <span v-if="isLoading && posts.length > 0" class="spinner spinner-sm" />
          </div>
        </template>
      </PageHeroShell>

      <nav class="explore-filter-tabs" :aria-label="$t('explore.platformFilter')">
        <button
          v-for="filter in editorialFilters"
          :key="filter.id"
          type="button"
          class="explore-filter-tab"
          :class="{ 'explore-filter-tab--active': activeEditorialFilter === filter.id }"
          :aria-pressed="activeEditorialFilter === filter.id"
          @click="activeEditorialFilter = filter.id"
        >
          {{ filter.label }}
        </button>
      </nav>

      <StateIndicator
        v-if="error && !isUsingFallback"
        variant="error"
        title-tag="h2"
        :description="error"
        @action="fetchPosts"
      />

      <template v-else>
        <div
          v-if="isLoading && posts.length === 0"
          class="posts-masonry-js"
          :style="{ '--masonry-columns': skeletonColumnCount }"
        >
          <div
            v-for="colIndex in skeletonColumnCount"
            :key="`skeleton-col-${colIndex}`"
            class="masonry-column"
          >
            <PostCardSkeleton v-for="i in skeletonPerColumn" :key="`skeleton-${colIndex}-${i}`" />
          </div>
        </div>

        <template v-else>
          <section v-if="editorialLeadPost" class="explore-editorial-grid">
            <div class="explore-story-stage">
              <button
                type="button"
                class="explore-story explore-story--lead"
                @click="goToPost(editorialLeadPost.id, editorialLeadPost.thumbnail_url ?? null)"
              >
                <img
                  :src="resolveEditorialImage(editorialLeadPost)"
                  :alt="editorialLeadPost.title || $t('post.untitled')"
                  fetchpriority="high"
                />
                <span class="explore-story__shade" aria-hidden="true" />
                <span class="explore-story__copy">
                  <strong>{{ editorialLeadPost.title || $t('post.untitled') }}</strong>
                  <small>{{ formatEditorialMeta(editorialLeadPost) }}</small>
                </span>
              </button>

              <div class="explore-story-stage__supporting">
                <button
                  v-for="post in editorialSupportPosts"
                  :key="post.id"
                  type="button"
                  class="explore-story explore-story--supporting"
                  @click="goToPost(post.id, post.thumbnail_url ?? null)"
                >
                  <img
                    :src="resolveEditorialImage(post)"
                    :alt="post.title || $t('post.untitled')"
                    loading="lazy"
                  />
                  <span class="explore-story__shade" aria-hidden="true" />
                  <span class="explore-story__copy">
                    <strong>{{ post.title || $t('post.untitled') }}</strong>
                    <small>{{ formatEditorialMeta(post) }}</small>
                  </span>
                </button>
              </div>
            </div>

            <aside class="explore-weekly-rail" :aria-label="$t('explore.weeklyPopular')">
              <h2>{{ $t('explore.weeklyPopular') }}</h2>
              <ol>
                <li v-for="(post, index) in editorialRailPosts" :key="post.id">
                  <button type="button" @click="goToPost(post.id, post.thumbnail_url ?? null)">
                    <span>{{ String(index + 1).padStart(2, '0') }}</span>
                    <strong>{{ post.title || $t('post.untitled') }}</strong>
                  </button>
                </li>
              </ol>
            </aside>
          </section>

          <StateIndicator v-if="filteredVisiblePosts.length === 0" variant="empty" title-tag="h2" />

          <section v-if="masonryVisiblePosts.length > 0" class="explore-archive">
            <h2>{{ $t('explore.moreStories') }}</h2>
            <div
              ref="masonryContainerRef"
              class="posts-masonry-js"
              :style="{ '--masonry-columns': columnCount }"
            >
              <div v-for="(column, colIndex) in columns" :key="colIndex" class="masonry-column">
                <PostCard
                  v-for="post in column"
                  :key="post.id"
                  :post="post"
                  image-fit="cover"
                  @click="goToPost"
                  @height-change="handleCardHeightChange"
                />
              </div>
            </div>
          </section>

          <LoadMoreSection
            v-if="posts.length > 0"
            :count="visiblePosts.length"
            :total="loadMoreTotal"
            :has-more="hasMoreForUi"
            :loading="isLoadingMore"
            :sentinel-ref="setSentinelRef"
            @load-more="loadMore"
          />
        </template>
      </template>
    </div>

    <NextPostFab />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ExplorePage' })

import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  onActivated,
  onDeactivated,
  onRenderTracked,
  onRenderTriggered,
  watch,
  watchPostEffect,
  watchSyncEffect,
  nextTick,
  onWatcherCleanup,
  useTemplateRef,
} from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Search } from '@lucide/vue'
import { ApiError } from '@/api/client'
import { postService, type PostListItem } from '@/api/postService'
import { getPublicPostList } from '@/utils/cache'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useProgressiveRender } from '@/composables/useProgressiveRender'
import { useMasonryColumns } from '@/composables/useMasonryColumns'
import { useForwardedElementRef } from '@/composables/useForwardedElementRef'
import { usePreferredPageSize } from '@/composables/usePreferredPageSize'
import { throttleRAF } from '@/utils/performance'
import { createResizeObserver } from '@/utils/modernAPIs'
import { storePostNavigationContext } from '@/utils/postNavigation'
import { cachePostThumbnailPreview } from '@/utils/thumbnailPresentation'
import type { PublicPageDataSource } from '@/fallbacks/publicPageFallback'
import {
  buildExploreListParams,
  extractExploreCursorState,
  mergeUniquePostsById,
} from '@/views/explore/exploreFeed'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import PostCard from '@/components/business/PostCard.vue'
import PostCardSkeleton from '@/components/business/PostCardSkeleton.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import NextPostFab from '@/components/ui/NextPostFab.vue'
import { ControlButton, PageHeroShell } from '@/components/appearance'

const router = useRouter()
const { t, locale } = useI18n()
const renderDebugEnabled =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  (window as Window & { __MOMI_RENDER_DEBUG__?: boolean }).__MOMI_RENDER_DEBUG__ === true

if (renderDebugEnabled) {
  onRenderTracked((event) => {
    console.debug('[render:tracked][ExplorePage]', event.type, String(event.key))
  })

  onRenderTriggered((event) => {
    console.debug('[render:triggered][ExplorePage]', event.type, String(event.key))
  })
}

const posts = ref<PostListItem[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const dataSource = ref<PublicPageDataSource>('live')
const isUsingFallback = computed(() => dataSource.value === 'fallback')
const nextCursor = ref<string | null>(null)
const hasMoreFromCursor = ref(false)

const total = ref(0)
let fetchPostsToken = 0
let fetchPostsController: AbortController | null = null
let exploreFallbackModulePromise: Promise<typeof import('@/fallbacks/exploreFallback')> | null =
  null
let publicFallbackModulePromise: Promise<typeof import('@/fallbacks/publicPageFallback')> | null =
  null

const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
const pageSize = usePreferredPageSize({
  fallback: isMobile ? 8 : 24,
  min: 8,
  max: 50,
  mobileCap: 12,
})

const masonryContainerRef = useTemplateRef<HTMLElement>('masonryContainerRef')
const cachedColumnHeights = ref<number[]>([])

const {
  columns,
  columnCount,
  columnHeights,
  distributePosts,
  distributePostsRoundRobin,
  redistribute,
  getColumnWidth,
  initColumns,
} = useMasonryColumns({
  initialColumnCount: calculateColumnCount(),
})

const hasKnownTotal = computed(() => false)
const hasMore = computed(() => hasMoreFromCursor.value)

const skeletonColumnCount = computed(() => columnCount.value)
const skeletonPerColumn = computed(() => Math.ceil(12 / skeletonColumnCount.value))

const { elementRef: sentinelRef, setElementRef: setSentinelRef } =
  useForwardedElementRef<HTMLElement>()

const initialRenderCount = computed(() =>
  isMobile ? Math.min(pageSize.value, 6) : Math.min(pageSize.value, 18)
)
const progressiveBatchSize = computed(() => Math.min(pageSize.value, 12))
const {
  visibleItems: visiblePosts,
  hasMoreToRender,
  revealNextBatch,
} = useProgressiveRender(posts, {
  initialCount: initialRenderCount,
  batchSize: progressiveBatchSize,
})

type ExploreEditorialFilter = 'latest' | 'popular' | 'youtube' | 'tiktok' | 'instagram' | 'x'

const activeEditorialFilter = ref<ExploreEditorialFilter>('latest')
const editorialFilters = computed<Array<{ id: ExploreEditorialFilter; label: string }>>(() => [
  { id: 'latest', label: t('explore.newest') },
  { id: 'popular', label: t('explore.popular') },
  { id: 'youtube', label: 'YouTube' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'x', label: 'X' },
])
const filteredVisiblePosts = computed(() => {
  const items = [...visiblePosts.value]
  if (activeEditorialFilter.value === 'latest') return items
  if (activeEditorialFilter.value === 'popular') {
    return items.sort(
      (left, right) =>
        right.like_count + right.view_count * 0.02 - (left.like_count + left.view_count * 0.02)
    )
  }

  return items.filter(
    (post) => post.platform.toLowerCase() === activeEditorialFilter.value.toLowerCase()
  )
})
const editorialLeadPost = computed(() => filteredVisiblePosts.value[0] ?? null)
const editorialSupportPosts = computed(() => filteredVisiblePosts.value.slice(1, 3))
const editorialRailPosts = computed(() => filteredVisiblePosts.value.slice(3, 7))
const masonryVisiblePosts = computed(() => filteredVisiblePosts.value.slice(7))

const lastVisibleCount = ref(0)
let isActive = true

const hasMoreForUi = computed(() => hasMore.value || hasMoreToRender.value)
const heroBadgeLabel = computed(() => {
  if (visiblePosts.value.length > 0) {
    return `${visiblePosts.value.length} ${t('search.tab.posts')}`
  }

  return t('search.tab.posts')
})
const loadMoreTotal = computed(() =>
  hasKnownTotal.value
    ? total.value
    : Math.max(
        visiblePosts.value.length,
        posts.value.length + (hasMore.value ? pageSize.value : 0),
        1
      )
)

const onGlobalKeydown = (event: KeyboardEvent) => {
  if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return

  const target = event.target as HTMLElement | null
  const tagName = target?.tagName?.toLowerCase()
  const isEditable =
    tagName === 'input' ||
    tagName === 'textarea' ||
    (target instanceof HTMLElement && target.isContentEditable)
  if (isEditable) return

  event.preventDefault()
  goToSearch()
}

function goToPost(postId: string, thumbnailSrc: string | null) {
  storePostNavigationContext(posts.value, postId, 'explore')
  cachePostThumbnailPreview(postId, thumbnailSrc)
  router.push(`/post/${postId}`)
}

function goToSearch() {
  router.push({ name: 'search' })
}

function resolveEditorialImage(post: PostListItem): string {
  return (
    post.thumbnail_url ||
    '/snapshot-media/home/hero-spotlight-f2e0f8f6-0434-4e37-874e-bb9b506585bf.webp'
  )
}

function formatEditorialMeta(post: PostListItem): string {
  const source = post.author_name || post.platform
  if (!post.published_at) return source

  const timestamp = Date.parse(post.published_at)
  if (!Number.isFinite(timestamp)) return source

  const date = new Intl.DateTimeFormat(locale.value, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp))
  return `${source} · ${date}`
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException
    ? err.name === 'AbortError'
    : err instanceof Error && err.name === 'AbortError'
}

function abortFetchPostsRequest() {
  fetchPostsController?.abort()
  fetchPostsController = null
}

function loadExploreFallbackModule() {
  if (!exploreFallbackModulePromise) {
    exploreFallbackModulePromise = import('@/fallbacks/exploreFallback')
  }

  return exploreFallbackModulePromise
}

function loadPublicFallbackModule() {
  if (!publicFallbackModulePromise) {
    publicFallbackModulePromise = import('@/fallbacks/publicPageFallback')
  }

  return publicFallbackModulePromise
}

async function fetchPosts(reset = true, signal?: AbortSignal) {
  const requestToken = ++fetchPostsToken
  const hadData = posts.value.length > 0
  const controller = signal ? null : new AbortController()
  const requestSignal = signal ?? controller?.signal

  if (controller) {
    if (reset) {
      abortFetchPostsRequest()
    }
    fetchPostsController = controller
  }

  if (reset) {
    isLoading.value = true
    isLoadingMore.value = false
    total.value = 0
    nextCursor.value = null
    hasMoreFromCursor.value = false
    if (!hadData) {
      posts.value = []
    }
  } else {
    if (isLoadingMore.value || isLoading.value) return false
    isLoadingMore.value = true
  }

  error.value = null

  try {
    const requestParams = buildExploreListParams({
      cursor: reset ? null : nextCursor.value,
      pageSize: pageSize.value,
    })
    const result = await getPublicPostList(
      requestParams,
      (params, config) => postService.listPosts(params, { ...config, skipErrorToast: true }),
      requestSignal ? { signal: requestSignal } : undefined
    )
    const items = result.data as PostListItem[]
    const meta = result.meta ?? {}
    const cursorState = extractExploreCursorState({
      next_cursor:
        typeof meta['next_cursor'] === 'string' || meta['next_cursor'] === null
          ? (meta['next_cursor'] as string | null)
          : null,
      has_more: Boolean(meta['has_more']),
    })

    if (requestSignal?.aborted || requestToken !== fetchPostsToken) {
      return false
    }

    dataSource.value = result.source === 'network' ? 'live' : 'cached'
    total.value = result.total

    if (reset) {
      posts.value = items
    } else {
      posts.value = mergeUniquePostsById(posts.value, items)
    }
    nextCursor.value = cursorState.nextCursor
    hasMoreFromCursor.value = cursorState.hasMore

    await nextTick()
    if (requestSignal?.aborted || requestToken !== fetchPostsToken) {
      return false
    }
    applyVisiblePosts(reset)

    return true
  } catch (err) {
    if (requestSignal?.aborted || isAbortError(err) || requestToken !== fetchPostsToken) {
      return false
    }

    const publicFallbackModule = await loadPublicFallbackModule()
    if (publicFallbackModule.isServiceUnavailableError(err)) {
      const { getFallbackExplorePosts } = await loadExploreFallbackModule()
      const fallbackResult = getFallbackExplorePosts({
        cursor: reset ? null : nextCursor.value,
        limit: pageSize.value,
      })
      const fallbackCursorState = extractExploreCursorState(fallbackResult)

      dataSource.value = 'fallback'
      error.value = null

      if (reset) {
        posts.value = fallbackResult.items
      } else {
        posts.value = mergeUniquePostsById(posts.value, fallbackResult.items)
      }
      nextCursor.value = fallbackCursorState.nextCursor
      hasMoreFromCursor.value = fallbackCursorState.hasMore

      await nextTick()
      if (requestSignal?.aborted || requestToken !== fetchPostsToken) {
        return false
      }
      applyVisiblePosts(reset)
      return true
    }

    if (posts.value.length === 0) {
      if (err instanceof ApiError) {
        error.value = err.message
      } else {
        error.value = t('common.error')
      }
    }

    return false
  } finally {
    if (requestToken === fetchPostsToken) {
      isLoading.value = false
      isLoadingMore.value = false
      if (fetchPostsController === controller) {
        fetchPostsController = null
      }
    }
  }
}

async function loadMore(): Promise<boolean> {
  if (hasMoreToRender.value) {
    revealNextBatch()
    await nextTick()
    applyVisiblePosts(false)
    return true
  }

  if (!hasMore.value || isLoading.value || isLoadingMore.value) return false

  const ok = await fetchPosts(false)
  return ok
}

useInfiniteScroll(sentinelRef, loadMore, {
  rootMargin: '800px',
  enabled: () => isActive && hasMoreForUi.value && !isLoading.value && !isLoadingMore.value,
})

function calculateColumnCount(): number {
  if (typeof window === 'undefined') return 4
  const width = window.innerWidth

  if (width < 768) return 1
  if (width < 1024) return 2
  if (width < 1440) return 3
  if (width < 1920) return 4
  return 5
}

function updateMasonryLayout(items: PostListItem[], reset = false) {
  const newColumnCount = calculateColumnCount()
  const containerWidth = masonryContainerRef.value?.clientWidth || 1200
  const colWidth = getColumnWidth(containerWidth)

  if (reset || newColumnCount !== columnCount.value) {
    columnCount.value = newColumnCount
    initColumns()

    if (isMobile) {
      distributePostsRoundRobin(items, 0)
    } else {
      redistribute(items, colWidth)
    }
  } else {
    const realHeights =
      cachedColumnHeights.value.length === columnCount.value
        ? cachedColumnHeights.value
        : columnHeights.value
    if (isMobile) {
      const startIndex = columns.value.reduce((sum, col) => sum + col.length, 0)
      distributePostsRoundRobin(items, startIndex)
    } else {
      distributePosts(items, colWidth, true, realHeights)
    }
  }

  updateCachedColumnHeights()
}

let resizeObserver: ResizeObserver | null = null
let observedResizeElement: HTMLElement | null = null
let lastContainerWidth = 0

const handleContainerResize = throttleRAF((width: number) => {
  if (Math.abs(width - lastContainerWidth) < 24) return
  lastContainerWidth = width

  const newColumnCount = calculateColumnCount()
  if (newColumnCount !== columnCount.value) {
    columnCount.value = newColumnCount
    const colWidth = getColumnWidth(width)
    initColumns()
    redistribute(masonryVisiblePosts.value, colWidth)
    lastVisibleCount.value = masonryVisiblePosts.value.length
  }
})

function detachResizeObserver() {
  resizeObserver?.disconnect()
  resizeObserver = null
  observedResizeElement = null
}
function attachGlobalListeners() {
  window.addEventListener('keydown', onGlobalKeydown)
}

function detachGlobalListeners() {
  window.removeEventListener('keydown', onGlobalKeydown)
}

function attachResizeObserver(el: HTMLElement) {
  if (observedResizeElement === el && resizeObserver) return

  detachResizeObserver()

  observedResizeElement = el
  lastContainerWidth = Math.round(el.getBoundingClientRect().width)
  resizeObserver = createResizeObserver((entries) => {
    const entry = entries[0]
    if (entry) {
      handleContainerResize(Math.round(entry.contentRect.width))
    }
  })
  resizeObserver?.observe(el)
}

function applyVisiblePosts(reset = false) {
  const current = masonryVisiblePosts.value
  if (current.length === 0) {
    initColumns()
    lastVisibleCount.value = 0
    cachedColumnHeights.value = []
    return
  }

  if (reset || lastVisibleCount.value === 0 || current.length < lastVisibleCount.value) {
    updateMasonryLayout(current, true)
    lastVisibleCount.value = current.length
    return
  }

  const newItems = current.slice(lastVisibleCount.value)
  if (newItems.length > 0) {
    updateMasonryLayout(newItems, false)
    lastVisibleCount.value = current.length
  }
}

function updateCachedColumnHeights() {
  cachedColumnHeights.value = columnHeights.value.slice(0, columnCount.value)
}

const handleCardHeightChange = throttleRAF(() => {})

watch(pageSize, () => {
  const controller = new AbortController()
  onWatcherCleanup(() => controller.abort())
  if (posts.value.length === 0 && !isLoading.value) return
  void fetchPosts(true, controller.signal)
})

watch(activeEditorialFilter, async () => {
  await nextTick()
  applyVisiblePosts(true)
})

watchSyncEffect(() => {
  error.value = null
})

onMounted(() => {
  initColumns()

  if (posts.value.length === 0) {
    fetchPosts()
  } else {
    nextTick(() => {
      applyVisiblePosts(true)
    })
  }

  attachGlobalListeners()
  if (masonryContainerRef.value) {
    attachResizeObserver(masonryContainerRef.value)
  }
})

watchPostEffect(() => {
  const el = masonryContainerRef.value
  if (!el || !isActive) {
    detachResizeObserver()
    return
  }
  attachResizeObserver(el)
})
onActivated(() => {
  isActive = true
  attachGlobalListeners()
  if (masonryContainerRef.value) {
    attachResizeObserver(masonryContainerRef.value)
  }
})

onDeactivated(() => {
  isActive = false
  abortFetchPostsRequest()
  fetchPostsToken += 1
  isLoading.value = false
  isLoadingMore.value = false
  detachGlobalListeners()
  detachResizeObserver()
  handleContainerResize.cancel?.()
  handleCardHeightChange.cancel?.()
})

onBeforeUnmount(() => {
  isActive = false
  abortFetchPostsRequest()
  fetchPostsToken += 1
  isLoading.value = false
  isLoadingMore.value = false
  detachGlobalListeners()
  detachResizeObserver()
  handleContainerResize.cancel?.()
  handleCardHeightChange.cancel?.()
})
</script>

<style scoped>
.explore-page {
  position: relative;
  padding: var(--spacing-4) 0 var(--spacing-8);
  min-height: 100svh;
  min-height: 100dvh;
}

.fallback-preview {
  display: grid;
  gap: var(--spacing-2);
  padding: clamp(1rem, 1.8vw, 1.25rem);
  margin-block-end: var(--spacing-4);
}

.fallback-preview__label {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.fallback-preview p {
  margin: 0;
  max-width: 52ch;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.fallback-preview__detail {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.page-hero-shell__badge {
  min-block-size: var(--ui-chip-height);
  padding-inline: var(--ui-chip-padding-x);
  background: var(--page-shell-control-bg);
  border: 0.0625rem solid var(--page-shell-control-border);
  color: var(--page-shell-control-ink);
  box-shadow: none;
}

.page-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-3);
  min-inline-size: 0;
}

.search-trigger {
  flex: 0 1 auto;
  min-inline-size: 0;
}

.search-trigger-text {
  display: none;
}

@media (min-width: 640px) {
  .search-trigger-text {
    display: inline;
  }
}

.search-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-block-size: calc(var(--ui-control-height-sm) - 0.75rem);
  min-inline-size: 1.5rem;
  padding-inline: 0.375rem;
  background: var(--page-shell-control-bg);
  border: 0.0625rem solid var(--page-shell-control-border);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  line-height: var(--appearance-ui-line-height);
  color: var(--semantic-text-tertiary);
}

.explore-hero .page-actions {
  flex-wrap: wrap;
}

.explore-filter-tabs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: clamp(0.85rem, 2vw, 1.5rem);
  margin-block: clamp(0.75rem, 2vw, 1.5rem) clamp(1rem, 2.5vw, 1.75rem);
  border-block-end: 0.0625rem solid var(--letterbook-line, var(--color-border));
}

.explore-filter-tab {
  position: relative;
  min-block-size: 2.75rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--letterbook-muted, var(--color-text-secondary));
  font: inherit;
  font-weight: 650;
  cursor: pointer;
}

.explore-filter-tab::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  inset-block-end: -0.0625rem;
  block-size: 0.125rem;
  border-radius: 999rem;
  background: var(--letterbook-accent, var(--color-primary));
  transform: scaleX(0);
  transition: transform var(--transition-fast);
}

.explore-filter-tab:hover,
.explore-filter-tab:focus-visible,
.explore-filter-tab--active {
  color: var(--letterbook-accent, var(--color-primary));
}

.explore-filter-tab--active::after {
  transform: scaleX(1);
}

.explore-editorial-grid {
  display: grid;
  grid-template-columns: minmax(0, 2.1fr) minmax(15rem, 1fr);
  align-items: start;
  gap: clamp(2rem, 4vw, 3rem);
}

.explore-story-stage {
  display: grid;
  gap: clamp(1rem, 2vw, 1.4rem);
  min-inline-size: 0;
}

.explore-story-stage__supporting {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(1rem, 2vw, 1.4rem);
}

.explore-story {
  position: relative;
  display: block;
  inline-size: 100%;
  min-inline-size: 0;
  padding: 0;
  overflow: clip;
  border: 0.0625rem solid var(--letterbook-line, var(--color-border));
  border-radius: var(--letterbook-photo-radius, var(--radius-xl));
  background: var(--letterbook-paper, var(--color-surface));
  color: #fff;
  text-align: start;
  cursor: pointer;
  box-shadow: none;
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    border-color var(--transition-fast);
}

.explore-story:hover,
.explore-story:focus-visible {
  border-color: var(--letterbook-line-strong, var(--color-primary));
  box-shadow: var(--letterbook-shadow, var(--shadow-lg));
  transform: translateY(-0.18rem);
}

.explore-story--lead {
  aspect-ratio: 2.55 / 1;
}

.explore-story--supporting {
  aspect-ratio: 1.48 / 1;
}

.explore-story img {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  transition: transform 500ms cubic-bezier(0.22, 1, 0.36, 1);
}

.explore-story:hover img,
.explore-story:focus-visible img {
  transform: scale(1.025);
}

.explore-story__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 42%, rgb(42 20 35 / 0.86));
}

.explore-story__copy {
  position: absolute;
  inset-inline: clamp(1.1rem, 2.4vw, 1.75rem);
  inset-block-end: clamp(1rem, 2.2vw, 1.5rem);
  display: grid;
  gap: 0.35rem;
  z-index: 1;
}

.explore-story__copy strong {
  font-family: var(--letterbook-display-font, var(--font-serif));
  font-size: clamp(1.05rem, 1rem + 0.45vw, 1.45rem);
  line-height: 1.35;
  text-wrap: balance;
}

.explore-story__copy small {
  color: rgb(255 255 255 / 0.86);
  font-size: var(--text-xs);
}

.explore-weekly-rail {
  padding-block: clamp(1.25rem, 2.5vw, 2rem);
  border-block: 0.0625rem solid var(--letterbook-line, var(--color-border));
}

.explore-weekly-rail h2,
.explore-archive > h2 {
  margin: 0;
  color: var(--letterbook-ink, var(--color-text-primary));
  font-family: var(--letterbook-display-font, var(--font-serif));
  font-size: clamp(1.35rem, 1.15rem + 0.65vw, 1.75rem);
  font-weight: 650;
}

.explore-weekly-rail ol {
  display: grid;
  gap: 0;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
}

.explore-weekly-rail li + li {
  border-block-start: 0.0625rem solid color-mix(in srgb, var(--letterbook-line) 72%, transparent);
}

.explore-weekly-rail button {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr);
  align-items: start;
  gap: 0.75rem;
  inline-size: 100%;
  min-block-size: 3.25rem;
  padding: 0.8rem 0;
  border: 0;
  background: transparent;
  color: var(--letterbook-ink, var(--color-text-primary));
  text-align: start;
  cursor: pointer;
}

.explore-weekly-rail button > span {
  color: var(--letterbook-accent, var(--color-primary));
  font-family: var(--letterbook-display-font, var(--font-serif));
}

.explore-weekly-rail button > strong {
  font-size: var(--text-sm);
  font-weight: 550;
  line-height: 1.55;
}

.explore-weekly-rail button:hover > strong,
.explore-weekly-rail button:focus-visible > strong {
  color: var(--letterbook-accent, var(--color-primary));
}

.explore-archive {
  display: grid;
  gap: 1rem;
  margin-block-start: clamp(2.5rem, 6vw, 4.5rem);
  padding-block-start: clamp(1.25rem, 2.5vw, 2rem);
  border-block-start: 0.0625rem solid var(--letterbook-line, var(--color-border));
}

.posts-masonry-js {
  --masonry-gap: var(--spacing-3);

  display: flex;
  align-items: flex-start;
  flex-wrap: nowrap;
  gap: var(--masonry-gap);
  inline-size: 100%;
  margin-block-start: clamp(0.25rem, 0.8vw, 0.6rem);
}

.masonry-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--masonry-gap);
  min-width: 0;
}

@media (max-width: 767px) {
  .explore-filter-tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .explore-filter-tabs::-webkit-scrollbar {
    display: none;
  }

  .explore-filter-tab {
    flex: 0 0 auto;
  }

  .explore-editorial-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 2rem;
  }

  .explore-story--lead {
    aspect-ratio: 1.08 / 1;
  }

  .explore-story-stage__supporting {
    grid-template-columns: minmax(0, 1fr);
  }

  .explore-story--supporting {
    aspect-ratio: 1.3 / 1;
  }

  .posts-masonry-js {
    flex-direction: column;
  }

  .masonry-column {
    inline-size: 100%;
  }
}

@media (min-width: 1024px) {
  .posts-masonry-js {
    --masonry-gap: var(--spacing-4);
  }
}

.post-card {
  overflow: hidden;
}

.post-card-btn {
  display: block;
  inline-size: 100%;
  text-align: left;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.post-content {
  padding: var(--spacing-3);
}
</style>
