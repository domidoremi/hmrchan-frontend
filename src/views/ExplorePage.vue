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
          <PostCard v-for="(post, index) in posts" :key="post.id" :post="post" :index="index" />
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
import type { Post, PostListParams } from '@/types'
import { postsApi } from '@/api/services'
import { usePageMasonry } from '@/composables/usePageMasonry'

const route = useRoute()
const router = useRouter()
const postsStore = usePostsStore()

const { posts, loading, filters, pagination } = storeToRefs(postsStore)

const postsGrid = ref<HTMLElement | null>(null)

// 使用页面级Masonry管理
const masonry = usePageMasonry(postsGrid, { posts })

onMounted(async () => {
  // 初始化Masonry管理
  masonry.mount()

  // 重置筛选条件
  postsStore.resetFilters()

  // 从URL查询参数初始化筛选
  const query = route.query
  if (query.q) filters.value.q = query.q as string
  if (query.platform) filters.value.platform = query.platform as string

  await loadPosts()

  // 初始化Masonry（自动判断桌面端/移动端）
  await masonry.initialize()
})

onUnmounted(() => {
  masonry.unmount()
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

const handleFilterUpdate = async (newFilters: Partial<PostListParams>) => {
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
  min-height: 400px; /* 防止初始化前内容塌陷 */
  transition: min-height 0.3s ease;
}

/* 桌面端：Masonry初始化前防止卡片堆叠和CLS */
@media (min-width: 769px) {
  .posts-grid {
    opacity: 0;
    visibility: hidden; /* 完全隐藏，防止CLS计算 */
    /* 延迟到500ms，确保Masonry完全初始化 */
    animation: fadeInExplore 0.4s ease-out 0.5s forwards;
  }
}

@keyframes fadeInExplore {
  from {
    opacity: 0;
    visibility: hidden;
  }
  to {
    opacity: 1;
    visibility: visible;
  }
}

/* 移动端flexbox布局 - 由全局样式控制，避免重复 */

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

/* ========== 响应式优化 ========== */

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
/* 桌面端：Masonry完全控制布局 */
.explore-page .posts-grid {
  width: 100%;
  position: relative; /* Masonry需要relative定位作为absolute的容器 */
}

/* 桌面端卡片基础样式 */
.explore-page .posts-grid .post-card {
  box-sizing: border-box;
}

/* 大屏幕（>=1400px）- 4列 */
@media (min-width: 1400px) {
  .explore-page .posts-grid .post-card {
    width: calc(25% - 12px);
  }
}

/* 中型屏幕（1101px-1399px）- 3列 */
@media (min-width: 1101px) and (max-width: 1399px) {
  .explore-page .posts-grid .post-card {
    width: calc(33.333% - 11px);
  }
}

/* 小型桌面/平板横屏（769px-1100px）- 2列 */
@media (min-width: 769px) and (max-width: 1100px) {
  .explore-page .posts-grid .post-card {
    width: calc(50% - 8px);
  }
}

/* 移动端（<=768px）- 使用flex布局 */
@media (max-width: 768px) {
  .explore-page .posts-grid {
    display: flex !important;
    flex-wrap: wrap !important;
    /* 明确设置行间距和列间距 */
    column-gap: var(--spacing-md) !important; /* 水平间距16px */
    row-gap: var(--spacing-md) !important; /* 垂直间距16px */
    width: 100% !important;
  }

  .explore-page .posts-grid .post-card {
    /* flex的gap自动处理间距，所以宽度计算为(100% - gap) / 2 */
    flex: 0 0 calc((100% - var(--spacing-md)) / 2) !important;
    width: calc((100% - var(--spacing-md)) / 2) !important;
    max-width: calc((100% - var(--spacing-md)) / 2) !important;
    margin: 0 !important;
    position: relative !important;
    left: auto !important;
    top: auto !important;
    /* 确保没有transform干扰布局 */
    transform: none !important;
  }
}

/* 小屏手机（<=480px）*/
@media (max-width: 480px) {
  .explore-page .posts-grid {
    column-gap: var(--spacing-sm) !important; /* 水平间距12px */
    row-gap: var(--spacing-sm) !important; /* 垂直间距12px */
  }

  .explore-page .posts-grid .post-card {
    flex: 0 0 calc((100% - var(--spacing-sm)) / 2) !important;
    width: calc((100% - var(--spacing-sm)) / 2) !important;
    max-width: calc((100% - var(--spacing-sm)) / 2) !important;
  }
}
</style>
