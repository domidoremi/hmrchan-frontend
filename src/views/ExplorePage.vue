<template>
  <MainLayout>
    <div class="explore-page">
      <h1 class="page-title">{{ $t('nav.explore') }}</h1>

      <!-- Filter Bar -->
      <FilterBar :filters="filters" @update="handleFilterUpdate" />

      <!-- Initial Loading State -->
      <div v-if="loading && posts.length === 0" class="loading-container">
        <LoadingSpinner size="lg" :text="$t('common.loading')" />
      </div>

      <!-- Posts Grid -->
      <template v-else-if="posts.length > 0">
        <p v-if="lastListFromFallback" class="offline-hint">
          {{ $t('offline.usingCache') }}
        </p>

        <div class="posts-grid-wrapper">
          <!-- Loading Overlay for page changes -->
          <Transition name="fade">
            <div v-if="loading" class="loading-overlay">
              <LoadingSpinner size="md" />
            </div>
          </Transition>

          <div ref="postsGrid" class="posts-grid" :class="{ 'is-loading': loading }">
            <PostCard v-for="(post, index) in posts" :key="post.id" :post="post" :index="index" :show-actions="false" />
          </div>
        </div>

        <!-- Pagination -->
        <Pagination :current-page="currentPage" :total-pages="totalPages" @change="handlePageChange" />
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
import { useWaterfallLayout } from '@/composables'
import type { PostListParams } from '@/types'
import { logger } from '@/utils/logger'

const route = useRoute()
const router = useRouter()
const postsStore = usePostsStore()

const { posts, loading, error, filters, pagination, lastListFromFallback } = storeToRefs(postsStore)

// 分页计算属性 - 确保正确访问分页数据
const currentPage = computed(() => pagination.value.page)
const totalPages = computed(() => pagination.value.pages)

// 帖子网格容器
const postsGrid = ref<HTMLElement | null>(null)

// 瀑布流布局
const { updateLayout } = useWaterfallLayout(postsGrid, {
  columnGap: 16,
  rowGap: 16,
  breakpoints: {
    1400: 4,
    1100: 3,
    769: 2,
    0: 2,
  },
})

onMounted(async () => {
  // 重置状态
  postsStore.resetFilters()

  // 从URL查询参数初始化筛选
  const query = route.query
  if (query.q) {
    postsStore.updateFilters({ q: query.q as string })
  }
  if (query.platform) {
    postsStore.updateFilters({ platform: query.platform as string })
  }
  if (query.page) {
    postsStore.updateFilters({ page: parseInt(query.page as string) || 1 })
  }

  await postsStore.fetchPosts()
  await nextTick()
  updateLayout()
})

onBeforeUnmount(() => {
  postsStore.resetFilters()
  postsStore.posts = []
  logger.debug('页面卸载，已重置筛选条件和posts', { category: 'ExplorePage' })
})

watch(
  () => route.query,
  async (newQuery, oldQuery) => {
    // 避免无意义的重复请求
    if (JSON.stringify(newQuery) === JSON.stringify(oldQuery)) return

    // 同步URL参数到筛选条件
    const updates: Partial<PostListParams> = {
      q: (newQuery.q as string) || undefined,
      platform: (newQuery.platform as string) || undefined,
      page: newQuery.page ? parseInt(newQuery.page as string) : 1,
    }
    postsStore.updateFilters(updates)

    await postsStore.fetchPosts()
    await nextTick()
    updateLayout()
  },
)

// 监听 posts 变化更新布局
watch(
  () => posts.value.length,
  async () => {
    await nextTick()
    updateLayout()
  },
)

const handlePageChange = async (page: number) => {
  postsStore.updateFilters({ page })
  await postsStore.fetchPosts()

  // 更新URL
  const query: Record<string, string> = {}
  if (filters.value.q) query.q = filters.value.q
  if (filters.value.platform) query.platform = filters.value.platform
  query.page = String(page)
  router.push({ query })

  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleFilterUpdate = async (newFilters: Partial<PostListParams>) => {
  postsStore.updateFilters({ ...newFilters, page: 1 })
  await postsStore.fetchPosts()

  // 更新URL查询参数
  const query: Record<string, string> = {}
  if (newFilters.q) query.q = newFilters.q
  if (newFilters.platform) query.platform = newFilters.platform
  router.push({ query })
}

const resetFilters = async () => {
  postsStore.resetFilters()
  router.push({ query: {} })
  await postsStore.fetchPosts()
  await nextTick()
  updateLayout()
}
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
