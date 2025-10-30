<template>
  <MainLayout>
    <div class="explore-page">
      <h1 class="page-title">{{ $t('nav.explore') }}</h1>

      <!-- Filter Bar -->
      <FilterBar :filters="filters" @update="handleFilterUpdate" />

      <!-- Loading State -->
      <LoadingSpinner v-if="loading" size="lg" :text="$t('common.loading')" />

      <!-- Posts Grid -->
      <div v-else-if="posts.length > 0">
        <div ref="postsGrid" class="posts-grid">
          <PostCard v-for="post in posts" :key="post.id" :post="post" />
        </div>

        <!-- Pagination -->
        <Pagination
          :current-page="pagination.page"
          :total-pages="pagination.total_pages"
          @change="handlePageChange"
        />
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
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { SearchX, RotateCcw } from 'lucide-vue-next'

import MainLayout from '@/components/layout/MainLayout.vue'
import FilterBar from '@/components/features/FilterBar.vue'
import PostCard from '@/components/features/PostCard.vue'
import Pagination from '@/components/features/Pagination.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import GlassButton from '@/components/ui/GlassButton.vue'

import { usePostsStore } from '@/stores/posts'
import type { Post } from '@/types'
import { postsApi } from '@/api/services'
import { useMasonry } from '@/composables/useMasonry'

const route = useRoute()
const router = useRouter()
const postsStore = usePostsStore()

const { posts, loading, filters, pagination } = storeToRefs(postsStore)

const postsGrid = ref<HTMLElement | null>(null)

// Masonry瀑布流 - 使用响应式gutter（函数形式）
const getGutter = () => {
  const width = window.innerWidth
  console.log('[ExplorePage] Calculating gutter for width:', width)
  if (width <= 480) return 12  // 小屏：12px
  if (width <= 768) return 16  // 移动端：16px
  return 16  // 桌面端：16px
}

const { reloadItems, destroy, initMasonry } = useMasonry(postsGrid, {
  itemSelector: 'a.post-card',
  columnWidth: 'a.post-card',  // 使用第一个卡片的CSS宽度
  gutter: getGutter,
  percentPosition: false,
  horizontalOrder: false,
  fitWidth: false
})

// 监听窗口大小变化，重新初始化Masonry
let resizeTimer: ReturnType<typeof setTimeout> | null = null
const handleResize = () => {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(async () => {
    console.log('[ExplorePage] Window resized, reinitializing Masonry...')
    destroy()
    await nextTick()
    setTimeout(initMasonry, 300)
  }, 300)
}

// 监听posts变化，重新布局Masonry
watch(posts, async () => {
  await nextTick()
  setTimeout(() => {
    console.log('[ExplorePage] Posts changed, reloading Masonry...')
    reloadItems()
  }, 300)
}, { deep: true })

onMounted(() => {
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
  
  // 重置筛选条件
  postsStore.resetFilters()

  // 从URL查询参数初始化筛选
  const query = route.query
  if (query.q) filters.value.q = query.q as string
  if (query.platform) filters.value.platform = query.platform as string

  loadPosts()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (resizeTimer) clearTimeout(resizeTimer)
})

watch(
  () => route.query,
  () => {
    if (route.query.q) filters.value.q = route.query.q as string
    loadPosts()
  },
)

const loadPosts = async () => {
  await postsStore.fetchPosts()
}

const handleFilterUpdate = async (newFilters: any) => {
  postsStore.updateFilters(newFilters)
  await loadPosts()

  // 更新URL查询参数
  const query: Record<string, string> = {}
  if (newFilters.q) query.q = newFilters.q
  if (newFilters.platform) query.platform = newFilters.platform
  router.push({ query })
}

const handlePageChange = async (page: number) => {
  postsStore.updateFilters({ page })
  await loadPosts()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const resetFilters = () => {
  postsStore.resetFilters()
  router.push({ query: {} })
  loadPosts()
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

.posts-grid {
  /* Masonry布局容器 */
  width: 100%;
  max-width: 100%;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-3xl);
  text-align: center;
}

.empty-state h3 {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.empty-state p {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
}

/* Masonry布局，不需要这些样式 */

/* 平板端优化 (780px-900px) - 2列布局 */
@media (min-width: 780px) and (max-width: 900px) {
  .explore-page {
    gap: var(--spacing-lg);
  }

  .page-title {
    font-size: var(--text-3xl);
    margin-bottom: var(--spacing-lg);
  }
}

/* 移动端样式 */
@media (max-width: 768px) {
  .page-title {
    font-size: var(--text-2xl);
    margin-bottom: var(--spacing-md);
  }

  /* Masonry布局在移动端也生效 */
}

/* 极小屏幕优化 */
@media (max-width: 480px) {
  .page-title {
    font-size: var(--text-xl);
  }
}
</style>

<!-- Masonry瀑布流全局样式 -->
<style>
/* Masonry瀑布流卡片样式 - 与HomePage保持一致 */
.explore-page .posts-grid .post-card {
  width: calc(25% - 12px);
  margin-bottom: 16px;
}

@media (min-width: 1400px) {
  .explore-page .posts-grid .post-card {
    width: calc(25% - 12px);
  }
}

@media (min-width: 1024px) and (max-width: 1399px) {
  .explore-page .posts-grid .post-card {
    width: calc(33.333% - 11px);
  }
}

/* 平板端 - 较大屏幕 (901px-1023px) */
@media (min-width: 901px) and (max-width: 1023px) {
  .explore-page .posts-grid .post-card {
    width: calc(50% - 8px); /* 2列 */
  }
}

/* 平板端 - 中等屏幕 (780px-900px) - 2列布局 */
@media (min-width: 780px) and (max-width: 900px) {
  .explore-page .posts-grid .post-card {
    width: calc(50% - 8px); /* 2列 */
    margin-bottom: 16px;
  }
}

/* 平板端 - 较小屏幕 (769px-779px) */
@media (min-width: 769px) and (max-width: 779px) {
  .explore-page .posts-grid .post-card {
    width: calc(50% - 8px); /* 2列 */
  }
}

@media (max-width: 768px) {
  .explore-page .posts-grid .post-card {
    width: calc(50% - 8px);
    margin-bottom: 16px;
  }
}

@media (max-width: 480px) {
  .explore-page .posts-grid .post-card {
    width: calc(50% - 6px);
    margin-bottom: 12px;
  }
}
</style>
