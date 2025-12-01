<template>
  <MainLayout>
    <div class="explore-page">
      <h1 class="page-title">{{ $t('nav.explore') }}</h1>

      <!-- Filter Bar -->
      <FilterBar :filters="filters" @update="handleFilterUpdate" />

      <!-- Infinite Post Grid -->
      <InfinitePostGrid :items="posts" :loading="loading" :has-more="hasMore"
        :is-loading-more="loading && posts.length > 0" @load-more="handleLoadMore">
        <template #empty>
          <div class="empty-state glass-card">
            <SearchX :size="64" />
            <h3>{{ $t('search.noResults') }}</h3>
            <p>{{ $t('search.tryDifferent') }}</p>
            <GlassButton @click="resetFilters">
              <RotateCcw :size="18" />
              {{ $t('common.reset') }}
            </GlassButton>
          </div>
        </template>
      </InfinitePostGrid>

      <p v-if="lastListFromFallback && posts.length > 0" class="offline-hint">
        {{ $t('offline.usingCache') }}
      </p>
    </div>
  </MainLayout>
</template>

<script lang="ts">
export default {
  name: 'ExplorePage',
}
</script>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { SearchX, RotateCcw } from 'lucide-vue-next'

import MainLayout from '@/components/layout/MainLayout.vue'
import FilterBar from '@/components/business/FilterBar.vue'
import InfinitePostGrid from '@/components/business/InfinitePostGrid.vue'
import GlassButton from '@/components/ui/button/Button.vue'

import { usePostsStore } from '@/stores'
import type { PostListParams } from '@/types'
import { logger } from '@/utils/logger'

const route = useRoute()
const router = useRouter()
const postsStore = usePostsStore()

const { posts, loading, filters, pagination, lastListFromFallback } = storeToRefs(postsStore)

const hasMore = computed(() => pagination.value.page < pagination.value.pages)

onMounted(async () => {
  // 清空旧的posts数组，避免显示缓存数据
  postsStore.posts = []

  // 重置筛选条件
  postsStore.resetFilters()

  // 从URL查询参数初始化筛选
  const query = route.query
  if (query.q) filters.value.q = query.q as string
  if (query.platform) filters.value.platform = query.platform as string

  await postsStore.fetchPosts()
})

onBeforeUnmount(() => {
  // 离开页面时重置筛选条件和posts，避免状态污染其他页面
  postsStore.resetFilters()
  postsStore.posts = []
  logger.debug('页面卸载，已重置筛选条件和posts', { category: 'ExplorePage' })
})

watch(
  () => route.query,
  () => {
    if (route.query.q) filters.value.q = route.query.q as string
    postsStore.fetchPosts()
  },
)

const handleLoadMore = async () => {
  if (loading.value || !hasMore.value) return

  const nextPage = pagination.value.page + 1
  postsStore.updateFilters({ page: nextPage })
  await postsStore.fetchPosts({ append: true })
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

const resetFilters = () => {
  postsStore.resetFilters()
  router.push({ query: {} })
  postsStore.fetchPosts()
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

.offline-hint {
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: rgba(59, 130, 246, 0.08);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  text-align: center;
}

/* ========== 响应式优化 ========== */

/* 平板端优化 (780px-900px) */
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
}

/* 极小屏幕优化 */
@media (max-width: 480px) {
  .page-title {
    font-size: var(--text-xl);
  }
}
</style>

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
  /* 瀑布流容器 - 由 useWaterfallLayout 动态控制 columns */
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

.offline-hint {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: rgba(59, 130, 246, 0.08);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
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
}

/* 极小屏幕优化 */
@media (max-width: 480px) {
  .page-title {
    font-size: var(--text-xl);
  }
}
</style>

<!-- 瀑布流全局样式 - 手动定位实现 -->
<style>
/* 桌面端：手动定位瀑布流 */
.explore-page .posts-grid {
  width: 100%;
  position: relative;
  /* 高度由 JS 动态设置 */
}

/* 卡片样式 - 绝对定位 */
.explore-page .posts-grid .post-card {
  /* position, left, top, width 由 JS 动态设置 */
  box-sizing: border-box;
  transition:
    opacity 0.4s ease,
    transform 0.4s ease,
    left 0.3s ease,
    top 0.3s ease;
}

/* 新卡片进入动画 */
.explore-page .posts-grid .post-card.card-entering {
  animation: cardFadeIn var(--duration-slower) var(--ease-decelerate) forwards;
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 所有屏幕尺寸都使用 JS 瀑布流（包括移动端） */
/* JS 会自动根据屏幕宽度计算列数：
   - >= 1600px: 5列
   - >= 1400px: 4列
   - >= 1100px: 3列
   - >= 769px:  2列
   - >= 481px:  2列
   - < 481px:   2列
*/
</style>
