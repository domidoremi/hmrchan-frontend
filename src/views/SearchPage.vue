<template>
  <div class="search-page">
    <div class="container">
      <header class="search-header">
        <div class="search-header-top">
          <button
            type="button"
            class="back-btn glass-btn"
            @click="goBack"
            :aria-label="$t('common.back')"
          >
            <ArrowLeft :size="20" />
          </button>
          <h1 class="search-title">{{ $t('search.title') }}</h1>
        </div>
        <SearchBar ref="searchBarRef" class="search-bar-main" />
      </header>

      <div v-if="query" class="search-content">
        <div class="search-meta">
          <p class="search-query-info">
            {{ $t('search.resultsFor') }} <strong>"{{ query }}"</strong>
          </p>
        </div>

        <div class="search-filters">
          <div class="filter-tabs">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              class="filter-tab"
              :class="{ active: activeTab === tab.id }"
              @click="activeTab = tab.id"
            >
              <component :is="tab.icon" :size="16" />
              {{ tab.label }}
              <span v-if="tab.id === 'posts' && total > 0" class="tab-count">{{ total }}</span>
              <span v-if="tab.id === 'authors' && authorTotal > 0" class="tab-count">{{
                authorTotal
              }}</span>
            </button>
          </div>

          <div class="filter-options">
            <div v-if="activeTab === 'posts'" class="platform-filters">
              <button
                v-for="platform in platformOptions"
                :key="platform.value"
                type="button"
                class="platform-btn"
                :class="{ active: currentPlatform === platform.value }"
                @click="currentPlatform = platform.value"
              >
                <component :is="platform.icon" :size="14" />
                <span class="platform-label">{{ platform.label }}</span>
              </button>
            </div>

            <div v-if="activeTab === 'posts'" class="sort-controls">
              <select v-model="sortBy" class="glass-input sort-select">
                <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <button
                type="button"
                class="sort-order-btn"
                :class="{ 'sort-order-btn--asc': sortOrder === 'asc' }"
                :title="
                  sortOrder === 'desc' ? $t('search.sort.descending') : $t('search.sort.ascending')
                "
                @click="toggleSortOrder"
              >
                <ArrowUpDown :size="16" />
              </button>
            </div>
          </div>
        </div>

        <div class="search-results">
          <div v-if="isLoading && results.length === 0" class="results-loading">
            <div v-for="i in 6" :key="i" class="result-skeleton glass-card">
              <div class="skeleton" style="aspect-ratio: 16/9; border-radius: var(--radius-md)" />
              <div class="skeleton-content">
                <div class="skeleton" style="height: 18px; width: 80%" />
                <div class="skeleton" style="height: 14px; width: 50%" />
              </div>
            </div>
          </div>

          <template v-else-if="activeTab === 'posts'">
            <StateIndicator v-if="error" variant="error" :description="error" @action="search" />

            <StateIndicator
              v-else-if="results.length === 0"
              variant="empty"
              :description="$t('search.noResults', { query })"
            />

            <template v-else>
              <div class="posts-masonry">
                <PostCard v-for="post in results" :key="post.id" :post="post" @click="goToPost" />
              </div>
            </template>

            <LoadMoreSection
              v-if="results.length > 0"
              :count="results.length"
              :total="total"
              :has-more="hasMore"
              :loading="isLoadingMore"
              @load-more="loadMore"
            />

            <!-- 未登录用户提示 -->
            <div v-if="mayHaveMoreResults && results.length > 0" class="login-hint glass-card">
              <LogIn :size="20" class="login-hint-icon" />
              <div class="login-hint-content">
                <p class="login-hint-text">{{ $t('search.loginForMore') }}</p>
                <button
                  type="button"
                  class="login-hint-btn glass-button glass-button--primary"
                  @click="goToLogin"
                >
                  {{ $t('nav.login') }}
                </button>
              </div>
            </div>
          </template>

          <template v-else-if="activeTab === 'authors'">
            <div v-if="isLoadingAuthors && authors.length === 0" class="results-loading">
              <div v-for="i in 4" :key="i" class="author-skeleton glass-card">
                <div class="skeleton" style="width: 56px; height: 56px; border-radius: 50%" />
                <div class="skeleton-content">
                  <div class="skeleton" style="height: 18px; width: 60%" />
                  <div class="skeleton" style="height: 14px; width: 40%" />
                </div>
              </div>
            </div>

            <StateIndicator
              v-else-if="authorError"
              variant="error"
              :description="authorError"
              @action="searchAuthors"
            />

            <StateIndicator
              v-else-if="authors.length === 0"
              variant="empty"
              :description="$t('search.noAuthors', { query })"
            />

            <div v-else class="authors-grid">
              <article
                v-for="author in authors"
                :key="author.id"
                class="author-card glass-card"
                @click="goToAuthor(author.id)"
              >
                <img
                  v-if="author.avatar_url"
                  :src="normalizeAvatarUrl(author.avatar_url) || author.avatar_url"
                  :alt="author.name"
                  class="author-avatar"
                  loading="lazy"
                />
                <div v-else class="author-avatar author-placeholder">
                  <User :size="24" />
                </div>
                <div class="author-info">
                  <h3 class="author-name">{{ author.name }}</h3>
                  <p class="author-platform">
                    <component :is="getPlatformIcon(author.platform)" :size="12" />
                    {{ author.platform }}
                  </p>
                  <p class="author-posts">
                    {{ $t('author.postCount', { count: author.post_count }) }}
                  </p>
                </div>
              </article>
            </div>
          </template>
        </div>
      </div>

      <div v-else class="search-empty">
        <div class="empty-content">
          <Search :size="64" class="empty-icon" />
          <h2>{{ $t('search.emptyTitle') }}</h2>
          <p>{{ $t('search.emptyHint') }}</p>
          <div class="search-tips">
            <h3>{{ $t('search.tips.title') }}</h3>
            <ul>
              <li>{{ $t('search.tips.keyword') }}</li>
              <li>{{ $t('search.tips.author') }}</li>
              <li>{{ $t('search.tips.platform') }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import {
  Search,
  FileText,
  User,
  Globe,
  Youtube,
  Music2,
  Twitter,
  Instagram,
  LogIn,
  ArrowUpDown,
  ArrowLeft,
} from 'lucide-vue-next'
import { searchService, type AuthorListItem, type PostListItem } from '@/api'
import { normalizeAvatarUrl } from '@/api/userService'
import { useAuthStore } from '@/stores'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import PostCard from '@/components/business/PostCard.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import SearchBar from '@/components/business/SearchBar.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

const query = computed(() => (route.query['q'] as string) || '')
const activeTab = ref<'posts' | 'authors'>('posts')
const sortBy = ref<'relevance' | 'published_at' | 'view_count'>('relevance')
const sortOrder = ref<'asc' | 'desc'>('desc')
const currentPlatform = ref<'all' | 'youtube' | 'tiktok' | 'twitter' | 'instagram'>('all')

const results = ref<PostListItem[]>([])
const authors = ref<AuthorListItem[]>([])
const total = ref(0)
const authorTotal = ref(0)
const page = ref(1)
const pageSize = 20

const isLoading = ref(false)
const isLoadingMore = ref(false)
const isLoadingAuthors = ref(false)
const error = ref<string | null>(null)
const authorError = ref<string | null>(null)

const hasMore = computed(() => results.value.length < total.value)

// 检查是否可能有更多结果（未登录用户每平台限制15条）
const mayHaveMoreResults = computed(() => {
  if (isAuthenticated.value) return false
  // 如果结果数量接近限制，可能有更多
  return results.value.length >= 15 || total.value > results.value.length
})

const tabs = computed(() => [
  { id: 'posts' as const, label: t('search.tab.posts'), icon: FileText },
  { id: 'authors' as const, label: t('search.tab.authors'), icon: User },
])

const platformOptions = computed(() => [
  { value: 'all' as const, label: t('explore.allPlatforms'), icon: Globe },
  { value: 'youtube' as const, label: 'YouTube', icon: Youtube },
  { value: 'tiktok' as const, label: 'TikTok', icon: Music2 },
  { value: 'twitter' as const, label: 'X', icon: Twitter },
  { value: 'instagram' as const, label: 'Instagram', icon: Instagram },
])

const sortOptions = computed(() => [
  { value: 'relevance' as const, label: t('search.sort.relevance') },
  { value: 'published_at' as const, label: t('search.sort.date') },
  { value: 'view_count' as const, label: t('search.sort.views') },
])

function getPlatformIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case 'youtube':
      return Youtube
    case 'tiktok':
      return Music2
    case 'twitter':
      return Twitter
    case 'instagram':
      return Instagram
    default:
      return Globe
  }
}

function goBack() {
  router.back()
}

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
}

async function search() {
  if (!query.value) return

  isLoading.value = true
  error.value = null
  page.value = 1

  try {
    // 根据屏幕尺寸选择缩略图质量
    const getThumbnailQuality = () => {
      if (typeof window === 'undefined') return 'medium'
      const width = window.innerWidth
      if (width < 640) return 'medium'
      return 'large'
    }

    const platform = currentPlatform.value !== 'all' ? currentPlatform.value : undefined
    const res = await searchService.searchPosts({
      q: query.value,
      page: 1,
      page_size: pageSize,
      sort_by: sortBy.value,
      sort_order: sortOrder.value,
      thumbnail_quality: getThumbnailQuality() as const,
      ...(platform && { platform }),
    })
    results.value = res.items
    total.value = res.total
  } catch {
    error.value = t('common.error')
    results.value = []
    total.value = 0
  } finally {
    isLoading.value = false
  }
}

async function loadMore() {
  if (isLoadingMore.value || !hasMore.value) return

  isLoadingMore.value = true

  try {
    const getThumbnailQuality = () => {
      if (typeof window === 'undefined') return 'medium'
      const width = window.innerWidth
      if (width < 640) return 'medium'
      return 'large'
    }

    const nextPage = page.value + 1
    const platform = currentPlatform.value !== 'all' ? currentPlatform.value : undefined
    const res = await searchService.searchPosts({
      q: query.value,
      page: nextPage,
      page_size: pageSize,
      sort_by: sortBy.value,
      sort_order: sortOrder.value,
      thumbnail_quality: getThumbnailQuality() as const,
      ...(platform && { platform }),
    })
    results.value.push(...res.items)
    page.value = nextPage
    total.value = res.total
  } catch {
    // Silent fail for load more
  } finally {
    isLoadingMore.value = false
  }
}

async function searchAuthors() {
  if (!query.value) return

  isLoadingAuthors.value = true
  authorError.value = null

  try {
    const res = await searchService.searchAuthors({
      q: query.value,
      page: 1,
      page_size: 20,
    })
    authors.value = res.items
    authorTotal.value = res.total
  } catch {
    authorError.value = t('common.error')
    authors.value = []
    authorTotal.value = 0
  } finally {
    isLoadingAuthors.value = false
  }
}

function goToPost(postId: string, thumbnailSrc: string | null) {
  if (thumbnailSrc) {
    sessionStorage.setItem(`post-thumbnail-${postId}`, thumbnailSrc)
  }
  router.push(`/post/${postId}`)
}

function goToAuthor(authorId: string) {
  router.push({ name: 'author-detail', params: { id: authorId } })
}

function goToLogin() {
  router.push({ path: '/login', query: { redirect: route.fullPath } })
}

watch(query, () => {
  if (query.value) {
    search()
    searchAuthors()
  } else {
    results.value = []
    authors.value = []
    total.value = 0
    authorTotal.value = 0
  }
})

watch([sortBy, sortOrder], () => {
  if (query.value) {
    search()
  }
})

watch(currentPlatform, () => {
  if (query.value) {
    search()
  }
})

watch(activeTab, (tab) => {
  if (tab === 'authors' && authors.value.length === 0 && query.value) {
    searchAuthors()
  }
})

onMounted(() => {
  if (query.value) {
    search()
    searchAuthors()
  }
})
</script>

<style scoped>
.search-page {
  min-height: 100vh;
  padding: var(--spacing-3) 0;
}

.search-header {
  max-width: 560px;
  margin: 0 auto var(--spacing-3);
  text-align: center;
}

.search-header-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-3);
  position: relative;
}

.search-header .back-btn {
  position: absolute;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
  background: var(--glass-bg-subtle);
  border: 1px solid var(--glass-border);
  transition: all var(--transition-fast);
}

.search-header .back-btn:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

.search-title {
  font-size: var(--text-xl);
  margin: 0;
}

@media (min-width: 768px) {
  .search-title {
    font-size: var(--text-2xl);
  }
}

.search-bar-main {
  max-width: 100%;
}

.search-content {
  max-width: 1400px;
  margin: 0 auto;
}

.search-meta {
  margin-bottom: var(--spacing-4);
}

.search-query-info {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.search-query-info strong {
  color: var(--color-text);
}

.search-filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
  flex-wrap: wrap;
}

.filter-tabs {
  display: flex;
  gap: var(--spacing-1);
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.filter-tab:hover {
  background: var(--glass-bg-light);
  color: var(--color-text);
}

.filter-tab.active {
  background: var(--color-primary);
  color: var(--color-white);
}

.tab-count {
  padding: 0 var(--spacing-2);
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
}

.filter-options {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  flex-wrap: wrap;
}

.platform-filters {
  display: flex;
  gap: var(--spacing-1);
}

.platform-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  background: var(--glass-bg-subtle);
  border: 1px solid transparent;
  transition: all var(--transition-fast);
}

.platform-btn:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

.platform-btn.active {
  background: rgba(var(--color-primary-rgb), 0.15);
  color: var(--color-primary);
  border-color: rgba(var(--color-primary-rgb), 0.3);
}

.platform-label {
  display: none;
}

@media (min-width: 640px) {
  .platform-label {
    display: inline;
  }
}

.sort-select {
  padding: var(--spacing-2) var(--spacing-3);
  font-size: var(--text-sm);
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.sort-order-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--glass-bg-subtle);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.sort-order-btn:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

.sort-order-btn svg {
  transition: transform var(--transition-fast);
}

.sort-order-btn--asc svg {
  transform: rotate(180deg);
}

.login-hint {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  margin-top: var(--spacing-6);
  background: rgba(var(--color-primary-rgb), 0.05);
  border: 1px solid rgba(var(--color-primary-rgb), 0.15);
}

.login-hint-icon {
  color: var(--color-primary);
  flex-shrink: 0;
}

.login-hint-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  gap: var(--spacing-4);
  flex-wrap: wrap;
}

.login-hint-text {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.login-hint-btn {
  flex-shrink: 0;
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--text-sm);
}

.results-loading {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-4);
}

.result-skeleton,
.author-skeleton {
  padding: var(--spacing-4);
}

.author-skeleton {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.skeleton-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  flex: 1;
}

.result-skeleton .skeleton-content {
  margin-top: var(--spacing-3);
}

.posts-masonry {
  --masonry-columns: 2;
  --masonry-gap: var(--spacing-3);

  column-count: var(--masonry-columns);
  column-gap: var(--masonry-gap);
}

.posts-masonry > :deep(*) {
  break-inside: avoid;
  margin-bottom: var(--masonry-gap);
}

@media (min-width: 480px) {
  .posts-masonry {
    --masonry-columns: 2;
  }
}

@media (min-width: 768px) {
  .posts-masonry {
    --masonry-columns: 3;
  }
}

@media (min-width: 1024px) {
  .posts-masonry {
    --masonry-columns: 4;
  }
}

@media (min-width: 1400px) {
  .posts-masonry {
    --masonry-columns: 5;
  }
}

@media (min-width: 1800px) {
  .posts-masonry {
    --masonry-columns: 6;
  }
}

@media (min-width: 2200px) {
  .posts-masonry {
    --masonry-columns: 7;
  }
}

.authors-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-3);
}

@media (min-width: 640px) {
  .authors-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .authors-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1400px) {
  .authors-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (min-width: 1800px) {
  .authors-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

.author-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.author-card:hover {
  transform: translateY(-2px);
}

.author-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.author-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  color: var(--color-text-secondary);
}

.author-info {
  flex: 1;
  min-width: 0;
}

.author-name {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin: 0 0 var(--spacing-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author-platform {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-1);
}

.author-posts {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin: 0;
}

.search-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  text-align: center;
}

.empty-content {
  max-width: 400px;
}

.empty-icon {
  opacity: 0.3;
  margin-bottom: var(--spacing-4);
  color: var(--color-text-secondary);
}

.search-empty h2 {
  margin: 0 0 var(--spacing-2);
  font-size: var(--text-xl);
  color: var(--color-text);
}

.search-empty p {
  margin: 0 0 var(--spacing-6);
  color: var(--color-text-secondary);
}

.search-tips {
  text-align: left;
  padding: var(--spacing-4);
  background: var(--glass-bg-subtle);
  border-radius: var(--radius-lg);
}

.search-tips h3 {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin: 0 0 var(--spacing-2);
  color: var(--color-text);
}

.search-tips ul {
  margin: 0;
  padding-left: var(--spacing-4);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.search-tips li {
  margin-bottom: var(--spacing-1);
}

.search-tips li:last-child {
  margin-bottom: 0;
}

@media (max-width: 768px) {
  .search-filters {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-tabs {
    justify-content: center;
  }

  .filter-options {
    justify-content: space-between;
  }

  .sort-select {
    flex: 1;
  }
}
</style>
