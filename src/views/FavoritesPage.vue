<template>
  <MainLayout>
    <div class="favorites-page">
      <h1 class="page-title">{{ $t('nav.favorites') }}</h1>

      <LoadingSpinner v-if="loading" size="lg" />

      <div v-else-if="favoritePosts.length > 0" class="favorites-list">
        <p v-if="fromFallback" class="offline-hint">
          {{ $t('offline.usingCache') }}
        </p>
        <div ref="gridRef" class="favorites-grid">
          <PostCard
            v-for="post in favoritePosts"
            :key="post.id"
            :post="post"
            :show-actions="false"
          />
        </div>
      </div>

      <div v-else class="empty-state glass-card">
        <Heart :size="64" />
        <h3>{{ $t('favorite.emptyTitle') }}</h3>
        <p>{{ $t('favorite.emptyDesc') }}</p>
        <RouterLink to="/explore">
          <GlassButton>
            <Compass :size="18" />
            {{ $t('favorite.goExplore') }}
          </GlassButton>
        </RouterLink>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { Heart, Compass } from 'lucide-vue-next'

import MainLayout from '@/components/layout/MainLayout.vue'
import PostCard from '@/components/business/PostCard.vue'
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner.vue'
import GlassButton from '@/components/ui/button/Button.vue'
import { useFavorites } from '@/composables'
import { useWaterfallLayout } from '@/composables'

const { favoritePosts, loading, fetchFavorites, fromFallback } = useFavorites()

// 瀑布流布局
const gridRef = ref<HTMLElement | null>(null)
const { updateLayout } = useWaterfallLayout(gridRef, {
  columnGap: 16,
  rowGap: 16,
})

onMounted(async () => {
  try {
    await fetchFavorites()
    // 数据加载后更新布局
    await nextTick()
    await updateLayout()
  } catch (error) {
    console.error('Failed to load favorites:', error)
  }
})

// 监听收藏列表变化，更新布局
watch(
  () => favoritePosts.value.length,
  async () => {
    await nextTick()
    await updateLayout()
  },
)
</script>

<style scoped>
.favorites-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.page-title {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
}

.favorites-grid {
  width: 100%;
  position: relative;
  /* 高度由 JS 动态设置 */
}

.favorites-grid .post-card {
  /* position, left, top, width 由 JS 动态设置 */
  box-sizing: border-box;
  transition:
    opacity 0.4s ease,
    transform 0.4s ease,
    left 0.3s ease,
    top 0.3s ease;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-3xl);
  text-align: center;
  color: var(--color-text-tertiary);
}

.offline-hint {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: rgba(59, 130, 246, 0.08);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
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
