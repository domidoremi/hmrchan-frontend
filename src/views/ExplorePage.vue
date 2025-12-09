<template>
  <MainLayout>
    <div class="explore-page">
      <!-- 页面头部 -->
      <header class="explore-header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">
              <Compass :size="28" class="title-icon" />
              {{ $t('nav.explore') }}
            </h1>
            <div v-if="pagination.total" class="stats-badge">
              <span class="stats-count">{{ formatNumber(pagination.total) }}</span>
              <span class="stats-label">{{ $t('common.posts', '条内容') }}</span>
            </div>
          </div>

          <div class="header-right">
            <!-- 搜索框 (桌面端) -->
            <SearchInput
              v-if="!isMobile"
              v-model="searchQuery"
              :placeholder="$t('search.placeholder', '搜索内容...')"
              :loading="loading && !!searchQuery"
              @search="handleSearch"
              @clear="handleSearchClear"
            />

            <!-- 视图切换 -->
            <ViewModeToggle
              v-if="!isMobile"
              v-model="viewMode"
              :available-modes="['grid', 'masonry']"
            />
          </div>
        </div>

        <!-- 移动端搜索框 -->
        <div v-if="isMobile" class="mobile-search">
          <SearchInput
            v-model="searchQuery"
            :placeholder="$t('search.placeholder', '搜索内容...')"
            :loading="loading && !!searchQuery"
            :show-shortcut="false"
            @search="handleSearch"
            @clear="handleSearchClear"
          />
        </div>
      </header>

      <!-- 筛选栏 -->
      <FilterBar
        :filters="filters"
        :sticky="true"
        @update="handleFilterUpdate"
        @open-sheet="showFilterSheet = true"
      />

      <!-- 初始加载状态 -->
      <div v-if="loading && localPosts.length === 0" class="loading-container">
        <div class="skeleton-grid">
          <div v-for="i in 8" :key="i" class="skeleton-card">
            <div class="skeleton-media"></div>
            <div class="skeleton-content">
              <div class="skeleton-title"></div>
              <div class="skeleton-meta"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 帖子网格 -->
      <template v-else-if="localPosts.length > 0">
        <p v-if="lastListFromFallback" class="offline-hint">
          <WifiOff :size="16" />
          {{ $t('offline.usingCache') }}
        </p>

        <div class="posts-grid-wrapper">
          <div
            ref="postsGrid"
            class="posts-grid"
            :class="{ 'view-masonry': viewMode === 'masonry' }"
          >
            <PostCard
              v-for="(post, index) in localPosts"
              :key="post.id"
              :post="post"
              :index="index"
              :show-actions="false"
            />
          </div>

          <!-- 加载更多指示器 -->
          <div v-if="isLoadingMore || scrollLoading" class="loading-more">
            <Loader2 :size="24" class="spinner" />
            <span>{{ $t('common.loading') }}</span>
          </div>

          <!-- 加载进度 -->
          <div v-if="!pageFullyRendered && localPosts.length > 0" class="load-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${(localPosts.length / allPagePosts.length) * 100}%` }"
              ></div>
            </div>
            <span class="progress-text">{{ localPosts.length }} / {{ allPagePosts.length }}</span>
          </div>
        </div>

        <!-- 分页 -->
        <Pagination
          v-if="pageFullyRendered && totalPages > 1"
          :current-page="currentPage"
          :total-pages="totalPages"
          @change="handlePageChange"
        />
      </template>

      <!-- 错误状态 -->
      <div v-else-if="error" class="state-card error-state">
        <div class="state-icon error">
          <AlertCircle :size="48" />
        </div>
        <h3 class="state-title">{{ $t('common.error') }}</h3>
        <p class="state-description">{{ error }}</p>
        <button class="state-action" @click="resetFilters">
          <RotateCcw :size="18" />
          {{ $t('common.retry') }}
        </button>
      </div>

      <!-- 空状态 -->
      <div v-else class="state-card empty-state">
        <div class="state-icon">
          <SearchX :size="48" />
        </div>
        <h3 class="state-title">{{ $t('search.noResults') }}</h3>
        <p class="state-description">{{ $t('search.tryDifferent') }}</p>
        <button class="state-action" @click="resetFilters">
          <RotateCcw :size="18" />
          {{ $t('common.reset') }}
        </button>
      </div>
    </div>

    <!-- 移动端筛选底部抽屉 -->
    <FilterBottomSheet
      v-model:is-open="showFilterSheet"
      :filters="filters"
      @apply="handleFilterUpdate"
      @reset="resetFilters"
    />
  </MainLayout>
</template>

<script lang="ts">
export default {
  name: 'ExplorePage',
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, onActivated, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Compass, SearchX, RotateCcw, AlertCircle, WifiOff, Loader2 } from 'lucide-vue-next'

import MainLayout from '@/components/layout/MainLayout.vue'
import FilterBar from '@/components/business/FilterBar.vue'
import FilterBottomSheet from '@/components/business/FilterBottomSheet.vue'
import PostCard from '@/components/business/PostCard.vue'
import SearchInput from '@/components/ui/input/SearchInput.vue'
import { ViewModeToggle, type ViewMode } from '@/components/ui/toggle'
import { Pagination } from '@/components/ui/pagination'

import { usePostsStore } from '@/stores'
import { useWaterfallLayout, useInfiniteScroll, useResponsive } from '@/composables'
import type { PostListParams, Post } from '@/types'
import { logger } from '@/utils/logger'

const route = useRoute()
const router = useRouter()
const postsStore = usePostsStore()
const { isMobile } = useResponsive()

const { loading, error, filters, pagination, lastListFromFallback } = storeToRefs(postsStore)

// ============================================
// 配置常量
// ============================================
const POSTS_PER_PAGE = 20
const RENDER_BATCH_SIZE = 5

// ============================================
// 本地状态
// ============================================
const allPagePosts = ref<Post[]>([])
const renderedCount = ref(0)
const isLoadingMore = ref(false)
const isNavigating = ref(false)
const searchQuery = ref('')
const viewMode = ref<ViewMode>('masonry')
const showFilterSheet = ref(false)

// 实际显示的帖子
const localPosts = computed(() => allPagePosts.value.slice(0, renderedCount.value))

// 本地分页状态（避免被其他页面污染）
const localPagination = ref({ page: 1, pages: 0, total: 0 })

// 分页计算
const currentPage = computed(() => localPagination.value.page)
const totalPages = computed(() => localPagination.value.pages)

// 当前页是否完全渲染
const pageFullyRendered = computed(
  () => allPagePosts.value.length > 0 && renderedCount.value >= allPagePosts.value.length,
)

// 是否可以继续渲染
const canRenderMore = computed(
  () => !pageFullyRendered.value && allPagePosts.value.length > 0 && !isLoadingMore.value,
)

// 帖子网格容器
const postsGrid = ref<HTMLElement | null>(null)

// 瀑布流布局
const { updateLayout, smoothUpdateLayout } = useWaterfallLayout(postsGrid, {
  columnGap: 16,
  rowGap: 16,
  breakpoints: {
    1400: 4,
    1100: 3,
    769: 2,
    0: 2,
  },
})

// ============================================
// 无限滚动
// ============================================
const { isLoading: scrollLoading } = useInfiniteScroll({
  onLoadMore: renderMorePosts,
  hasMore: () => canRenderMore.value,
  threshold: 600, // 提前加载，避免用户看到空白
  delay: 100, // 减少延迟，响应更快
  enabled: computed(() => canRenderMore.value),
})

/**
 * 渲染更多帖子
 */
async function renderMorePosts() {
  if (!canRenderMore.value) return

  isLoadingMore.value = true

  const newCount = Math.min(renderedCount.value + RENDER_BATCH_SIZE, allPagePosts.value.length)
  renderedCount.value = newCount

  logger.debug('渐进式渲染', {
    category: 'ExplorePage',
    rendered: newCount,
    total: allPagePosts.value.length,
  })

  await nextTick()
  smoothUpdateLayout()

  isLoadingMore.value = false
}

/**
 * 加载当前页帖子
 */
async function loadPagePosts() {
  allPagePosts.value = []
  renderedCount.value = 0
  isLoadingMore.value = false

  try {
    const result = await postsStore.fetchPosts({
      page: localPagination.value.page,
      page_size: POSTS_PER_PAGE,
    })

    if (result && result.items && result.items.length > 0) {
      allPagePosts.value = result.items
      renderedCount.value = Math.min(RENDER_BATCH_SIZE, result.items.length)

      // 更新本地分页状态
      localPagination.value = {
        page: result.page || 1,
        pages: result.pages || Math.ceil((result.total || 0) / POSTS_PER_PAGE),
        total: result.total || 0,
      }

      logger.debug('页面数据加载完成', {
        category: 'ExplorePage',
        total: result.items.length,
        pages: localPagination.value.pages,
        initialRender: renderedCount.value,
      })
    } else {
      // 没有数据时重置分页
      localPagination.value = { page: 1, pages: 0, total: 0 }
    }

    await nextTick()
    updateLayout()
  } catch (err) {
    logger.error('加载失败', { category: 'ExplorePage', error: err })
  }
}

/**
 * 切换页面
 */
async function handlePageChange(page: number) {
  isNavigating.value = true

  // 更新本地分页状态
  localPagination.value.page = page

  const query: Record<string, string> = {}
  if (filters.value.q) query.q = filters.value.q
  if (filters.value.platform) query.platform = filters.value.platform
  if (page > 1) query.page = String(page)
  router.replace({ query })

  window.scrollTo({ top: 0, behavior: 'smooth' })

  await loadPagePosts()
  isNavigating.value = false
}

/**
 * 更新筛选条件
 */
async function handleFilterUpdate(newFilters: Partial<PostListParams>) {
  isNavigating.value = true

  postsStore.updateFilters({ ...newFilters })
  // 筛选条件变化时重置到第一页
  localPagination.value.page = 1

  const query: Record<string, string> = {}
  if (newFilters.q || filters.value.q) query.q = (newFilters.q || filters.value.q) as string
  if (newFilters.platform || filters.value.platform) {
    query.platform = (newFilters.platform || filters.value.platform) as string
  }
  router.replace({ query })

  await loadPagePosts()
  isNavigating.value = false
}

/**
 * 搜索处理
 */
async function handleSearch(query: string) {
  postsStore.updateFilters({ q: query || undefined })
  // 搜索时重置到第一页
  localPagination.value.page = 1

  const urlQuery: Record<string, string> = {}
  if (query) urlQuery.q = query
  if (filters.value.platform) urlQuery.platform = filters.value.platform
  router.replace({ query: urlQuery })

  await loadPagePosts()
}

function handleSearchClear() {
  searchQuery.value = ''
  handleSearch('')
}

/**
 * 重置筛选
 */
async function resetFilters() {
  isNavigating.value = true
  searchQuery.value = ''

  postsStore.resetFilters()
  // 重置本地分页状态
  localPagination.value = { page: 1, pages: 0, total: 0 }

  router.replace({ query: {} })
  await loadPagePosts()

  isNavigating.value = false
}

/**
 * 格式化数字
 */
function formatNumber(num: number): string {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}万`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toLocaleString()
}

// ============================================
// 生命周期
// ============================================
onMounted(async () => {
  // 从 URL 初始化
  const query = route.query

  if (query.q) {
    searchQuery.value = query.q as string
    postsStore.updateFilters({ q: query.q as string })
  }
  if (query.platform) {
    postsStore.updateFilters({ platform: query.platform as string })
  }
  if (query.page) {
    localPagination.value.page = parseInt(query.page as string) || 1
  }

  await loadPagePosts()
})

onBeforeUnmount(() => {
  allPagePosts.value = []
  renderedCount.value = 0
  postsStore.resetFilters()
  logger.debug('页面卸载', { category: 'ExplorePage' })
})

/**
 * 页面激活时重新计算布局
 * 解决 KeepAlive 缓存导致的瀑布流布局错乱问题
 */
onActivated(async () => {
  if (postsGrid.value && localPosts.value.length > 0) {
    // 等待 DOM 完全就绪
    await nextTick()
    // 再等待一帧确保渲染完成
    requestAnimationFrame(() => {
      updateLayout()
      logger.debug('页面激活，重新计算布局', { category: 'ExplorePage' })
    })
  }
})

// 监听浏览器前进/后退
watch(
  () => route.query,
  async (newQuery, oldQuery) => {
    if (isNavigating.value) return
    if (JSON.stringify(newQuery) === JSON.stringify(oldQuery)) return

    searchQuery.value = (newQuery.q as string) || ''
    postsStore.updateFilters({
      q: (newQuery.q as string) || undefined,
      platform: (newQuery.platform as string) || undefined,
    })

    // 更新本地分页状态
    localPagination.value.page = newQuery.page ? parseInt(newQuery.page as string) : 1

    await loadPagePosts()
  },
)

// 监听帖子数量变化更新布局
watch(
  () => localPosts.value.length,
  async () => {
    await nextTick()
    updateLayout()
  },
)

// 监听视图模式变化
watch(viewMode, async () => {
  await nextTick()
  updateLayout()
})
</script>

<style scoped>
.explore-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  min-height: calc(100vh - var(--navbar-height) - var(--footer-min-height));
}

/* ========================================
   页面头部
   ======================================== */
.explore-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.page-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin: 0;
}

.title-icon {
  color: var(--color-primary);
}

.stats-badge {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding: 6px 12px;
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-full);
}

.stats-count {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-primary);
}

.stats-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.mobile-search {
  width: 100%;
}

/* ========================================
   骨架屏加载
   ======================================== */
.loading-container {
  padding: var(--spacing-xl) 0;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.skeleton-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.skeleton-media {
  width: 100%;
  height: 200px;
  background: linear-gradient(
    90deg,
    var(--glass-bg-light) 0%,
    rgba(139, 92, 246, 0.08) 50%,
    var(--glass-bg-light) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

.skeleton-content {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.skeleton-title {
  height: 20px;
  width: 80%;
  background: var(--glass-bg-light);
  border-radius: var(--radius-sm);
  animation: shimmer 1.5s ease-in-out infinite;
}

.skeleton-meta {
  height: 14px;
  width: 50%;
  background: var(--glass-bg-light);
  border-radius: var(--radius-sm);
  animation: shimmer 1.5s ease-in-out infinite;
  animation-delay: 0.1s;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* ========================================
   帖子网格
   ======================================== */
.posts-grid-wrapper {
  position: relative;
}

.posts-grid {
  width: 100%;
  position: relative;
  min-height: 200px;
  transition: opacity 0.3s ease;
}

.posts-grid.view-masonry {
  /* 瀑布流由 useWaterfallLayout 控制 */
  contain: layout style;
}

.offline-hint {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: rgba(59, 130, 246, 0.08);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.offline-hint svg {
  color: var(--color-info);
}

/* 加载更多 */
.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.spinner {
  animation: spin 1s linear infinite;
  color: var(--color-primary);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 加载进度 */
.load-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
}

.progress-bar {
  width: 200px;
  height: 4px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

/* ========================================
   状态卡片
   ======================================== */
.state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-3xl);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  text-align: center;
}

.state-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: var(--radius-full);
  background: var(--glass-bg-light);
  color: var(--color-text-tertiary);
}

.state-icon.error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
}

.state-title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.state-description {
  color: var(--color-text-secondary);
  margin: 0;
}

.state-action {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-lg);
  margin-top: var(--spacing-sm);
  border: none;
  border-radius: var(--radius-lg);
  background: var(--color-primary);
  color: white;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.state-action:hover {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

/* ========================================
   响应式
   ======================================== */
@media (max-width: 768px) {
  .explore-page {
    gap: var(--spacing-md);
  }

  .page-title {
    font-size: var(--text-2xl);
  }

  .stats-badge {
    padding: 4px 10px;
  }

  .stats-count {
    font-size: var(--text-base);
  }

  .skeleton-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }

  .skeleton-media {
    height: 150px;
  }

  .state-card {
    padding: var(--spacing-2xl);
  }

  .state-icon {
    width: 64px;
    height: 64px;
  }

  .state-icon svg {
    width: 32px;
    height: 32px;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: var(--text-xl);
  }

  .title-icon {
    width: 22px;
    height: 22px;
  }

  .skeleton-grid {
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-sm);
  }
}
</style>

<!-- 瀑布流布局样式 -->
<style>
.explore-page .posts-grid .post-card {
  box-sizing: border-box;
  transition:
    opacity 0.3s ease,
    transform 0.3s ease,
    left 0.3s ease,
    top 0.3s ease;
}
</style>
