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
        <p v-if="lastListFromFallback" class="offline-hint">
          {{ $t('offline.usingCache') }}
        </p>
        <div ref="postsGrid" class="posts-grid">
          <PostCard v-for="(post, index) in posts" :key="post.id" :post="post" :index="index" :show-actions="false" />
        </div>

        <!-- Pagination -->
        <Pagination :current-page="pagination.page" :total-pages="pagination.pages" @change="handlePageChange" />
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
import { ref, watch, nextTick, onMounted, onUnmounted, onActivated, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { SearchX, RotateCcw } from 'lucide-vue-next'

import MainLayout from '@/components/layout/MainLayout.vue'
import FilterBar from '@/components/business/FilterBar.vue'
import PostCard from '@/components/business/PostCard.vue'
import Pagination from '@/components/business/Pagination.vue'
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner.vue'
import GlassButton from '@/components/ui/button/Button.vue'

import { usePostsStore } from '@/stores'
import type { PostListParams } from '@/types'
import { useWaterfallLayout } from '@/composables'

const route = useRoute()
const router = useRouter()
const postsStore = usePostsStore()

const { posts, loading, filters, pagination, lastListFromFallback } = storeToRefs(postsStore)

const postsGrid = ref<HTMLElement | null>(null)
const loadedPostsCount = ref(0) // 追踪已加载的卡片数量

// 使用轻量级瀑布流布局
const { updateLayout, smoothUpdateLayout } = useWaterfallLayout(postsGrid, {
  columnGap: 16,
  rowGap: 16,
  breakpoints: {
    1400: 4, // >= 1400px: 4列
    1100: 3, // >= 1100px: 3列
    769: 2, // >= 769px: 2列
    0: 2, // < 769px: 2列
  },
})

onMounted(async () => {
  // 清空旧的posts数组，避免显示缓存数据
  postsStore.posts = []

  // 重置筛选条件
  postsStore.resetFilters()

  // 从URL查询参数初始化筛选
  const query = route.query
  if (query.q) filters.value.q = query.q as string
  if (query.platform) filters.value.platform = query.platform as string

  await loadPosts()

  // 记录初始加载的卡片数量
  await nextTick()
  loadedPostsCount.value = posts.value.length

  // 更新瀑布流布局
  await updateLayout()
})

onBeforeUnmount(() => {
  // 离开页面时重置筛选条件和posts，避免状态污染其他页面
  postsStore.resetFilters()
  postsStore.posts = []
  console.log('[ExplorePage] 页面卸载，已重置筛选条件和posts')
})

onUnmounted(() => {
  // 清理工作由 composables 自动处理
})

// 页面激活时重新计算布局（解决页面切换后布局错乱）
onActivated(async () => {
  if (postsGrid.value && posts.value.length > 0) {
    await nextTick()
    await updateLayout()
    console.log('[ExplorePage] 页面激活，重新计算布局')
  }
})

watch(
  () => route.query,
  () => {
    if (route.query.q) filters.value.q = route.query.q as string
    loadPosts()
  },
)

const loadPosts = async () => {
  const previousCount = loadedPostsCount.value

  await postsStore.fetchPosts()

  // 等待 DOM 更新
  await nextTick()

  // 获取所有卡片，只对新卡片添加动画
  if (postsGrid.value) {
    const allCards = postsGrid.value.querySelectorAll('a.post-card')

    // 只对新增的卡片添加进入动画
    for (let i = previousCount; i < allCards.length; i++) {
      const card = allCards[i] as HTMLElement
      card.classList.add('card-entering')
    }

    // 更新已加载数量
    loadedPostsCount.value = allCards.length
  }

  // 使用平滑更新
  await smoothUpdateLayout()

  // 延迟后移除进入动画类
  setTimeout(() => {
    if (postsGrid.value) {
      const cards = postsGrid.value.querySelectorAll('a.post-card.card-entering')
      cards.forEach((card) => {
        ; (card as HTMLElement).classList.remove('card-entering')
      })
    }
  }, 600)
}

const handleFilterUpdate = async (newFilters: Partial<PostListParams>) => {
  postsStore.updateFilters(newFilters)
  loadedPostsCount.value = 0 // 重置计数，因为是新的筛选结果
  await loadPosts()

  // 更新URL查询参数
  const query: Record<string, string> = {}
  if (newFilters.q) query.q = newFilters.q
  if (newFilters.platform) query.platform = newFilters.platform
  router.push({ query })
}

const handlePageChange = async (page: number) => {
  postsStore.updateFilters({ page })
  loadedPostsCount.value = 0 // 重置计数，因为是新页面
  await loadPosts()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const resetFilters = () => {
  postsStore.resetFilters()
  loadedPostsCount.value = 0 // 重置计数
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
