<template>
  <div class="explore-page">
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
              <Search :size="18" />
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
            <component :is="platform.icon" :size="16" aria-hidden="true" />
            <span class="platform-label">{{ platform.label }}</span>
          </button>
        </div>
      </div>

      <StateIndicator v-if="error" variant="error" :description="error" @action="fetchPosts" />

      <template v-else>
        <div v-if="isLoading && posts.length === 0" class="posts-grid">
          <div v-for="i in 12" :key="i" class="post-card glass-card">
            <div class="post-image skeleton" style="aspect-ratio: 1" />
            <div class="post-content">
              <div class="skeleton" style="height: 20px; width: 80%" />
              <div class="skeleton" style="height: 14px; width: 50%; margin-top: 8px" />
            </div>
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
import { Search, Globe, Music2, Video } from 'lucide-vue-next'
import { postService, type PostListItem, ApiError } from '@/api'
import { postCache } from '@/utils/cache'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useProgressiveRender } from '@/composables/useProgressiveRender'
import { useMasonryColumns } from '@/composables/useMasonryColumns'
import { throttleRAF } from '@/utils/performance'
import { createResizeObserver } from '@/utils/modernAPIs'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import PostCard from '@/components/business/PostCard.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'

const router = useRouter()

const { t } = useI18n()

const currentSort = ref<'newest' | 'popular' | 'trending'>('newest')
const currentPlatform = ref<'all' | 'youtube' | 'tiktok' | 'twitter'>('all')

const posts = ref<PostListItem[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const total = ref(0)

// 移动端优化：减少首屏加载数量
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
const pageSize = isMobile ? 8 : 24 // 移动端首屏 8 张，桌面端 24 张

// JS Masonry 布局 - 避免 CSS column-count 的 CLS 问题
const masonryContainerRef = ref<HTMLElement | null>(null)
const columnRefs = ref<HTMLElement[]>([])
const columnCount = ref(4)

const {
  columns,
  distributePosts,
  distributePostsRoundRobin,
  redistribute,
  getColumnWidth,
  initColumns,
} = useMasonryColumns({
  initialColumnCount: columnCount.value,
})

const hasMore = computed(() => posts.value.length < total.value)

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
]

function goToPost(postId: string, thumbnailSrc: string | null) {
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

  const { sort_by, sort_order } = getSortParams(currentSort.value)
  const params = {
    page: page.value,
    page_size: pageSize,
    sort_by,
    sort_order,
  }

  const platform = currentPlatform.value !== 'all' ? currentPlatform.value : undefined
  const requestParams = { ...params, ...(platform ? { platform } : {}) }

  if (reset) {
    const cached = await postCache.getList(requestParams)
    if (cached && !hadData) {
      posts.value = cached.data as PostListItem[]
      total.value = cached.total
      // 分发到 masonry 列
      await nextTick()
      updateMasonryLayout(posts.value, reset)
    }
  }

  try {
    const res = await postService.listPosts(requestParams)

    if (reset) {
      posts.value = res.items
    } else {
      posts.value.push(...res.items)
    }
    total.value = res.total

    if (reset) {
      await postCache.setList(requestParams, res.items, res.total)
    }

    // 更新 masonry 布局
    await nextTick()
    updateMasonryLayout(reset ? posts.value : res.items, reset)

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
 * 计算响应式列数
 * 移动端始终保持双列，避免内容被过分压缩
 */
function calculateColumnCount(): number {
  if (typeof window === 'undefined') return 4
  const width = window.innerWidth
  if (width >= 1920) return 6
  if (width >= 1600) return 5
  if (width >= 1200) return 4
  if (width >= 900) return 3
  if (width >= 600) return 3
  return 2 // 移动端始终双列
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
      distributePostsRoundRobin(posts.value, 0)
    } else {
      redistribute(posts.value, colWidth)
    }
  } else {
    // 追加模式：获取真实 DOM 高度校准
    const realHeights = columnRefs.value.map((el) => el?.offsetHeight || 0)
    if (isMobile) {
      // 移动端追加也用轮询
      const startIndex = columns.value.reduce((sum, col) => sum + col.length, 0)
      distributePostsRoundRobin(items, startIndex)
    } else {
      distributePosts(items, colWidth, true, realHeights)
    }
  }
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
    redistribute(posts.value, colWidth)
  }
})

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

watch(currentPlatform, () => {
  fetchPosts()
})

onMounted(() => {
  // 初始化列数
  columnCount.value = calculateColumnCount()
  initColumns()

  if (posts.value.length === 0) {
    fetchPosts()
  } else {
    // 已有数据时重新分发到列
    nextTick(() => {
      updateMasonryLayout(posts.value, true)
    })
  }

  window.addEventListener('keydown', onGlobalKeydown)

  // 使用 ResizeObserver 监听容器大小变化，比 window resize 更精确高效
  if (masonryContainerRef.value) {
    lastContainerWidth = masonryContainerRef.value.clientWidth
    resizeObserver = createResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        handleContainerResize(entry.contentRect.width)
      }
    })
    resizeObserver?.observe(masonryContainerRef.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<style scoped>
.explore-page {
  padding: var(--spacing-8) 0;
}

.page-header {
  margin-bottom: var(--spacing-6);
}

.page-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.page-title-row h1 {
  margin-bottom: 0;
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
  background: var(--gradient-primary);
  color: var(--color-white);
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
}

.filter-btn.active::before {
  display: none;
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--spacing-4);
}

.filters-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-6);
}

.platform-filters {
  display: flex;
  gap: var(--spacing-2);
}

.platform-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: var(--glass-bg-subtle);
  border: 1px solid transparent;
  transition: all var(--transition-fast);
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
  --masonry-gap: var(--spacing-4);

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
@media (max-width: 899px) {
  .posts-masonry-js {
    --masonry-gap: var(--spacing-3);
  }
}

@media (max-width: 599px) {
  .posts-masonry-js {
    --masonry-gap: var(--spacing-2);
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
