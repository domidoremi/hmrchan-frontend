<template>
  <MainLayout>
    <div class="favorites-page">
      <h1 class="page-title">{{ $t('nav.favorites') }}</h1>

      <LoadingSpinner v-if="loading" size="lg" />

      <div v-else-if="favoritePosts.length > 0" class="favorites-list">
        <div ref="gridRef" class="favorites-grid">
          <PostCard v-for="post in favoritePosts" :key="post.id" :post="post" />
        </div>
      </div>

      <div v-else class="empty-state glass-card">
        <Heart :size="64" />
        <h3>No favorites yet</h3>
        <p>Start adding content to your favorites!</p>
        <RouterLink to="/explore">
          <GlassButton>
            <Compass :size="18" />
            Explore Content
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
import PostCard from '@/components/features/PostCard.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import GlassButton from '@/components/ui/GlassButton.vue'
import { useFavorites } from '@/composables/useFavorites'
import { useWaterfallLayout } from '@/composables/useWaterfallLayout'

const { favoritePosts, loading, fetchFavorites } = useFavorites()

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
watch(() => favoritePosts.value.length, async () => {
  await nextTick()
  await updateLayout()
})
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
