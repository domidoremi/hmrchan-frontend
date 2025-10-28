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
        <div class="posts-grid">
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
import { onMounted, watch } from 'vue'
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
import type { PostListParams } from '@/types'

const route = useRoute()
const router = useRouter()
const postsStore = usePostsStore()

const { posts, loading, filters, pagination } = storeToRefs(postsStore)

onMounted(() => {
  // 重置筛选条件
  postsStore.resetFilters()
  
  // 从URL查询参数初始化筛选
  const query = route.query
  if (query.q) filters.value.q = query.q as string
  if (query.platform) filters.value.platform = query.platform as string

  loadPosts()
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

const handleFilterUpdate = async (newFilters: PostListParams) => {
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
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
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

@media (max-width: 768px) {
  .posts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
