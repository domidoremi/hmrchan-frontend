<template>
  <div class="explore-page">
    <!-- Platform-specific animated background -->
    <AsyncPlatformCanvas v-if="shouldRenderPlatformBg" :platform="currentPlatform" />

    <div class="container">
      <PageHeroShell class="explore-hero" bare>
        <template #heading>
          <div class="page-hero-shell__title-row">
            <h1 class="page-hero-shell__title">{{ $t('explore.title') }}</h1>
            <span class="page-hero-shell__badge">{{ heroBadgeLabel }}</span>
          </div>
          <p class="page-hero-shell__subtitle">{{ $t('explore.subtitle') }}</p>
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
              <span class="search-trigger-text">{{ $t('search.title') }}</span>
              <template #end>
                <kbd class="search-kbd">/</kbd>
              </template>
            </ControlButton>
            <span v-if="isLoading && posts.length > 0" class="spinner spinner-sm" />
          </div>
        </template>

        <template #meta>
          <PageMetaRow class="page-meta-row--comfortable">
            <PageMetaChip>
              <strong>{{ visiblePosts.length }}</strong>
              <span>{{ $t('search.tab.posts') }}</span>
            </PageMetaChip>
            <PageMetaChip>{{ currentSortLabel }}</PageMetaChip>
            <PageMetaChip>{{ currentPlatformLabel }}</PageMetaChip>
          </PageMetaRow>
        </template>

        <PageToolbar
          class="filters-row page-toolbar-shell--comfortable"
          role="group"
          :aria-label="$t('explore.filters')"
        >
          <ControlGroup
            class="filters page-control-group-shell--comfortable"
            role="group"
            :aria-label="$t('explore.sortBy')"
          >
            <ControlButton
              v-for="sort in sortOptions"
              :key="sort.value"
              class="filter-btn"
              :pressed="currentSort === sort.value"
              :aria-label="sort.label"
              @click="currentSort = sort.value"
            >
              {{ sort.label }}
            </ControlButton>
          </ControlGroup>

          <ControlGroup
            class="platform-filters page-control-group-shell--comfortable"
            justify="end"
            role="group"
            :aria-label="$t('explore.platformFilter')"
          >
            <ControlButton
              v-for="platform in platformOptions"
              :key="platform.value"
              class="platform-btn"
              size="compact"
              :pressed="currentPlatform === platform.value"
              :aria-label="platform.label"
              @click="currentPlatform = platform.value"
            >
              <template #start>
                <AnimatedIcon name="explore" :fallback-icon="platform.icon" size="sm" />
              </template>
              <span class="platform-label">{{ platform.label }}</span>
            </ControlButton>
          </ControlGroup>
        </PageToolbar>
      </PageHeroShell>

      <h2 class="sr-only">{{ $t('search.tab.posts') }}</h2>

      <StateIndicator
        v-if="error && !isUsingFallback"
        variant="error"
        :description="error"
        @action="fetchPosts"
      />

      <template v-else>
        <!-- 骨架屏：使用与真实内容相同的 masonry 布局结构，避免 CLS -->
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
          <!-- JS Masonry 布局 - 避免 CSS column-count 的 CLS 问题 -->
          <div
            ref="masonryContainerRef"
            class="posts-masonry-js"
            :style="{ '--masonry-columns': columnCount }"
          >
            <div v-for="(column, colIndex) in columns" :key="colIndex" class="masonry-column">
              <PostCard
                v-for="(post, postIndex) in column"
                :key="post.id"
                :post="post"
                image-fit="cover"
                :priority="colIndex === 0 && postIndex < 2"
                @click="goToPost"
                @height-change="handleCardHeightChange"
              />
            </div>
          </div>

          <StateIndicator v-if="posts.length === 0" variant="empty" />

          <!-- Load More / Quota Indicator -->
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
  markRaw,
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
  defineAsyncComponent,
  onWatcherCleanup,
  useTemplateRef,
} from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { Search, Globe } from '@lucide/vue'
import { IconYoutube, IconX, IconTiktok, IconInstagram } from '@/components/icons'
import { postService, type PostListItem, ApiError } from '@/api'
import { useCachedPostList } from '@/composables/useCachedPosts'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useProgressiveRender } from '@/composables/useProgressiveRender'
import { useMasonryColumns } from '@/composables/useMasonryColumns'
import { useForwardedElementRef } from '@/composables/useForwardedElementRef'
import { usePreferredPageSize } from '@/composables/usePreferredPageSize'
import { useSettingsStore } from '@/stores'
import { throttleRAF } from '@/utils/performance'
import { createResizeObserver } from '@/utils/modernAPIs'
import { storePostNavigationContext } from '@/utils/postNavigation'
import { cachePostThumbnailPreview } from '@/utils/thumbnailPresentation'
import { getFallbackExplorePosts } from '@/fallbacks/exploreFallback'
import {
  isServiceUnavailableError,
  type PublicPageDataSource,
} from '@/fallbacks/publicPageFallback'
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
import ControlButton from '@/components/appearance/ControlButton.vue'
import ControlGroup from '@/components/appearance/ControlGroup.vue'
import PageHeroShell from '@/components/appearance/PageHeroShell.vue'
import PageMetaChip from '@/components/appearance/PageMetaChip.vue'
import PageMetaRow from '@/components/appearance/PageMetaRow.vue'
import PageToolbar from '@/components/appearance/PageToolbar.vue'

const AsyncPlatformCanvas = defineAsyncComponent(() => import('@/components/ui/PlatformCanvas.vue'))

const router = useRouter()
const { t } = useI18n()
const { settings } = storeToRefs(useSettingsStore())
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

const shouldShowPlatformBg = computed(() => settings.value.enableAnimations && !isMobile)
const platformBgReady = ref(false)
const PLATFORM_BG_DELAY_MS = 2600
let platformBgTimer: number | null = null
const shouldRenderPlatformBg = computed(() => shouldShowPlatformBg.value && platformBgReady.value)

const currentSort = ref<'newest' | 'popular' | 'trending'>('newest')
type ExplorePlatform = 'all' | 'youtube' | 'tiktok' | 'twitter' | 'instagram'
const currentPlatform = ref<ExplorePlatform>('all')

const posts = ref<PostListItem[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const dataSource = ref<PublicPageDataSource>('live')
const isUsingFallback = computed(() => dataSource.value === 'fallback')
const nextCursor = ref<string | null>(null)
const hasMoreFromCursor = ref(false)

// 使用缓存感知的帖子列表加载
const { total, load: loadCachedPosts } = useCachedPostList<PostListItem>(
  async (params) => {
    const result = await postService.listPosts(
      params as Parameters<typeof postService.listPosts>[0]
    )
    return {
      data: result.items,
      total: result.total,
      meta: {
        next_cursor: result.next_cursor ?? null,
        has_more: Boolean(result.has_more),
      },
    }
  },
  { revalidate: true }
)
let fetchPostsToken = 0
let fetchPostsController: AbortController | null = null

// 移动端优化：减少首屏加载数量
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
const pageSize = usePreferredPageSize({
  fallback: isMobile ? 8 : 24,
  min: 8,
  max: 50,
  mobileCap: 12,
})

// JS Masonry 布局 - 避免 CSS column-count 的 CLS 问题
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

const hasKnownTotal = computed(() => total.value > 0)
const hasMore = computed(() => hasMoreFromCursor.value)

// 骨架屏列数和每列数量 - 与真实 masonry 布局保持一致，避免 CLS
const skeletonColumnCount = computed(() => columnCount.value)
const skeletonPerColumn = computed(() => Math.ceil(12 / skeletonColumnCount.value))

const { elementRef: sentinelRef, setElementRef: setSentinelRef } =
  useForwardedElementRef<HTMLElement>()

// 移动端优化：减少初始渲染数量（首屏渲染 6 张，平衡性能和 CLS）
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

const lastVisibleCount = ref(0)
let isActive = true

const hasMoreForUi = computed(() => hasMore.value || hasMoreToRender.value)
const currentSortLabel = computed(
  () =>
    sortOptions.value.find((option) => option.value === currentSort.value)?.label ??
    t('explore.newest')
)
const currentPlatformLabel = computed(
  () =>
    platformOptions.value.find((option) => option.value === currentPlatform.value)?.label ??
    t('explore.allPlatforms')
)
const heroBadgeLabel = computed(() => {
  if (visiblePosts.value.length > 0) {
    return `${visiblePosts.value.length} ${t('search.tab.posts')}`
  }

  return currentPlatformLabel.value
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

function schedulePlatformBackgroundMount() {
  if (typeof window === 'undefined') {
    platformBgReady.value = true
    return
  }
  if (platformBgReady.value || platformBgTimer !== null) return
  // 动画背景属于增强效果，延后加载以优先保障首屏内容渲染。
  platformBgTimer = window.setTimeout(() => {
    platformBgTimer = null
    if (isActive) {
      platformBgReady.value = true
    }
  }, PLATFORM_BG_DELAY_MS)
}

function clearPlatformBackgroundTimer() {
  if (platformBgTimer === null) return
  clearTimeout(platformBgTimer)
  platformBgTimer = null
}

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

const sortOptions = computed(() => [
  { value: 'newest' as const, label: t('explore.newest') },
  { value: 'popular' as const, label: t('explore.popular') },
  { value: 'trending' as const, label: t('explore.trending') },
])
const platformIcons = {
  all: markRaw(Globe),
  youtube: markRaw(IconYoutube),
  tiktok: markRaw(IconTiktok),
  twitter: markRaw(IconX),
  instagram: markRaw(IconInstagram),
} as const

// 品牌 SVG 图标
const platformOptions = computed(() => [
  { value: 'all' as const, label: t('explore.allPlatforms'), icon: platformIcons.all },
  { value: 'youtube' as const, label: 'YouTube', icon: platformIcons.youtube },
  { value: 'tiktok' as const, label: 'TikTok', icon: platformIcons.tiktok },
  { value: 'twitter' as const, label: 'X', icon: platformIcons.twitter },
  { value: 'instagram' as const, label: 'Instagram', icon: platformIcons.instagram },
])

function goToPost(postId: string, thumbnailSrc: string | null) {
  storePostNavigationContext(posts.value, postId, 'explore')
  cachePostThumbnailPreview(postId, thumbnailSrc)
  router.push(`/post/${postId}`)
}

function goToSearch() {
  router.push({ name: 'search' })
}

function getSortParams(sort: 'newest' | 'popular' | 'trending') {
  switch (sort) {
    case 'popular':
      return { sort_by: 'like_count' as const, sort_order: 'desc' as const }
    case 'trending':
      return { sort_by: 'view_count' as const, sort_order: 'desc' as const }
    case 'newest':
    default:
      return { sort_by: 'published_at' as const, sort_order: 'desc' as const }
  }
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

  // 根据屏幕尺寸选择缩略图质量
  const getThumbnailQuality = () => {
    if (typeof window === 'undefined') return 'medium'
    const width = window.innerWidth
    if (width < 640) return 'medium'
    return 'large'
  }

  const platform = currentPlatform.value !== 'all' ? currentPlatform.value : undefined

  try {
    const { sort_by, sort_order } = getSortParams(currentSort.value)
    const requestParams = buildExploreListParams({
      cursor: reset ? null : nextCursor.value,
      pageSize: pageSize.value,
      sortBy: sort_by,
      sortOrder: sort_order,
      thumbnailQuality: getThumbnailQuality(),
      ...(platform ? { platform } : {}),
    })
    const result = await loadCachedPosts(
      requestParams,
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

    dataSource.value = result.fromCache ? 'cached' : 'live'

    if (reset) {
      posts.value = items
    } else {
      posts.value = mergeUniquePostsById(posts.value, items)
    }
    nextCursor.value = cursorState.nextCursor
    hasMoreFromCursor.value = cursorState.hasMore

    // 更新 masonry 布局（仅渲染可见部分）
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

    if (isServiceUnavailableError(err)) {
      const { sort_by, sort_order } = getSortParams(currentSort.value)
      const fallbackPage = reset
        ? 1
        : Math.floor(posts.value.length / Math.max(pageSize.value, 1)) + 1
      const fallbackResult = getFallbackExplorePosts({
        page: fallbackPage,
        page_size: pageSize.value,
        sort_by,
        sort_order,
        ...(platform ? { platform } : {}),
      })

      dataSource.value = 'fallback'
      error.value = null
      total.value = fallbackResult.total
      nextCursor.value = null
      hasMoreFromCursor.value = false

      if (reset) {
        posts.value = fallbackResult.items
      } else {
        posts.value = mergeUniquePostsById(posts.value, fallbackResult.items)
      }

      await nextTick()
      if (requestSignal?.aborted || requestToken !== fetchPostsToken) {
        return false
      }
      applyVisiblePosts(reset)
      return true
    }

    // 筛选时，即使有旧数据也要显示错误
    if (posts.value.length === 0 || platform) {
      if (reset && platform) {
        // 清空旧数据，显示错误状态
        posts.value = []
        total.value = 0
      }
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

// 增加预加载距离，让内容提前加载，避免用户等待
useInfiniteScroll(sentinelRef, loadMore, {
  rootMargin: '800px', // 提前 800px 开始加载下一批
  enabled: () => isActive && hasMoreForUi.value && !isLoading.value && !isLoadingMore.value,
})

// ========== Masonry 布局管理 ==========

/**
 * 计算响应式列数（Explore Masonry）
 * - Mobile: 1 column
 * - Desktop: 3–5 columns
 */
function calculateColumnCount(): number {
  if (typeof window === 'undefined') return 4
  const width = window.innerWidth

  if (width < 768) return 1
  if (width < 1024) return 2
  if (width < 1440) return 3
  if (width < 1920) return 4
  return 5
}

/**
 * 更新 masonry 布局
 */
function updateMasonryLayout(items: PostListItem[], reset = false) {
  const newColumnCount = calculateColumnCount()
  const containerWidth = masonryContainerRef.value?.clientWidth || 1200
  const colWidth = getColumnWidth(containerWidth)

  if (reset || newColumnCount !== columnCount.value) {
    columnCount.value = newColumnCount
    initColumns()
    // 移动端使用轮询分发，避免高度估算误差导致的 CLS
    if (isMobile) {
      distributePostsRoundRobin(items, 0)
    } else {
      redistribute(items, colWidth)
    }
  } else {
    // 追加模式：优先使用缓存高度，回退到虚拟高度，避免同步读取 offsetHeight
    const realHeights =
      cachedColumnHeights.value.length === columnCount.value
        ? cachedColumnHeights.value
        : columnHeights.value
    if (isMobile) {
      // 移动端追加也用轮询
      const startIndex = columns.value.reduce((sum, col) => sum + col.length, 0)
      distributePostsRoundRobin(items, startIndex)
    } else {
      distributePosts(items, colWidth, true, realHeights)
    }
  }

  updateCachedColumnHeights()
}

// 响应式调整列数 - 使用 ResizeObserver 监听容器而非 window
let resizeObserver: ResizeObserver | null = null
let observedResizeElement: HTMLElement | null = null
let lastContainerWidth = 0

/**
 * 处理容器 resize - 使用 ResizeObserver 替代 window resize
 */
const handleContainerResize = throttleRAF((width: number) => {
  // 忽略微小变化，避免频繁重排
  if (Math.abs(width - lastContainerWidth) < 24) return
  lastContainerWidth = width

  const newColumnCount = calculateColumnCount()
  if (newColumnCount !== columnCount.value) {
    columnCount.value = newColumnCount
    const colWidth = getColumnWidth(width)
    initColumns()
    redistribute(visiblePosts.value, colWidth)
    lastVisibleCount.value = visiblePosts.value.length
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
  const current = visiblePosts.value
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

/**
 * 处理卡片高度变化（图片加载完成等）
 */
const handleCardHeightChange = throttleRAF(() => {
  // 高度变化时不需要重新分发，因为 JS masonry 是固定列分配
  // 只有在需要重新平衡时才调用 redistribute
})

watch(currentSort, () => {
  const controller = new AbortController()
  onWatcherCleanup(() => controller.abort())
  void fetchPosts(true, controller.signal)
})

watch(currentPlatform, () => {
  const controller = new AbortController()
  onWatcherCleanup(() => controller.abort())
  void fetchPosts(true, controller.signal)
})

watch(pageSize, () => {
  const controller = new AbortController()
  onWatcherCleanup(() => controller.abort())
  if (posts.value.length === 0 && !isLoading.value) return
  void fetchPosts(true, controller.signal)
})

watchSyncEffect(() => {
  // 切换筛选时同步清理错误态，避免旧错误闪烁到新请求周期。
  void currentSort.value
  void currentPlatform.value
  error.value = null
})

onMounted(() => {
  // 初始化列数（composable 已经用 calculateColumnCount() 初始化了）
  // 确保 columns 数组与当前列数匹配
  initColumns()

  if (posts.value.length === 0) {
    fetchPosts()
  } else {
    // 已有数据时重新分发到列
    nextTick(() => {
      applyVisiblePosts(true)
    })
  }

  attachGlobalListeners()
  if (masonryContainerRef.value) {
    attachResizeObserver(masonryContainerRef.value)
  }
  schedulePlatformBackgroundMount()
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
  schedulePlatformBackgroundMount()
})

onDeactivated(() => {
  isActive = false
  abortFetchPostsRequest()
  fetchPostsToken += 1
  isLoading.value = false
  isLoadingMore.value = false
  clearPlatformBackgroundTimer()
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
  clearPlatformBackgroundTimer()
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
  gap: var(--spacing-3);
}

.search-trigger {
  flex-shrink: 0;
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

.filters {
  flex: 1 1 auto;
  align-items: stretch;
}

.filter-btn {
  white-space: nowrap;
}

.filters-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  margin-bottom: 0;
}

.explore-hero .page-actions {
  flex-wrap: wrap;
}

.platform-filters {
  justify-content: flex-end;
  align-items: stretch;
}

.platform-btn {
  justify-content: flex-start;
  min-inline-size: max-content;
  flex: 0 1 auto;
}

.platform-label {
  display: none;
}

@media (min-width: 768px) {
  .platform-label {
    display: inline;
  }
}

/* ========== JS Masonry 布局 - 避免 CLS ========== */
.posts-masonry-js {
  --masonry-gap: var(--spacing-3);

  display: flex;
  gap: var(--masonry-gap);
  inline-size: 100%;
  margin-block-start: clamp(0.25rem, 0.8vw, 0.6rem);
}

.masonry-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--masonry-gap);
  min-width: 0; /* 防止 flex 子项溢出 */
}

/* 响应式间距调整 */
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
