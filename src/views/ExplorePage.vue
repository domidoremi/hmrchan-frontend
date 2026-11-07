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

      <div class="collection-tools">
        <label
          ><span>{{ t('spatial.find') }}</span
          ><input
            v-model="feedSearch"
            type="search"
            maxlength="160"
            :placeholder="t('spatial.findLoaded')"
        /></label>
        <label
          ><span class="sr-only">{{ t('spatial.sort') }}</span
          ><select v-model="feedSort">
            <option value="latest">{{ t('explore.newest') }}</option>
            <option value="popular">{{ t('explore.popular') }}</option>
          </select></label
        >
        <span class="collection-tools__count" aria-live="polite">{{
          t('spatial.matches', { count: filteredVisiblePosts.length })
        }}</span>
        <div class="collection-tools__layouts" :aria-label="t('spatial.arrangement')">
          <button
            v-for="layout in feedLayouts"
            :key="layout"
            type="button"
            :aria-pressed="feedLayout === layout"
            @click="feedLayout = layout"
          >
            {{ t(`spatial.${layout}`) }}
          </button>
        </div>
      </div>

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
          <section v-if="feedLayout === 'wall' && editorialLeadPost" class="explore-editorial-grid">
            <div class="explore-story-stage">
              <button
                type="button"
                class="explore-story explore-story--lead"
                :data-post-id="editorialLeadPost.id"
                @click="goToPost(editorialLeadPost.id, editorialLeadPost.thumbnail_url ?? null)"
              >
                <img
                  :src="resolveEditorialImage(editorialLeadPost)"
                  :alt="editorialLeadPost.title || $t('post.untitled')"
                  fetchpriority="high"
                  @error="handleEditorialImageError(editorialLeadPost)"
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
                  :data-post-id="post.id"
                  @click="goToPost(post.id, post.thumbnail_url ?? null)"
                >
                  <img
                    :src="resolveEditorialImage(post)"
                    :alt="post.title || $t('post.untitled')"
                    loading="lazy"
                    @error="handleEditorialImageError(post)"
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
                  <button
                    type="button"
                    :data-post-id="post.id"
                    @click="goToPost(post.id, post.thumbnail_url ?? null)"
                  >
                    <span>{{ String(index + 1).padStart(2, '0') }}</span>
                    <strong>{{ post.title || $t('post.untitled') }}</strong>
                  </button>
                </li>
              </ol>
            </aside>
          </section>

          <StateIndicator v-if="filteredVisiblePosts.length === 0" variant="empty" title-tag="h2" />

          <section
            v-if="feedLayout === 'wall' && masonryVisiblePosts.length > 0"
            class="explore-archive"
          >
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
                  :prefer-original-image="true"
                  @click="goToPost"
                  @height-change="handleCardHeightChange"
                />
              </div>
            </div>
          </section>

          <TransitionGroup
            v-if="feedLayout !== 'wall'"
            name="collection-feed"
            tag="div"
            class="collection-feed"
            :class="`collection-feed--${feedLayout}`"
          >
            <div
              v-for="post in filteredVisiblePosts"
              :key="post.id"
              :data-post-id="post.id"
              tabindex="-1"
            >
              <PostCard
                :post="post"
                image-fit="cover"
                :prefer-original-image="true"
                @click="goToPost"
              />
            </div>
          </TransitionGroup>

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
import { useRouter, useRoute } from 'vue-router'
import { readBrowseState, feedLayouts, type FeedSource } from '@/utils/browseState'
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
import { resolveMediaImageCandidates, resolveMediaSources } from '@/utils/mediaOptimizer'
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
const route = useRoute()
const browse = computed(() => readBrowseState(route.query))
function updateBrowse(key: string, value: string) {
  void router.replace({ query: { ...route.query, [key]: value || undefined } })
}
const feedLayout = computed({
  get: () => browse.value.layout,
  set: (value) => updateBrowse('layout', value),
})
const feedSearch = computed({ get: () => browse.value.q, set: (value) => updateBrowse('q', value) })
const feedSort = computed({
  get: () => browse.value.sort,
  set: (value) => updateBrowse('sort', value),
})
let returnPostId: string | null = null
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
type ExploreEditorialFilter = FeedSource

const EDITORIAL_IMAGE_FALLBACK =
  '/snapshot-media/home/hero-spotlight-f2e0f8f6-0434-4e37-874e-bb9b506585bf.webp'
const activeEditorialFilter = computed({
  get: () => browse.value.source,
  set: (value) => updateBrowse('source', value),
})
const editorialImageSources = ref<Record<string, string>>({})
const editorialImageCandidates = new Map<string, string[]>()
const editorialImageResolutionKeys = new Set<string>()
const editorialFilters = computed<Array<{ id: ExploreEditorialFilter; label: string }>>(() => [
  { id: 'latest', label: t('spatial.all') },
  { id: 'youtube', label: 'YouTube' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'x', label: 'X' },
])
const filteredLoadedPosts = computed(() => {
  const query = feedSearch.value.trim().toLocaleLowerCase()
  const items = posts.value.filter(
    (post) =>
      (activeEditorialFilter.value === 'latest' ||
        (post.platform.toLowerCase() === 'twitter' ? 'x' : post.platform.toLowerCase()) ===
          activeEditorialFilter.value) &&
      (!query ||
        `${post.title ?? ''} ${post.author_name ?? ''}`.toLocaleLowerCase().includes(query))
  )
  if (feedSort.value === 'popular')
    items.sort(
      (left, right) =>
        right.like_count + right.view_count * 0.02 - (left.like_count + left.view_count * 0.02)
    )
  return items
})
const {
  visibleItems: visiblePosts,
  hasMoreToRender,
  revealNextBatch,
} = useProgressiveRender(filteredLoadedPosts, {
  initialCount: initialRenderCount,
  batchSize: progressiveBatchSize,
})

const filteredVisiblePosts = visiblePosts
const editorialLeadPost = computed(() => filteredVisiblePosts.value[0] ?? null)
const editorialSupportPosts = computed(() => filteredVisiblePosts.value.slice(1, 3))
const editorialRailPosts = computed(() => filteredVisiblePosts.value.slice(3, 7))
const masonryVisiblePosts = computed(() => filteredVisiblePosts.value.slice(7))

watch(
  () => [editorialLeadPost.value, ...editorialSupportPosts.value],
  (editorialPosts) => {
    editorialPosts.forEach((post) => {
      if (post) void resolveEditorialImageSource(post)
    })
  },
  { immediate: true }
)

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
  returnPostId = postId
  storePostNavigationContext(filteredLoadedPosts.value, postId, 'explore')
  cachePostThumbnailPreview(postId, thumbnailSrc)
  router.push(`/post/${postId}`)
}

function goToSearch() {
  router.push({ name: 'search' })
}

function resolveEditorialImage(post: PostListItem): string {
  return (
    editorialImageSources.value[post.id] ||
    resolveMediaSources(post).displayUrl ||
    EDITORIAL_IMAGE_FALLBACK
  )
}

async function resolveEditorialImageSource(post: PostListItem): Promise<void> {
  const resolutionKey = [
    post.id,
    post.media_id ?? '',
    post.media_type ?? '',
    post.stream_url ?? '',
    post.thumbnail_url ?? '',
  ].join(':')
  if (editorialImageResolutionKeys.has(resolutionKey)) return
  editorialImageResolutionKeys.add(resolutionKey)

  const candidates = await resolveMediaImageCandidates(post, { probeUnknown: true })
  editorialImageCandidates.set(post.id, [...candidates, EDITORIAL_IMAGE_FALLBACK])
  editorialImageSources.value = {
    ...editorialImageSources.value,
    [post.id]: candidates[0] ?? EDITORIAL_IMAGE_FALLBACK,
  }
}

function handleEditorialImageError(post: PostListItem): void {
  const candidates = editorialImageCandidates.get(post.id) ?? [
    ...resolveMediaSources(post).imageCandidates,
    EDITORIAL_IMAGE_FALLBACK,
  ]
  const currentSource = editorialImageSources.value[post.id] || resolveEditorialImage(post)
  const currentIndex = candidates.indexOf(currentSource)
  editorialImageSources.value = {
    ...editorialImageSources.value,
    [post.id]: candidates[currentIndex + 1] ?? EDITORIAL_IMAGE_FALLBACK,
  }
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

watch([activeEditorialFilter, feedSearch, feedSort, feedLayout], async () => {
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
  if (returnPostId)
    void nextTick(() => {
      const element = Array.from(
        document.querySelectorAll<HTMLElement>('button[data-post-id]')
      ).find((node) => node.dataset['postId'] === returnPostId)
      element?.focus({ preventScroll: true })
      returnPostId = null
    })
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

<style scoped src="../styles/page-systems/explore-page-view.css"></style>
