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
            <AnimatedIcon name="explore" :fallback-icon="ArrowLeft" size="md" />
          </button>
          <h1 class="search-title">{{ $t('search.title') }}</h1>
        </div>
        <SearchBar class="search-bar-main" />
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
              <AnimatedIcon
                :name="tab.id === 'posts' ? 'search' : 'user'"
                :fallback-icon="tab.icon"
                size="sm"
                :active="activeTab === tab.id"
              />
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
                <AnimatedIcon
                  :name="platform.value === 'all' ? 'explore' : 'sparkle'"
                  :fallback-icon="platform.icon"
                  size="sm"
                  :active="currentPlatform === platform.value"
                />
                <span class="platform-label">{{ platform.label }}</span>
              </button>
            </div>

            <div v-if="activeTab === 'posts'" class="sort-controls">
              <Select v-model="sortBy" class="sort-select">
                <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </Select>
              <button
                type="button"
                class="sort-order-btn"
                :class="{ 'sort-order-btn--asc': sortOrder === 'asc' }"
                :title="
                  sortOrder === 'desc' ? $t('search.sort.descending') : $t('search.sort.ascending')
                "
                @click="toggleSortOrder"
              >
                <AnimatedIcon name="explore" :fallback-icon="ArrowUpDown" size="sm" />
              </button>
            </div>
          </div>
        </div>

        <div class="search-results">
          <div v-if="isLoading && results.length === 0" class="results-loading">
            <div v-for="i in 6" :key="i" class="result-skeleton glass-card">
              <Skeleton variant="image" />
              <div class="skeleton-content">
                <Skeleton width="80%" height="18px" />
                <Skeleton width="50%" height="14px" />
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
              <AnimatedIcon name="user" :fallback-icon="LogIn" size="md" class="login-hint-icon" />
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
                <Skeleton variant="avatar" width="56px" height="56px" />
                <div class="skeleton-content">
                  <Skeleton width="60%" height="18px" />
                  <Skeleton width="40%" height="14px" />
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
                role="button"
                tabindex="0"
                @click="goToAuthor(author.id)"
                @keydown.enter="goToAuthor(author.id)"
              >
                <img
                  v-if="author.avatar_url"
                  :src="normalizeAvatarUrl(author.avatar_url) || author.avatar_url"
                  :alt="author.display_name || author.name"
                  class="author-avatar"
                  loading="lazy"
                />
                <div v-else class="author-avatar author-placeholder">
                  <AnimatedIcon name="user" :fallback-icon="User" size="lg" />
                </div>
                <div class="author-info">
                  <h3 class="author-name">{{ author.display_name || author.name }}</h3>
                  <p class="author-platform">
                    <AnimatedIcon
                      name="explore"
                      :fallback-icon="getPlatformIcon(author.platform)"
                      size="sm"
                    />
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

        <section class="discover-section">
          <div class="discover-header">
            <div>
              <h2 class="discover-title">{{ $t('search.discoverTitle') }}</h2>
              <p class="discover-subtitle">{{ $t('search.discoverHint') }}</p>
            </div>
            <button
              type="button"
              class="discover-refresh glass-button"
              :disabled="isDiscoverLoading"
              @click="fetchDiscoverPosts"
            >
              <AnimatedIcon name="loading" :fallback-icon="RotateCcw" size="sm" />
              <span>{{ $t('common.refresh') }}</span>
            </button>
          </div>

          <div v-if="isDiscoverLoading" class="results-loading">
            <div v-for="i in 6" :key="`discover-skeleton-${i}`" class="result-skeleton glass-card">
              <Skeleton variant="image" />
              <div class="skeleton-content">
                <Skeleton width="80%" height="18px" />
                <Skeleton width="50%" height="14px" />
              </div>
            </div>
          </div>

          <StateIndicator
            v-else-if="discoverError"
            variant="error"
            :description="discoverError"
            @action="fetchDiscoverPosts"
          />

          <StateIndicator v-else-if="discoverPosts.length === 0" variant="empty" />

          <div v-else class="posts-masonry discover-masonry">
            <PostCard v-for="post in discoverPosts" :key="post.id" :post="post" @click="goToPost" />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'SearchPage' })

import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import {
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
  RotateCcw,
} from 'lucide-vue-next'
import { searchService, postService, type PostListItem, type AuthorListItem } from '@/api'
import { normalizeAvatarUrl } from '@/api/userService'
import { useAuthStore } from '@/stores'
import { storePostNavigationContext } from '@/utils/postNavigation'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import SearchBar from '@/components/business/SearchBar.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Select from '@/components/ui/Select.vue'
import PostCard from '@/components/business/PostCard.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

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
const discoverPosts = ref<PostListItem[]>([])
const authors = ref<AuthorListItem[]>([])
const total = ref(0)
const authorTotal = ref(0)
const page = ref(1)
const pageSize = 20
const discoverPageSize = 12

const isLoading = ref(false)
const isLoadingMore = ref(false)
const isLoadingAuthors = ref(false)
const isDiscoverLoading = ref(false)
const error = ref<string | null>(null)
const authorError = ref<string | null>(null)
const discoverError = ref<string | null>(null)

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

const getThumbnailQuality = (): 'medium' | 'large' => {
  if (typeof window === 'undefined') return 'medium'
  const width = window.innerWidth
  if (width < 640) return 'medium'
  return 'large'
}

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
function shufflePosts(items: PostListItem[]) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

async function fetchDiscoverPosts() {
  if (isDiscoverLoading.value) return
  isDiscoverLoading.value = true
  discoverError.value = null

  try {
    const res = await postService.listPosts({
      page: 1,
      page_size: discoverPageSize,
      sort_by: 'published_at',
      sort_order: 'desc',
      thumbnail_quality: getThumbnailQuality(),
    })
    discoverPosts.value = shufflePosts(res.items)
  } catch {
    discoverError.value = t('common.error')
    discoverPosts.value = []
  } finally {
    isDiscoverLoading.value = false
  }
}

async function search() {
  if (!query.value) return

  isLoading.value = true
  error.value = null
  page.value = 1

  try {
    const platform = currentPlatform.value !== 'all' ? currentPlatform.value : undefined
    const res = await searchService.searchPosts({
      q: query.value,
      page: 1,
      page_size: pageSize,
      sort_by: sortBy.value,
      sort_order: sortOrder.value,
      thumbnail_quality: getThumbnailQuality(),
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
    const nextPage = page.value + 1
    const platform = currentPlatform.value !== 'all' ? currentPlatform.value : undefined
    const res = await searchService.searchPosts({
      q: query.value,
      page: nextPage,
      page_size: pageSize,
      sort_by: sortBy.value,
      sort_order: sortOrder.value,
      thumbnail_quality: getThumbnailQuality(),
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
  const contextPosts = results.value.length > 0 ? results.value : discoverPosts.value
  storePostNavigationContext(contextPosts, postId, 'search')
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
    activeTab.value = 'posts'
    fetchDiscoverPosts()
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
  } else {
    fetchDiscoverPosts()
  }
})
</script>

<style scoped>
.search-page {
  min-height: 100svh;
  min-height: 100dvh;
  padding: var(--spacing-3) 0;
}

.search-header {
  max-width: min(90vw, 35rem);
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
  width: 2.25rem;
  height: 2.25rem;
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
  max-width: var(--container-max-fluid);
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
  color: var(--color-on-primary);
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
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.platform-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.platform-btn:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
  transform: translateY(-2px);
}

.platform-btn.active {
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* All Platforms - 简约主色 */
.platform-btn:nth-child(1).active {
  background: rgba(var(--color-accent-rgb), 0.15);
  color: var(--color-accent);
  border-color: rgba(var(--color-accent-rgb), 0.4);
}

.platform-btn:nth-child(1).active::before {
  background: radial-gradient(
    circle at 50% 50%,
    rgba(var(--color-accent-rgb), 0.3),
    transparent 70%
  );
  opacity: 1;
  animation: platform-pulse 2s ease-in-out infinite;
}

/* YouTube - 红色 */
.platform-btn:nth-child(2).active {
  background: linear-gradient(135deg, rgba(255, 0, 51, 0.15), rgba(255, 68, 68, 0.1));
  color: #ff0033;
  border-color: rgba(255, 0, 51, 0.4);
}

.platform-btn:nth-child(2).active::before {
  background: radial-gradient(circle at 50% 50%, rgba(255, 0, 51, 0.3), transparent 70%);
  opacity: 1;
  animation: platform-pulse-youtube 1.5s ease-in-out infinite;
}

/* TikTok - 青色渐变 */
.platform-btn:nth-child(3).active {
  background: linear-gradient(135deg, rgba(0, 242, 234, 0.15), rgba(255, 0, 80, 0.1));
  color: #00f2ea;
  border-color: rgba(0, 242, 234, 0.4);
}

.platform-btn:nth-child(3).active::before {
  background: linear-gradient(45deg, rgba(0, 242, 234, 0.3), rgba(255, 0, 80, 0.2));
  opacity: 1;
  animation: platform-pulse-tiktok 1.2s ease-in-out infinite;
}

/* X/Twitter - 蓝色 */
.platform-btn:nth-child(4).active {
  background: linear-gradient(135deg, rgba(29, 155, 240, 0.2), rgba(29, 155, 240, 0.1));
  color: #1d9bf0;
  border-color: rgba(29, 155, 240, 0.4);
}

.platform-btn:nth-child(4).active::before {
  background: radial-gradient(circle at 30% 30%, rgba(29, 155, 240, 0.4), transparent 60%);
  opacity: 1;
  animation: platform-pulse-twitter 2.5s ease-in-out infinite;
}

/* Instagram - 渐变紫红 */
.platform-btn:nth-child(5).active {
  background: linear-gradient(135deg, rgba(225, 48, 108, 0.15), rgba(131, 58, 180, 0.1));
  color: #e1306c;
  border-color: rgba(225, 48, 108, 0.4);
}

.platform-btn:nth-child(5).active::before {
  background: linear-gradient(
    45deg,
    rgba(252, 175, 69, 0.25),
    rgba(225, 48, 108, 0.3),
    rgba(131, 58, 180, 0.25)
  );
  opacity: 1;
  animation: platform-pulse-instagram 3s ease-in-out infinite;
}

@keyframes platform-pulse {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}

@keyframes platform-pulse-youtube {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 0.9;
  }
}

@keyframes platform-pulse-tiktok {
  0%,
  100% {
    opacity: 0.5;
    background-position: 0% 50%;
  }
  50% {
    opacity: 0.9;
    background-position: 100% 50%;
  }
}

@keyframes platform-pulse-twitter {
  0%,
  100% {
    opacity: 0.4;
    transform: translateX(-10%) translateY(-10%);
  }
  50% {
    opacity: 0.8;
    transform: translateX(10%) translateY(10%);
  }
}

@keyframes platform-pulse-instagram {
  0%,
  100% {
    opacity: 0.5;
    filter: hue-rotate(0deg);
  }
  50% {
    opacity: 0.9;
    filter: hue-rotate(15deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .platform-btn::before {
    animation: none !important;
  }
  .platform-btn:hover,
  .platform-btn.active {
    transform: none;
  }
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
  min-width: 11.25rem;
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
  width: 2.25rem;
  height: 2.25rem;
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
  width: 3rem;
  height: 3rem;
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
  justify-content: flex-start;
  gap: var(--spacing-6);
  min-height: 50dvh;
  text-align: center;
}

.empty-content {
  max-width: min(90vw, 25rem);
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

.discover-section {
  width: 100%;
}

.discover-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-3);
  flex-wrap: wrap;
  text-align: left;
}

.discover-title {
  margin: 0 0 var(--spacing-1);
  font-size: var(--text-lg);
  color: var(--color-text);
}

.discover-subtitle {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.discover-refresh {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-2) var(--spacing-3);
  font-size: var(--text-xs);
}

.discover-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.discover-masonry {
  margin-bottom: var(--spacing-4);
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
