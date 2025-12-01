<template>
  <MainLayout>
    <div class="explore-page">
      <h1 class="page-title">{{ $t('nav.explore') }}</h1>

      <!-- Filter Bar -->
      <FilterBar :filters="filters" @update="handleFilterUpdate" />

      <!-- Initial Loading State -->
      <div v-if="loading && localPosts.length === 0" class="loading-container">
        <LoadingSpinner size="lg" :text="$t('common.loading')" />
      </div>

      <!-- Posts Grid -->
      <template v-else-if="localPosts.length > 0">
        <p v-if="lastListFromFallback" class="offline-hint">
          {{ $t('offline.usingCache') }}
        </p>

        <div class="posts-grid-wrapper">
          <div ref="postsGrid" class="posts-grid">
            <PostCard v-for="(post, index) in localPosts" :key="post.id" :post="post" :index="index"
              :show-actions="false" />
          </div>

          <!-- Loading More Indicator -->
          <div v-if="isLoadingMore || scrollLoading" class="loading-more">
            <LoadingSpinner size="sm" :text="$t('common.loading')" />
          </div>

          <!-- Load Progress -->
          <div v-if="!pageFullyRendered && localPosts.length > 0" class="load-progress">
            <span>{{ localPosts.length }} / {{ allPagePosts.length }}</span>
          </div>
        </div>

        <!-- Pagination - 只在当前页渲染完成且有多页时显示 -->
        <Pagination v-if="pageFullyRendered && totalPages > 1" :current-page="currentPage" :total-pages="totalPages"
          @change="handlePageChange" />
      </template>

      <!-- Error State -->
      <div v-else-if="error" class="error-state glass-card">
        <AlertCircle :size="64" />
        <h3>{{ $t('common.error') }}</h3>
        <p>{{ error }}</p>
        <GlassButton @click="resetFilters">
          <RotateCcw :size="18" />
          {{ $t('common.retry') }}
        </GlassButton>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state glass-card">
        <SearchX :size="64" />
        <h3>{{ $t('search.noResults') }}</h3>
        <p>{{ $t('search.tryDifferent') }}</p>
        <GlassButton @click="resetFilters">
          <RotateCcw :size="18" />
          {{ $t('common.reset') }}
        </GlassButton>
      </div>
    </div>
  </MainLayout>
</template>

<script lang="ts">
export default {
  name: 'ExplorePage',
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { SearchX, RotateCcw, AlertCircle } from 'lucide-vue-next'

import MainLayout from '@/components/layout/MainLayout.vue'
import FilterBar from '@/components/business/FilterBar.vue'
import PostCard from '@/components/business/PostCard.vue'
import GlassButton from '@/components/ui/button/Button.vue'
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner.vue'
import { Pagination } from '@/components/ui/pagination'

import { usePostsStore } from '@/stores'
import { useWaterfallLayout, useInfiniteScroll } from '@/composables'
import type { PostListParams, Post } from '@/types'
import { logger } from '@/utils/logger'

const route = useRoute()
const router = useRouter()
const postsStore = usePostsStore()

const { loading, error, filters, pagination, lastListFromFallback } = storeToRefs(postsStore)

// ============================================
// 配置常量
// ============================================
const POSTS_PER_PAGE = 20      // 每页总帖子数
const RENDER_BATCH_SIZE = 5    // 每次渲染的帖子数

// ============================================
// 本地状态
// ============================================
const allPagePosts = ref<Post[]>([])  // 当前页的所有帖子（从 API 获取）
const renderedCount = ref(0)          // 已渲染的帖子数量
const isLoadingMore = ref(false)      // 是否正在渲染更多

// 实际显示的帖子（渐进式渲染）
const localPosts = computed(() => allPagePosts.value.slice(0, renderedCount.value))

// 分页计算属性
const currentPage = computed(() => filters.value.page || 1)
const totalPages = computed(() => pagination.value.pages || 0)

// 当前页是否已完全渲染
const pageFullyRendered = computed(() =>
  allPagePosts.value.length > 0 && renderedCount.value >= allPagePosts.value.length
)

// 是否还能继续滚动加载更多渲染
const canRenderMore = computed(() =>
  !pageFullyRendered.value &&
  allPagePosts.value.length > 0 &&
  !isLoadingMore.value
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
// 无限滚动 - 用于渐进式渲染
// ============================================
const { isLoading: scrollLoading } = useInfiniteScroll({
  onLoadMore: renderMorePosts,
  hasMore: () => canRenderMore.value,
  threshold: 300,
  enabled: computed(() => canRenderMore.value),
})

/**
 * 渲染更多帖子（滚动触发）
 * 不发起新的 API 请求，只是从已加载的数据中渲染更多
 */
async function renderMorePosts() {
  if (!canRenderMore.value) return

  isLoadingMore.value = true

  // 增加渲染数量
  const newCount = Math.min(
    renderedCount.value + RENDER_BATCH_SIZE,
    allPagePosts.value.length
  )
  renderedCount.value = newCount

  logger.debug('渐进式渲染', {
    category: 'ExplorePage',
    rendered: newCount,
    total: allPagePosts.value.length
  })

  await nextTick()
  smoothUpdateLayout()

  isLoadingMore.value = false
}

/**
 * 加载当前页的所有帖子
 */
async function loadPagePosts() {
  // 重置状态
  allPagePosts.value = []
  renderedCount.value = 0
  isLoadingMore.value = false

  try {
    const result = await postsStore.fetchPosts({
      page: currentPage.value,
      page_size: POSTS_PER_PAGE,
    })

    if (result && result.items && result.items.length > 0) {
      // 保存所有帖子
      allPagePosts.value = result.items

      // 初始渲染第一批
      renderedCount.value = Math.min(RENDER_BATCH_SIZE, result.items.length)

      logger.debug('页面数据加载完成', {
        category: 'ExplorePage',
        total: result.items.length,
        initialRender: renderedCount.value,
        paginationPages: pagination.value.pages,
        paginationTotal: pagination.value.total,
      })
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
  postsStore.updateFilters({ page })

  // 更新 URL
  const query: Record<string, string> = {}
  if (filters.value.q) query.q = filters.value.q
  if (filters.value.platform) query.platform = filters.value.platform
  if (page > 1) query.page = String(page)
  router.replace({ query })

  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' })

  await loadPagePosts()
}

/**
 * 更新筛选条件
 */
async function handleFilterUpdate(newFilters: Partial<PostListParams>) {
  postsStore.updateFilters({ ...newFilters, page: 1 })

  const query: Record<string, string> = {}
  if (newFilters.q) query.q = newFilters.q
  if (newFilters.platform) query.platform = newFilters.platform
  router.replace({ query })

  await loadPagePosts()
}

/**
 * 重置筛选
 */
async function resetFilters() {
  postsStore.resetFilters()
  router.replace({ query: {} })
  await loadPagePosts()
}

// ============================================
// 生命周期
// ============================================
onMounted(async () => {
  postsStore.resetFilters()

  // 从 URL 初始化筛选条件
  const query = route.query
  const initialFilters: Partial<PostListParams> = {}

  if (query.q) initialFilters.q = query.q as string
  if (query.platform) initialFilters.platform = query.platform as string
  if (query.page) initialFilters.page = parseInt(query.page as string) || 1

  if (Object.keys(initialFilters).length > 0) {
    postsStore.updateFilters(initialFilters)
  }

  await loadPagePosts()
})

onBeforeUnmount(() => {
  allPagePosts.value = []
  renderedCount.value = 0
  postsStore.resetFilters()
  logger.debug('页面卸载', { category: 'ExplorePage' })
})

// 监听浏览器前进/后退
watch(
  () => route.query,
  async (newQuery, oldQuery) => {
    if (JSON.stringify(newQuery) === JSON.stringify(oldQuery)) return

    postsStore.updateFilters({
      q: (newQuery.q as string) || undefined,
      platform: (newQuery.platform as string) || undefined,
      page: newQuery.page ? parseInt(newQuery.page as string) : 1,
    })

    await loadPagePosts()
  },
)

// 监听 localPosts 变化更新布局
watch(
  () => localPosts.value.length,
  async () => {
    await nextTick()
    updateLayout()
  },
)
</script>

<style scoped>
.explore-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.page-title {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-lg);
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: var(--spacing-3xl);
}

.posts-grid-wrapper {
  position: relative;
}

.posts-grid {
  width: 100%;
  position: relative;
  min-height: 200px;
  transition: opacity 0.3s ease;
}

.posts-grid.is-loading {
  opacity: 0.5;
  pointer-events: none;
}

.loading-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  background: var(--glass-bg);
  padding: var(--spacing-lg);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(8px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.empty-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-3xl);
  text-align: center;
}

.empty-state h3,
.error-state h3 {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.empty-state p,
.error-state p {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
}

.error-state {
  border-color: var(--color-error);
}

.error-state svg {
  color: var(--color-error);
}

.offline-hint {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: rgba(59, 130, 246, 0.08);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.loading-more {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-xl);
  margin-top: var(--spacing-lg);
}

.load-progress {
  text-align: center;
  padding: var(--spacing-md);
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

/* 响应式优化 */
@media (min-width: 780px) and (max-width: 900px) {
  .explore-page {
    gap: var(--spacing-lg);
  }

  .page-title {
    font-size: var(--text-3xl);
    margin-bottom: var(--spacing-lg);
  }
}

@media (max-width: 768px) {
  .page-title {
    font-size: var(--text-2xl);
    margin-bottom: var(--spacing-md);
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: var(--text-xl);
  }
}
</style>

<!-- 瀑布流布局样式 -->
<style>
.explore-page .posts-grid .post-card {
  box-sizing: border-box;
  transition: opacity 0.3s ease, transform 0.3s ease, left 0.3s ease, top 0.3s ease;
}
</style>
