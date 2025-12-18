<template>
  <div class="explore-page">
    <div class="container">
      <header class="page-header">
        <div class="page-title-row">
          <h1>{{ $t('explore.title') }}</h1>
          <span v-if="isLoading && posts.length > 0" class="spinner spinner-sm" />
        </div>
        <div class="search-bar">
          <Search :size="20" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            class="glass-input search-input"
            :placeholder="$t('explore.searchPlaceholder')"
          />
        </div>
      </header>

      <div class="filters">
        <button
          v-for="sort in sortOptions"
          :key="sort.value"
          class="filter-btn"
          :class="{ active: currentSort === sort.value }"
          @click="currentSort = sort.value"
        >
          {{ $t(`explore.${sort.value}`) }}
        </button>
      </div>

      <StateIndicator v-if="error" variant="error" :description="error" @action="fetchPosts" />

      <template v-else>
        <div v-if="isLoading && posts.length === 0" class="posts-grid">
          <div v-for="i in 12" :key="i" class="post-card glass-card">
            <div class="post-image skeleton" style="aspect-ratio: 1;" />
            <div class="post-content">
              <div class="skeleton" style="height: 20px; width: 80%;" />
              <div class="skeleton" style="height: 14px; width: 50%; margin-top: 8px;" />
            </div>
          </div>
        </div>

        <template v-else>
          <div class="posts-masonry">
            <PostCard
              v-for="post in posts"
              :key="post.id"
              :post="post"
              @click="goToPost"
            />
          </div>

          <StateIndicator v-if="posts.length === 0" variant="empty" />
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Search } from 'lucide-vue-next'
import { postService, type PostListItem, ApiError } from '@/api'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import PostCard from '@/components/business/PostCard.vue'

const router = useRouter()

const { t } = useI18n()

const searchQuery = ref('')
const currentSort = ref<'newest' | 'popular' | 'trending'>('newest')

const posts = ref<PostListItem[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

const sortOptions = [
  { value: 'newest' as const },
  { value: 'popular' as const },
  { value: 'trending' as const },
]

function goToPost(postId: string) {
  router.push(`/post/${postId}`)
}

function getSortParams(sort: 'newest' | 'popular' | 'trending') {
  switch (sort) {
    case 'popular':
      return { sort_by: 'like_count' as const, sort_order: 'desc' as const }
    case 'trending':
      return { sort_by: 'view_count' as const, sort_order: 'desc' as const }
    case 'newest':
    default:
      return { sort_by: 'published_at' as const, sort_order: 'desc' as const }
  }
}

async function fetchPosts() {
  if (isLoading.value) return

  const hadData = posts.value.length > 0

  isLoading.value = true
  error.value = null

  try {
    const { sort_by, sort_order } = getSortParams(currentSort.value)
    const params = {
      page: 1,
      page_size: 24,
      sort_by,
      sort_order,
    }

    const q = searchQuery.value.trim()
    const res = await postService.listPosts(q ? { ...params, q } : params)

    posts.value = res.items
  } catch (err) {
    if (hadData) return

    if (err instanceof ApiError) {
      error.value = err.message
    } else {
      error.value = t('common.error')
    }
  } finally {
    isLoading.value = false
  }
}

let searchDebounceTimer: number | undefined

watch(currentSort, () => {
  fetchPosts()
})

watch(searchQuery, () => {
  if (searchDebounceTimer) window.clearTimeout(searchDebounceTimer)
  searchDebounceTimer = window.setTimeout(() => {
    fetchPosts()
  }, 300)
})

onMounted(() => {
  fetchPosts()
})
</script>

<style scoped>
.explore-page {
  padding: var(--spacing-8) 0;
}

.page-header {
  margin-bottom: var(--spacing-6);
}

.page-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.page-title-row h1 {
  margin-bottom: 0;
}

.search-bar {
  position: relative;
  max-width: 500px;
}

.search-icon {
  position: absolute;
  left: var(--spacing-4);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
}

.search-input {
  padding-left: var(--spacing-12);
}

.filters {
  display: flex;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-6);
}

.filter-btn {
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  border: 1px solid var(--glass-border);
  transition: all var(--transition-fast);
}

.filter-btn:hover {
  background: var(--glass-bg-light);
}

.filter-btn.active {
  background: var(--color-primary);
  color: var(--color-white);
  border-color: var(--color-primary);
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--spacing-4);
}

.posts-masonry {
  --masonry-column-width: 220px;
  --masonry-gap: var(--spacing-4);

  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--masonry-column-width), 1fr));
  gap: var(--masonry-gap);
  align-items: start;
}

@media (min-width: 1600px) {
  .posts-masonry {
    --masonry-column-width: 240px;
  }
}

@media (min-width: 1920px) {
  .posts-masonry {
    --masonry-column-width: 260px;
  }
}

@media (max-width: 1200px) {
  .posts-masonry {
    --masonry-column-width: 200px;
  }
}

@media (max-width: 900px) {
  .posts-masonry {
    --masonry-column-width: 180px;
    --masonry-gap: var(--spacing-3);
  }
}

@media (max-width: 600px) {
  .posts-masonry {
    grid-template-columns: repeat(2, 1fr);
    --masonry-gap: var(--spacing-2);
  }
}

@media (max-width: 400px) {
  .posts-masonry {
    grid-template-columns: 1fr;
  }
}

.post-card {
  overflow: hidden;
}

.post-card-btn {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.post-content {
  padding: var(--spacing-3);
}
</style>
