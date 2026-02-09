<template>
  <div class="explore-page">
    <!-- Blue Polymorph 3D 动画背景 -->
    <BluePolymorph
      v-if="shouldShowPolymorph"
      :morph-class-name="morphClassName"
      :morph-c-s-s-vars="morphCSSVars"
    />

    <!-- MindMarket 风格背景装饰 -->
    <div class="explore-bg" aria-hidden="true">
      <div class="explore-bg__blob explore-bg__blob--green" />
      <div class="explore-bg__blob explore-bg__blob--purple" />
      <div class="explore-bg__blob explore-bg__blob--teal" />
    </div>

    <div class="container">
      <header class="page-header">
        <div class="page-title-row">
          <div class="page-title-group">
            <h1>{{ $t('explore.title') }}</h1>
            <span class="page-title-badge">{{ total }} {{ $t('search.tab.posts') }}</span>
          </div>
          <div class="page-actions">
            <button
              type="button"
              class="search-trigger glass-btn"
              @click="goToSearch"
              :aria-label="$t('search.title')"
            >
              <AnimatedIcon name="search" :fallback-icon="Search" size="sm" />
              <span class="search-trigger-text">{{ $t('search.title') }}</span>
              <kbd class="search-kbd">/</kbd>
            </button>
            <span v-if="isLoading && posts.length > 0" class="spinner spinner-sm" />
          </div>
        </div>
      </header>

      <div class="filters-row" role="group" :aria-label="$t('explore.filters')">
        <div class="filters" role="group" :aria-label="$t('explore.sortBy')">
          <button
            v-for="sort in sortOptions"
            :key="sort.value"
            type="button"
            class="filter-btn"
            :class="{ active: currentSort === sort.value }"
            :aria-pressed="currentSort === sort.value"
            :aria-label="$t(`explore.${sort.value}`)"
            @click="currentSort = sort.value"
          >
            {{ $t(`explore.${sort.value}`) }}
          </button>
        </div>

        <div class="platform-filters" role="group" :aria-label="$t('explore.platformFilter')">
          <button
            v-for="platform in platformOptions"
            :key="platform.value"
            type="button"
            class="platform-btn"
            :class="{ active: currentPlatform === platform.value }"
            :aria-pressed="currentPlatform === platform.value"
            :aria-label="platform.label"
            @click="currentPlatform = platform.value"
          >
            <AnimatedIcon name="explore" :fallback-icon="platform.icon" size="sm" />
            <span class="platform-label">{{ platform.label }}</span>
          </button>
        </div>
      </div>

      <StateIndicator v-if="error" variant="error" :description="error" @action="fetchPosts" />

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
            <div
              v-for="(column, colIndex) in columns"
              :key="colIndex"
              :ref="
                (el) => {
                  if (el) columnRefs[colIndex] = el as HTMLElement
                }
              "
              class="masonry-column"
            >
              <PostCard
                v-for="post in column"
                :key="post.id"
                :post="post"
                image-fit="contain"
                :priority="colIndex === 0 && column.indexOf(post) < 2"
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
            :total="total"
            :has-more="hasMoreForUi"
            :loading="isLoadingMore"
            :sentinel-ref="setSentinelRef"
            @load-more="loadMore"
          />
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ExplorePage' })

import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { Search, Globe, Music2, Video, Instagram } from 'lucide-vue-next'
import { postService, type PostListItem, ApiError } from '@/api'
import { useCachedPostList } from '@/composables/useCachedPosts'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useProgressiveRender } from '@/composables/useProgressiveRender'
import { useMasonryColumns } from '@/composables/useMasonryColumns'
import { useBluePolymorph, type PlatformMorphState } from '@/composables/useBluePolymorph'
import { useContextualBackground } from '@/composables/useContextualBackground'
import { useSettingsStore } from '@/stores'
import { throttleRAF, prefersReducedMotion } from '@/utils/performance'
import { createResizeObserver } from '@/utils/modernAPIs'
import { storePostNavigationContext } from '@/utils/postNavigation'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import PostCard from '@/components/business/PostCard.vue'
import PostCardSkeleton from '@/components/business/PostCardSkeleton.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import BluePolymorph from '@/components/ui/BluePolymorph.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

const router = useRouter()
const { t } = useI18n()
const { settings } = storeToRefs(useSettingsStore())
const { setExploreFilter } = useContextualBackground()

const shouldShowPolymorph = computed(
  () => settings.value.enableAnimations && !prefersReducedMotion()
)

const currentSort = ref<'newest' | 'popular' | 'trending'>('newest')
const currentPlatform = ref<PlatformMorphState>('all')

// Blue Polymorph 动画系统
const { morphClassName, morphCSSVars } = useBluePolymorph(currentPlatform, {
  enabled: computed(() => settings.value.enableAnimations),
})

const posts = ref<PostListItem[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)

// 使用缓存感知的帖子列表加载
const { total, load: loadCachedPosts } = useCachedPostList<PostListItem>(
  async (params) => {
    const result = await postService.listPosts(
      params as Parameters<typeof postService.listPosts>[0]
    )
    return { data: result.items, total: result.total }
  },
  { revalidate: false } // 不自动后台更新，减少重复请求
)
const page = ref(1)

// 移动端优化：减少首屏加载数量
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
const pageSize = isMobile ? 8 : 24 // 移动端首屏 8 张，桌面端 24 张

// JS Masonry 布局 - 避免 CSS column-count 的 CLS 问题
const masonryContainerRef = ref<HTMLElement | null>(null)
const columnRefs = ref<HTMLElement[]>([])
const cachedColumnHeights = ref<number[]>([])

const {
  columns,
  columnCount,
  distributePosts,
  distributePostsRoundRobin,
  redistribute,
  getColumnWidth,
  initColumns,
} = useMasonryColumns({
  initialColumnCount: calculateColumnCount(),
})

const hasMore = computed(() => posts.value.length < total.value)

// 骨架屏列数和每列数量 - 与真实 masonry 布局保持一致，避免 CLS
const skeletonColumnCount = computed(() => columnCount.value)
const skeletonPerColumn = computed(() => Math.ceil(12 / skeletonColumnCount.value))

const sentinelRef = ref<HTMLElement | null>(null)

const setSentinelRef = (el: Element | null) => {
  sentinelRef.value = el as HTMLElement | null
}

// 移动端优化：减少初始渲染数量（首屏渲染 6 张，平衡性能和 CLS）
const initialRenderCount = isMobile ? 6 : 24
const {
  visibleItems: visiblePosts,
  hasMoreToRender,
  revealNextBatch,
} = useProgressiveRender(posts, { initialCount: initialRenderCount, batchSize: 12 })

const lastVisibleCount = ref(0)

const hasMoreForUi = computed(() => hasMore.value || hasMoreToRender.value)

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

const sortOptions = [
  { value: 'newest' as const },
  { value: 'popular' as const },
  { value: 'trending' as const },
]

// 使用非废弃图标：Globe 替代 Twitter，Video 替代 Youtube
const platformOptions = [
  { value: 'all' as const, label: t('explore.allPlatforms'), icon: Globe },
  { value: 'youtube' as const, label: 'YouTube', icon: Video },
  { value: 'tiktok' as const, label: 'TikTok', icon: Music2 },
  { value: 'twitter' as const, label: 'X', icon: Globe },
  { value: 'instagram' as const, label: 'Instagram', icon: Instagram },
]

function goToPost(postId: string, thumbnailSrc: string | null) {
  storePostNavigationContext(posts.value, postId, 'explore')
  if (thumbnailSrc) {
    sessionStorage.setItem(`post-thumbnail-${postId}`, thumbnailSrc)
  }
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

async function fetchPosts(reset = true) {
  const hadData = posts.value.length > 0

  if (reset) {
    if (isLoading.value) return false
    isLoading.value = true
    page.value = 1
    if (!hadData) {
      posts.value = []
    }
  } else {
    if (isLoadingMore.value) return false
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

  const { sort_by, sort_order } = getSortParams(currentSort.value)
  const params = {
    page: page.value,
    page_size: pageSize,
    sort_by,
    sort_order,
    thumbnail_quality: getThumbnailQuality(),
  }

  const platform = currentPlatform.value !== 'all' ? currentPlatform.value : undefined
  const requestParams = { ...params, ...(platform ? { platform } : {}) }

  try {
    // 使用缓存感知加载，避免重复请求
    const result = await loadCachedPosts(requestParams)
    const items = result.data as PostListItem[]

    if (reset) {
      posts.value = items
    } else {
      posts.value.push(...items)
    }

    // 更新 masonry 布局（仅渲染可见部分）
    await nextTick()
    applyVisiblePosts(reset)

    return true
  } catch (err) {
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
    isLoading.value = false
    isLoadingMore.value = false
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

  const nextPage = page.value + 1
  page.value = nextPage
  const ok = await fetchPosts(false)
  if (!ok) {
    page.value = nextPage - 1
    return false
  }

  return true
}

// 增加预加载距离，让内容提前加载，避免用户等待
useInfiniteScroll(sentinelRef, loadMore, {
  rootMargin: '800px', // 提前 800px 开始加载下一批
  enabled: () => hasMoreForUi.value && !isLoading.value && !isLoadingMore.value,
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
    // 追加模式：使用缓存高度避免同步读取导致强制重排
    const realHeights =
      cachedColumnHeights.value.length === columnCount.value ? cachedColumnHeights.value : undefined
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
let lastContainerWidth = 0

/**
 * 处理容器 resize - 使用 ResizeObserver 替代 window resize
 */
const handleContainerResize = throttleRAF((width: number) => {
  // 忽略微小变化，避免频繁重排
  if (Math.abs(width - lastContainerWidth) < 50) return
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
}

function attachResizeObserver(el: HTMLElement) {
  detachResizeObserver()

  lastContainerWidth = el.clientWidth
  resizeObserver = createResizeObserver((entries) => {
    const entry = entries[0]
    if (entry) {
      handleContainerResize(entry.contentRect.width)
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
  requestAnimationFrame(() => {
    cachedColumnHeights.value = columnRefs.value.map((el) => el?.offsetHeight || 0)
  })
}

/**
 * 处理卡片高度变化（图片加载完成等）
 */
const handleCardHeightChange = throttleRAF(() => {
  // 高度变化时不需要重新分发，因为 JS masonry 是固定列分配
  // 只有在需要重新平衡时才调用 redistribute
})

watch(currentSort, () => {
  fetchPosts()
})

watch(currentPlatform, (p) => {
  // Also drive the global background theme.
  setExploreFilter(p)
  fetchPosts()
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

  window.addEventListener('keydown', onGlobalKeydown)

  // ResizeObserver will be attached by watcher below.
})

watch(
  masonryContainerRef,
  (el) => {
    if (!el) {
      detachResizeObserver()
      return
    }
    attachResizeObserver(el)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  detachResizeObserver()
})
</script>

<style scoped>
.explore-page {
  position: relative;
  padding: var(--spacing-4) 0 var(--spacing-8);
  min-height: 100svh;
  min-height: 100dvh;
}

/* ========== MindMarket 风格背景 ========== */
.explore-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  /* Keep page blobs behind the global contextual 3D background */
  z-index: -2;
  overflow: hidden;
}

.explore-bg__blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.35;
}

.explore-bg__blob--green {
  width: 500px;
  height: 500px;
  top: -10%;
  left: -8%;
  background: radial-gradient(circle, rgba(var(--color-accent-rgb), 0.25) 0%, transparent 70%);
}

.explore-bg__blob--purple {
  width: 400px;
  height: 400px;
  top: 30%;
  right: -10%;
  background: radial-gradient(circle, rgba(var(--color-secondary-rgb), 0.15) 0%, transparent 70%);
}

.explore-bg__blob--teal {
  width: 450px;
  height: 450px;
  bottom: 5%;
  left: 20%;
  background: radial-gradient(circle, rgba(var(--color-accent-rgb), 0.15) 0%, transparent 70%);
}

/* 暗色模式调整 */
[data-theme='dark'] .explore-bg__blob {
  opacity: 0.2;
}

.page-header {
  margin-bottom: var(--spacing-3);
}

.page-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-3);
}

.page-title-row h1 {
  margin-bottom: 0;
  font-size: var(--text-xl);
}

@media (min-width: 768px) {
  .page-title-row h1 {
    font-size: var(--text-2xl);
  }
}

.page-title-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.page-title-badge {
  padding: var(--spacing-1) var(--spacing-3);
  background: rgba(var(--color-primary-rgb), 0.1);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-primary);
}

.page-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.search-trigger {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  background: var(--glass-bg-subtle);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
  cursor: pointer;
}

.search-trigger:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
  border-color: rgba(var(--color-primary-rgb), 0.3);
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
  padding: 2px 6px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
}

.filters {
  display: flex;
  gap: var(--spacing-2);
}

.filter-btn {
  position: relative;
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  border: 1px solid var(--glass-border);
  background: transparent;
  transition: all var(--transition-fast);
  overflow: hidden;
}

.filter-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--glass-bg-subtle);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.filter-btn:hover {
  color: var(--color-text-primary);
  border-color: rgba(var(--color-primary-rgb), 0.3);
}

.filter-btn:hover::before {
  opacity: 1;
}

.filter-btn.active {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-color: transparent;
  box-shadow: var(--shadow-md);
}

.filter-btn.active::before {
  display: none;
}

.filters-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.platform-filters {
  display: flex;
  gap: var(--spacing-1);
  flex-wrap: wrap;
}

.platform-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-lg);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: var(--glass-bg-subtle);
  border: 1px solid transparent;
  transition: all var(--transition-fast);
}

@media (min-width: 768px) {
  .platform-btn {
    padding: var(--spacing-2) var(--spacing-3);
    font-size: var(--text-sm);
  }
}

.platform-btn:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
  transform: translateY(-1px);
}

.platform-btn.active {
  background: rgba(var(--color-primary-rgb), 0.15);
  color: var(--color-primary);
  border-color: rgba(var(--color-primary-rgb), 0.3);
}

.platform-btn.active svg {
  color: var(--color-primary);
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
  width: 100%;
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
  width: 100%;
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
