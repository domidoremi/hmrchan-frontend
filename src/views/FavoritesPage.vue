<template>
  <MainLayout>
    <div class="favorites-page">
      <h1 class="page-title">{{ $t('nav.favorites') }}</h1>

      <LoadingSpinner v-if="loading" size="lg" />

      <div v-else-if="favoritePosts.length > 0" class="favorites-list">
        <div class="favorites-grid">
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
import { onMounted } from 'vue'
import { Heart, Compass } from 'lucide-vue-next'

import MainLayout from '@/components/layout/MainLayout.vue'
import PostCard from '@/components/features/PostCard.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import GlassButton from '@/components/ui/GlassButton.vue'
import { useFavorites } from '@/composables/useFavorites'

const { favoritePosts, loading, fetchFavorites } = useFavorites()

onMounted(async () => {
  try {
    await fetchFavorites()
  } catch (error) {
    console.error('Failed to load favorites:', error)
  }
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
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-lg);
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

/* 平板端（769px - 1100px）- 固定2列 */
@media (min-width: 769px) and (max-width: 1100px) {
  .favorites-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 移动端（<=768px）- 2列保持自然高度 */
@media (max-width: 768px) {
  .favorites-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }
}

/* 小屏手机（<=480px）- 单列 */
@media (max-width: 480px) {
  .favorites-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
  }
}
</style>
