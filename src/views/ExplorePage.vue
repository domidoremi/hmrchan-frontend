<template>
  <div class="explore-page">
    <div class="container">
      <header class="page-header">
        <div class="page-title-row">
          <div class="page-title-group">
            <h1>{{ $t('explore.title') }}</h1>
            <span class="page-title-badge">{{ total }} {{ $t('search.tab.posts') }}</span>
          </div>
          <span v-if="isLoading && posts.length > 0" class="spinner spinner-sm" />
        </div>
        <div class="search-bar">
          <Search :size="20" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            class="glass-input search-input"
            :placeholder="$t('explore.searchPlaceholder')"
            ref="searchInputRef"
            @focus="isSearchFocused = true"
            @blur="isSearchFocused = false"
          />
          <kbd v-if="!searchQuery && !isSearchFocused" class="search-kbd">/</kbd>
        </div>
      </header>

      <div class="filters-row" role="group" :aria-label="$t('explore.filters')">
        <div class="filters" role="group" :aria-label="$t('explore.sortBy')">
          <button
            v-for="sort in sortOptions"
            :key="sort.value"
            class="filter-btn"
            :class="{ active: currentSort === sort.value }"
            :aria-pressed="currentSort === sort.value"
            :aria-label="$t(`explore.${sort.value}`)"
            @click="currentSort = sort.value"
          >
            {{ $t(`explore.${sort.value}`) }}
          </button>
        </div>

        <div class="platform-filters" role="group" :aria-label="$t('explore.platformFilter')">
          <button
            v-for="platform in platformOptions"
            :key="platform.value"
            class="platform-btn"
            :class="{ active: currentPlatform === platform.value }"
            :aria-pressed="currentPlatform === platform.value"
            :aria-label="platform.label"
            @click="currentPlatform = platform.value"
          >
            <component :is="platform.icon" :size="16" aria-hidden="true" />
            <span class="platform-label">{{ platform.label }}</span>
          </button>
        </div>
      </div>

      <StateIndicator v-if="error" variant="error" :description="error" @action="fetchPosts" />

      <template v-else>
        <div v-if="isLoading && posts.length === 0" class="posts-grid">
          <div v-for="i in 12" :key="i" class="post-card glass-card">
            <div class="post-image skeleton" style="aspect-ratio: 1" />
            <div class="post-content">
              <div class="skeleton" style="height: 20px; width: 80%" />
              <div class="skeleton" style="height: 14px; width: 50%; margin-top: 8px" />
            </div>
          </div>
        </div>

        <template v-else>
          <div class="posts-masonry">
            <PostCard v-for="post in visiblePosts" :key="post.id" :post="post" @click="goToPost" />
          </div>

          <StateIndicator v-if="posts.length === 0" variant="empty" />

          <!-- Load More / Quota Indicator -->
          <LoadMoreSection
            v-if="posts.length > 0"
            :count="visiblePosts.length"
            :total="total"
            :has-more="hasMoreForUi"
            :loading="isLoadingMore"
            :sentinel-ref="setSentinelRef"
            @load-more="loadMore"
          />
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ExplorePage' })

import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Search, Globe, Youtube, Music2, Twitter } from 'lucide-vue-next'
import { postService, type PostListItem, ApiError } from '@/api'
import { postCache } from '@/utils/cache'
import { debounce } from '@/utils/performance'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useProgressiveRender } from '@/composables/useProgressiveRender'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import PostCard from '@/components/business/PostCard.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'

const router = useRouter()

const { t } = useI18n()

const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const isSearchFocused = ref(false)
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

const sentinelRef = ref<HTMLElement | null>(null)

const setSentinelRef = (el: Element | null) => {
  sentinelRef.value = el as HTMLElement | null
}

const {
  visibleItems: visiblePosts,
  hasMoreToRender,
  revealNextBatch,
} = useProgressiveRender(posts, { initialCount: 24, batchSize: 24 })

const hasMoreForUi = computed(() => hasMore.value || hasMoreToRender.value)

const onGlobalKeydown = (event: KeyboardEvent) => {
  if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return

  const target = event.target as HTMLElement | null
  const tagName = target?.tagName?.toLowerCase()
  const isEditable =
    tagName === 'input' ||
    tagName === 'textarea' ||
    (target instanceof HTMLElement && target.isContentEditable)
  if (isEditable) return

  event.preventDefault()
  searchInputRef.value?.focus()
}

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

function goToPost(postId: string, thumbnailSrc: string | null) {
  if (thumbnailSrc) {
    sessionStorage.setItem(`post-thumbnail-${postId}`, thumbnailSrc)
  }
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
  const hadData = posts.value.length > 0

  if (reset) {
    if (isLoading.value) return false
    isLoading.value = true
    page.value = 1
    if (!hadData) {
      posts.value = []
    }
  } else {
    if (isLoadingMore.value) return false
    isLoadingMore.value = true
  }

  error.value = null

  const { sort_by, sort_order } = getSortParams(currentSort.value)
  const params = {
    page: page.value,
    page_size: pageSize,
    sort_by,
    sort_order,
  }

  const q = searchQuery.value.trim()
  const platform = currentPlatform.value !== 'all' ? currentPlatform.value : undefined
  const requestParams = { ...params, ...(q ? { q } : {}), ...(platform ? { platform } : {}) }

  if (reset) {
    const cached = await postCache.getList(requestParams)
    if (cached && !hadData) {
      posts.value = cached.data as PostListItem[]
      total.value = cached.total
    }
  }

  try {
    const res = await postService.listPosts(requestParams)

    if (reset) {
      posts.value = res.items
    } else {
      posts.value.push(...res.items)
    }
    total.value = res.total

    if (reset) {
      await postCache.setList(requestParams, res.items, res.total)
    }

    return true
  } catch (err) {
    if (posts.value.length === 0) {
      if (err instanceof ApiError) {
        error.value = err.message
      } else {
        error.value = t('common.error')
      }
    }

    return false
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

async function loadMore(): Promise<boolean> {
  if (hasMoreToRender.value) {
    revealNextBatch()
    return true
  }

  if (!hasMore.value || isLoading.value || isLoadingMore.value) return false

  const nextPage = page.value + 1
  page.value = nextPage
  const ok = await fetchPosts(false)
  if (!ok) {
    page.value = nextPage - 1
    return false
  }

  return true
}

useInfiniteScroll(sentinelRef, loadMore, {
  rootMargin: '400px',
  enabled: () => hasMoreForUi.value && !isLoading.value && !isLoadingMore.value,
})

// 使用 debounce 优化搜索输入
const debouncedFetchPosts = debounce(() => fetchPosts(), 300)

watch(currentSort, () => {
  fetchPosts()
})

watch(currentPlatform, () => {
  fetchPosts()
})

watch(searchQuery, () => {
  debouncedFetchPosts()
})

onMounted(() => {
  if (posts.value.length === 0) {
    fetchPosts()
  }

  window.addEventListener('keydown', onGlobalKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
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

.page-title-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.page-title-badge {
  padding: var(--spacing-1) var(--spacing-3);
  background: rgba(var(--color-primary-rgb), 0.1);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-primary);
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
  padding-right: var(--spacing-10);
}

.search-kbd {
  position: absolute;
  right: var(--spacing-3);
  top: 50%;
  transform: translateY(-50%);
  padding: 2px 8px;
  background: var(--glass-bg-subtle);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
  pointer-events: none;
}

.filters {
  display: flex;
  gap: var(--spacing-2);
}

.filter-btn {
  position: relative;
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  border: 1px solid var(--glass-border);
  background: transparent;
  transition: all var(--transition-fast);
  overflow: hidden;
}

.filter-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--glass-bg-subtle);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.filter-btn:hover {
  color: var(--color-text-primary);
  border-color: rgba(var(--color-primary-rgb), 0.3);
}

.filter-btn:hover::before {
  opacity: 1;
}

.filter-btn.active {
  background: var(--gradient-primary);
  color: var(--color-white);
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
}

.filter-btn.active::before {
  display: none;
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
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: var(--glass-bg-subtle);
  border: 1px solid transparent;
  transition: all var(--transition-fast);
}

.platform-btn:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
  transform: translateY(-1px);
}

.platform-btn.active {
  background: rgba(var(--color-primary-rgb), 0.15);
  color: var(--color-primary);
  border-color: rgba(var(--color-primary-rgb), 0.3);
}

.platform-btn.active svg {
  color: var(--color-primary);
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
</style>
