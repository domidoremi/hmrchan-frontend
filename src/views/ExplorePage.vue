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

      <div class="filters-row">
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

        <div class="platform-filters">
          <button
            v-for="platform in platformOptions"
            :key="platform.value"
            class="platform-btn"
            :class="{ active: currentPlatform === platform.value }"
            @click="currentPlatform = platform.value"
          >
            <component :is="platform.icon" :size="16" />
            <span class="platform-label">{{ platform.label }}</span>
          </button>
        </div>
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

          <!-- Load More / Quota Indicator -->
          <div v-if="posts.length > 0" class="load-more-section">
            <div class="quota-indicator">
              <span class="quota-text">{{ $t('common.showing', { count: posts.length, total }) }}</span>
            </div>
            <Button
              v-if="hasMore"
              variant="secondary"
              :disabled="isLoadingMore"
              @click="loadMore"
            >
              <span v-if="isLoadingMore" class="spinner spinner-sm" />
              {{ $t('common.loadMore') }}
            </Button>
            <p v-else class="no-more-text">{{ $t('common.noMoreItems') }}</p>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ExplorePage' })

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Search, Globe, Youtube, Music2, Twitter } from 'lucide-vue-next'
import { postService, type PostListItem, ApiError } from '@/api'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import PostCard from '@/components/business/PostCard.vue'
import Button from '@/components/ui/Button.vue'

const router = useRouter()

const { t } = useI18n()

const searchQuery = ref('')
const currentSort = ref<'newest' | 'popular' | 'trending'>('newest')
const currentPlatform = ref<'all' | 'youtube' | 'tiktok' | 'twitter'>('all')

const posts = ref<PostListItem[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const total = ref(0)
const pageSize = 24

const hasMore = computed(() => posts.value.length < total.value)

const sortOptions = [
  { value: 'newest' as const },
  { value: 'popular' as const },
  { value: 'trending' as const },
]

const platformOptions = [
  { value: 'all' as const, label: t('explore.allPlatforms'), icon: Globe },
  { value: 'youtube' as const, label: 'YouTube', icon: Youtube },
  { value: 'tiktok' as const, label: 'TikTok', icon: Music2 },
  { value: 'twitter' as const, label: 'Twitter', icon: Twitter },
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

async function fetchPosts(reset = true) {
  if (reset) {
    if (isLoading.value) return
    isLoading.value = true
    page.value = 1
    posts.value = []
  } else {
    if (isLoadingMore.value) return
    isLoadingMore.value = true
  }

  error.value = null

  try {
    const { sort_by, sort_order } = getSortParams(currentSort.value)
    const params = {
      page: page.value,
      page_size: pageSize,
      sort_by,
      sort_order,
    }

    const q = searchQuery.value.trim()
    const platform = currentPlatform.value !== 'all' ? currentPlatform.value : undefined
    const res = await postService.listPosts({ ...params, ...(q ? { q } : {}), ...(platform ? { platform } : {}) })

    if (reset) {
      posts.value = res.items
    } else {
      posts.value.push(...res.items)
    }
    total.value = res.total
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message
    } else {
      error.value = t('common.error')
    }
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

async function loadMore() {
  if (!hasMore.value || isLoadingMore.value) return
  page.value++
  await fetchPosts(false)
}

function handleScroll() {
  if (!hasMore.value || isLoadingMore.value) return

  const scrollTop = window.scrollY
  const windowHeight = window.innerHeight
  const docHeight = document.documentElement.scrollHeight

  if (scrollTop + windowHeight >= docHeight - 500) {
    loadMore()
  }
}

let searchDebounceTimer: number | undefined

watch(currentSort, () => {
  fetchPosts()
})

watch(currentPlatform, () => {
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
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
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

.filters-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-6);
}

.platform-filters {
  display: flex;
  gap: var(--spacing-2);
}

.platform-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  border: 1px solid var(--glass-border);
  transition: all var(--transition-fast);
}

.platform-btn:hover {
  background: var(--glass-bg-light);
}

.platform-btn.active {
  background: var(--color-primary);
  color: var(--color-white);
  border-color: var(--color-primary);
}

.platform-label {
  display: none;
}

@media (min-width: 768px) {
  .platform-label {
    display: inline;
  }
}

.posts-masonry {
  --masonry-columns: 5;
  --masonry-gap: var(--spacing-4);

  column-count: var(--masonry-columns);
  column-gap: var(--masonry-gap);
}

.posts-masonry > :deep(*) {
  break-inside: avoid;
  margin-bottom: var(--masonry-gap);
}

@media (min-width: 1920px) {
  .posts-masonry {
    --masonry-columns: 6;
  }
}

@media (min-width: 1600px) and (max-width: 1919px) {
  .posts-masonry {
    --masonry-columns: 5;
  }
}

@media (min-width: 1200px) and (max-width: 1599px) {
  .posts-masonry {
    --masonry-columns: 4;
  }
}

@media (min-width: 900px) and (max-width: 1199px) {
  .posts-masonry {
    --masonry-columns: 3;
  }
}

@media (min-width: 600px) and (max-width: 899px) {
  .posts-masonry {
    --masonry-columns: 3;
    --masonry-gap: var(--spacing-3);
  }
}

@media (min-width: 400px) and (max-width: 599px) {
  .posts-masonry {
    --masonry-columns: 2;
    --masonry-gap: var(--spacing-2);
  }
}

@media (max-width: 399px) {
  .posts-masonry {
    --masonry-columns: 1;
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

.load-more-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
  margin-top: var(--spacing-8);
  padding: var(--spacing-4);
}

.quota-indicator {
  text-align: center;
}

.quota-text {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.no-more-text {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}
</style>
