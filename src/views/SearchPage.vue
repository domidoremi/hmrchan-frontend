<template>
  <div class="search-page">
    <div class="container">
      <header class="search-header page-hero search-hero">
        <div class="page-hero__content">
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
          <div v-if="!query" class="page-hero__meta">
            <span class="page-hero__note">{{ $t('search.tips.keyword') }}</span>
            <span class="page-hero__note">{{ $t('search.tips.author') }}</span>
            <span class="page-hero__note">{{ $t('search.tips.platform') }}</span>
          </div>
        </div>
      </header>

      <div v-if="query" class="search-content">
        <section class="search-overview page-toolbar">
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
                :aria-pressed="activeTab === tab.id"
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
                  :aria-pressed="currentPlatform === platform.value"
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
                  :aria-pressed="sortOrder === 'asc'"
                  :aria-label="
                    sortOrder === 'desc'
                      ? $t('search.sort.descending')
                      : $t('search.sort.ascending')
                  "
                  :title="
                    sortOrder === 'desc'
                      ? $t('search.sort.descending')
                      : $t('search.sort.ascending')
                  "
                  @click="toggleSortOrder"
                >
                  <AnimatedIcon name="explore" :fallback-icon="ArrowUpDown" size="sm" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <div class="search-results">
          <div v-if="isLoading && results.length === 0" class="results-loading">
            <PostCardSkeleton v-for="i in 6" :key="i" />
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
                <PostCard
                  v-for="post in results"
                  :key="post.id"
                  v-memo="getPostMemo(post)"
                  :post="post"
                  @click="goToPost"
                />
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
                v-memo="getAuthorMemo(author)"
                class="author-card glass-card"
                role="button"
                tabindex="0"
                @click="goToAuthor(author.id)"
                @keydown.enter.prevent="goToAuthor(author.id)"
                @keydown.space.prevent="goToAuthor(author.id)"
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
        <div class="empty-content empty-surface search-empty-surface">
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

        <section v-if="isAuthenticated" class="search-history-section glass-card">
          <div class="search-history-header">
            <div>
              <h2 class="search-history-title">{{ $t('search.history') }}</h2>
              <p class="search-history-hint">{{ $t('search.historyHint') }}</p>
            </div>

            <div class="search-history-actions">
              <button
                type="button"
                class="glass-button search-history-action"
                :disabled="isHistoryLoading || isHistoryMutating"
                @click="fetchSearchInsights"
              >
                <AnimatedIcon name="loading" :fallback-icon="RotateCcw" size="sm" />
                {{ $t('common.refresh') }}
              </button>
              <button
                v-if="searchHistory.length > 0"
                type="button"
                class="glass-button search-history-action"
                :disabled="isHistoryMutating"
                @click="clearSearchHistory"
              >
                <AnimatedIcon name="sparkle" :fallback-icon="Trash2" size="sm" />
                {{ $t('search.clearHistory') }}
              </button>
            </div>
          </div>

          <StateIndicator
            v-if="historyError"
            variant="error"
            :description="historyError"
            @action="fetchSearchInsights"
          />

          <div v-else class="search-history-layout">
            <section class="search-history-panel">
              <div class="search-history-panel__header">
                <AnimatedIcon name="explore" :fallback-icon="History" size="sm" />
                <h3>{{ $t('search.recentSearches') }}</h3>
              </div>

              <div v-if="isHistoryLoading" class="search-history-list search-history-list--loading">
                <div
                  v-for="item in 4"
                  :key="`history-skeleton-${item}`"
                  class="search-history-item search-history-item--skeleton"
                >
                  <Skeleton width="50%" height="14px" />
                  <Skeleton width="25%" height="12px" />
                </div>
              </div>

              <StateIndicator
                v-else-if="searchHistory.length === 0"
                variant="empty"
                :description="$t('search.historyEmpty')"
              />

              <div v-else class="search-history-list">
                <article v-for="item in searchHistory" :key="item.id" class="search-history-item">
                  <button
                    type="button"
                    class="search-history-item__main"
                    @click="runSearch(item.query)"
                  >
                    <span class="search-history-item__query">{{ item.query }}</span>
                    <span class="search-history-item__meta">
                      {{ formatHistoryTime(item.created_at) }}
                    </span>
                  </button>
                  <button
                    type="button"
                    class="search-history-item__delete"
                    :aria-label="$t('search.deleteHistoryItem')"
                    :title="$t('search.deleteHistoryItem')"
                    @click="deleteSearchHistoryItem(item.id)"
                  >
                    <AnimatedIcon name="sparkle" :fallback-icon="Trash2" size="sm" />
                  </button>
                </article>
              </div>
            </section>

            <section class="search-history-panel">
              <div class="search-history-panel__header">
                <AnimatedIcon name="sparkle" :fallback-icon="BarChart3" size="sm" />
                <h3>{{ $t('search.searchStats') }}</h3>
              </div>

              <div class="search-history-stats">
                <article class="search-history-stat glass-card">
                  <span class="search-history-stat__value">
                    {{ searchStats?.search_history_count ?? 0 }}
                  </span>
                  <span class="search-history-stat__label">
                    {{ $t('search.searchHistoryCount') }}
                  </span>
                </article>
                <article class="search-history-stat glass-card">
                  <span class="search-history-stat__value">
                    {{ searchStats?.browsing_history_count ?? 0 }}
                  </span>
                  <span class="search-history-stat__label">
                    {{ $t('search.browsingHistoryCount') }}
                  </span>
                </article>
              </div>

              <div class="search-history-trending">
                <h4>{{ $t('search.topSearches') }}</h4>
                <div v-if="topSearchQueries.length" class="search-history-tags">
                  <button
                    v-for="item in topSearchQueries"
                    :key="item.query"
                    type="button"
                    class="search-history-tag"
                    @click="runSearch(item.query)"
                  >
                    <span>#{{ item.query }}</span>
                    <span v-if="item.count" class="search-history-tag__count">{{
                      item.count
                    }}</span>
                  </button>
                </div>
                <p v-else class="search-history-empty-copy">
                  {{ $t('search.topSearchesEmpty') }}
                </p>
              </div>
            </section>
          </div>
        </section>

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
            <PostCardSkeleton v-for="i in 6" :key="`discover-skeleton-${i}`" />
          </div>

          <StateIndicator
            v-else-if="discoverError"
            variant="error"
            :description="discoverError"
            @action="fetchDiscoverPosts"
          />

          <StateIndicator v-else-if="discoverPosts.length === 0" variant="empty" />

          <div v-else class="posts-masonry discover-masonry">
            <PostCard
              v-for="post in discoverPosts"
              :key="post.id"
              v-memo="getPostMemo(post)"
              :post="post"
              @click="goToPost"
            />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'SearchPage' })

import { ref, computed, markRaw, watch, onMounted, onBeforeUnmount, onWatcherCleanup } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import {
  FileText,
  User,
  Globe,
  LogIn,
  ArrowUpDown,
  ArrowLeft,
  RotateCcw,
  History,
  BarChart3,
  Trash2,
} from 'lucide-vue-next'
import { IconYoutube, IconX, IconTiktok, IconInstagram } from '@/components/icons'
import {
  DEFAULT_PUBLIC_VISIBILITY_SCOPE,
  readPublicVisibilityHeaders,
  searchService,
  postService,
  type PostListItem,
  type AuthorListItem,
} from '@/api'
import { historyService, type HistoryStats, type SearchHistoryItem } from '@/api/historyService'
import { normalizeAvatarUrl } from '@/api/userService'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { usePreferredPageSize } from '@/composables/usePreferredPageSize'
import { useAuthStore, useToastStore } from '@/stores'
import { formatRelativeTime } from '@/utils/date'
import { storePostNavigationContext } from '@/utils/postNavigation'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import SearchBar from '@/components/business/SearchBar.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Select from '@/components/ui/Select.vue'
import PostCard from '@/components/business/PostCard.vue'
import PostCardSkeleton from '@/components/business/PostCardSkeleton.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { isAuthenticated } = storeToRefs(authStore)

const query = computed(() => (route.query['q'] as string) || '')
const activeTab = ref<'posts' | 'authors'>('posts')
const sortBy = ref<'relevance' | 'published_at' | 'view_count'>('relevance')
const sortOrder = ref<'asc' | 'desc'>('desc')
const currentPlatform = ref<'all' | 'youtube' | 'tiktok' | 'twitter' | 'instagram'>('all')
const searchControlKey = computed(
  () => `${sortBy.value}|${sortOrder.value}|${currentPlatform.value}`
)
const { debounced: debouncedSearchControlKey, cancel: cancelSearchControlDebounce } =
  useDebouncedRef(searchControlKey, 120)
let hasInitializedSearchControlWatcher = false

const results = ref<PostListItem[]>([])
const discoverPosts = ref<PostListItem[]>([])
const authors = ref<AuthorListItem[]>([])
const searchHistory = ref<SearchHistoryItem[]>([])
const searchStats = ref<HistoryStats | null>(null)
const total = ref(0)
const authorTotal = ref(0)
const page = ref(1)
const pageSize = usePreferredPageSize({ fallback: 20, min: 10, max: 50, mobileCap: 20 })
const discoverPageSize = computed(() => Math.min(12, Math.max(6, pageSize.value)))
const authorPageSize = computed(() => Math.min(pageSize.value, 20))

const isLoading = ref(false)
const isLoadingMore = ref(false)
const isLoadingAuthors = ref(false)
const isDiscoverLoading = ref(false)
const isHistoryLoading = ref(false)
const isHistoryMutating = ref(false)
const error = ref<string | null>(null)
const authorError = ref<string | null>(null)
const discoverError = ref<string | null>(null)
const historyError = ref<string | null>(null)
const searchVisibility = ref({ ...DEFAULT_PUBLIC_VISIBILITY_SCOPE })
let discoverRequestToken = 0
let postsRequestToken = 0
let authorRequestToken = 0
let historyRequestToken = 0
let discoverController: AbortController | null = null
let postsSearchController: AbortController | null = null
let postsLoadMoreController: AbortController | null = null
let authorsSearchController: AbortController | null = null
let lastRecordedSearchKey = ''

const hasMore = computed(() => results.value.length < total.value)
const topSearchQueries = computed(() => {
  const combined = new Map<string, number>()

  for (const item of searchStats.value?.top_searches ?? []) {
    combined.set(item.query, item.count)
  }

  for (const item of searchHistory.value) {
    if (!combined.has(item.query)) {
      combined.set(item.query, 0)
    }
  }

  return Array.from(combined.entries())
    .map(([queryText, count]) => ({ query: queryText, count }))
    .slice(0, 5)
})

// 游客搜索仍受统一公开可见域限制，避免再依赖旧的“15条”前端硬编码。
const mayHaveMoreResults = computed(() => {
  if (isAuthenticated.value || results.value.length === 0) return false

  const visibleLimit = searchVisibility.value.limit
  if (searchVisibility.value.tier === 'guest' && visibleLimit !== null) {
    return total.value >= visibleLimit || results.value.length >= visibleLimit
  }

  return total.value > results.value.length
})

const tabIcons = {
  posts: markRaw(FileText),
  authors: markRaw(User),
} as const

const tabs = computed(() => [
  { id: 'posts' as const, label: t('search.tab.posts'), icon: tabIcons.posts },
  { id: 'authors' as const, label: t('search.tab.authors'), icon: tabIcons.authors },
])

const platformIcons = {
  all: markRaw(Globe),
  youtube: markRaw(IconYoutube),
  tiktok: markRaw(IconTiktok),
  twitter: markRaw(IconX),
  instagram: markRaw(IconInstagram),
} as const

const platformOptions = computed(() => [
  { value: 'all' as const, label: t('explore.allPlatforms'), icon: platformIcons.all },
  { value: 'youtube' as const, label: 'YouTube', icon: platformIcons.youtube },
  { value: 'tiktok' as const, label: 'TikTok', icon: platformIcons.tiktok },
  { value: 'twitter' as const, label: 'X', icon: platformIcons.twitter },
  { value: 'instagram' as const, label: 'Instagram', icon: platformIcons.instagram },
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

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException
    ? err.name === 'AbortError'
    : err instanceof Error && err.name === 'AbortError'
}

function getPlatformIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case 'youtube':
      return IconYoutube
    case 'tiktok':
      return IconTiktok
    case 'twitter':
      return IconX
    case 'instagram':
      return IconInstagram
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

function abortDiscoverRequest() {
  discoverController?.abort()
  discoverController = null
}

function abortPostsSearchRequest() {
  postsSearchController?.abort()
  postsSearchController = null
}

function abortPostsLoadMoreRequest() {
  postsLoadMoreController?.abort()
  postsLoadMoreController = null
}

function abortAuthorsSearchRequest() {
  authorsSearchController?.abort()
  authorsSearchController = null
}

async function fetchDiscoverPosts(signal?: AbortSignal) {
  const requestToken = ++discoverRequestToken

  if (isDiscoverLoading.value) return
  abortDiscoverRequest()
  const controller = signal ? null : new AbortController()
  if (controller) {
    discoverController = controller
  }
  const requestSignal = signal ?? controller?.signal
  isDiscoverLoading.value = true
  discoverError.value = null

  try {
    const res = await postService.listPosts(
      {
        page: 1,
        page_size: discoverPageSize.value,
        sort_by: 'published_at',
        sort_order: 'desc',
        thumbnail_quality: getThumbnailQuality(),
      },
      requestSignal ? { signal: requestSignal } : undefined
    )
    if (requestSignal?.aborted || requestToken !== discoverRequestToken) return
    discoverPosts.value = shufflePosts(res.items)
  } catch (err) {
    if (requestSignal?.aborted || isAbortError(err) || requestToken !== discoverRequestToken) return
    discoverError.value = t('common.error')
    discoverPosts.value = []
  } finally {
    if (requestToken === discoverRequestToken) {
      isDiscoverLoading.value = false
      if (controller && discoverController === controller) {
        discoverController = null
      }
    }
  }
}

async function search(signal?: AbortSignal) {
  if (!query.value) return

  abortPostsSearchRequest()
  abortPostsLoadMoreRequest()
  const controller = signal ? null : new AbortController()
  if (controller) {
    postsSearchController = controller
  }
  const requestSignal = signal ?? controller?.signal
  const requestToken = ++postsRequestToken
  isLoading.value = true
  isLoadingMore.value = false
  error.value = null
  page.value = 1

  try {
    const platform = currentPlatform.value !== 'all' ? currentPlatform.value : undefined
    const res = await searchService.searchPosts(
      {
        q: query.value,
        page: 1,
        page_size: pageSize.value,
        sort_by: sortBy.value,
        sort_order: sortOrder.value,
        thumbnail_quality: getThumbnailQuality(),
        ...(platform && { platform }),
      },
      {
        ...(requestSignal ? { signal: requestSignal } : undefined),
        onResponseHeaders: (headers) => {
          searchVisibility.value = readPublicVisibilityHeaders(headers)
        },
      }
    )
    if (requestSignal?.aborted || requestToken !== postsRequestToken) return
    results.value = res.items
    total.value = res.total
    recordSearchHistory(res.total)
  } catch (err) {
    if (requestSignal?.aborted || isAbortError(err) || requestToken !== postsRequestToken) return
    error.value = t('common.error')
    results.value = []
    total.value = 0
  } finally {
    if (requestToken === postsRequestToken) {
      isLoading.value = false
      if (controller && postsSearchController === controller) {
        postsSearchController = null
      }
    }
  }
}

async function loadMore() {
  if (isLoadingMore.value || !hasMore.value) return

  abortPostsLoadMoreRequest()
  const controller = new AbortController()
  postsLoadMoreController = controller
  const requestToken = postsRequestToken
  isLoadingMore.value = true

  try {
    const nextPage = page.value + 1
    const platform = currentPlatform.value !== 'all' ? currentPlatform.value : undefined
    const res = await searchService.searchPosts(
      {
        q: query.value,
        page: nextPage,
        page_size: pageSize.value,
        sort_by: sortBy.value,
        sort_order: sortOrder.value,
        thumbnail_quality: getThumbnailQuality(),
        ...(platform && { platform }),
      },
      {
        signal: controller.signal,
        onResponseHeaders: (headers) => {
          searchVisibility.value = readPublicVisibilityHeaders(headers)
        },
      }
    )
    if (controller.signal.aborted || requestToken !== postsRequestToken) return
    results.value.push(...res.items)
    page.value = nextPage
    total.value = res.total
  } catch (err) {
    if (controller.signal.aborted || isAbortError(err) || requestToken !== postsRequestToken) return
    // Silent fail for load more
  } finally {
    if (requestToken === postsRequestToken) {
      isLoadingMore.value = false
    }
    if (postsLoadMoreController === controller) {
      postsLoadMoreController = null
    }
  }
}

async function searchAuthors(signal?: AbortSignal) {
  if (!query.value) return

  abortAuthorsSearchRequest()
  const controller = signal ? null : new AbortController()
  if (controller) {
    authorsSearchController = controller
  }
  const requestSignal = signal ?? controller?.signal
  const requestToken = ++authorRequestToken
  isLoadingAuthors.value = true
  authorError.value = null

  try {
    const res = await searchService.searchAuthors(
      {
        q: query.value,
        page: 1,
        page_size: authorPageSize.value,
      },
      requestSignal ? { signal: requestSignal } : undefined
    )
    if (requestSignal?.aborted || requestToken !== authorRequestToken) return
    authors.value = res.items
    authorTotal.value = res.total
  } catch (err) {
    if (requestSignal?.aborted || isAbortError(err) || requestToken !== authorRequestToken) return
    authorError.value = t('common.error')
    authors.value = []
    authorTotal.value = 0
  } finally {
    if (requestToken === authorRequestToken) {
      isLoadingAuthors.value = false
      if (controller && authorsSearchController === controller) {
        authorsSearchController = null
      }
    }
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

function formatHistoryTime(value: string) {
  return formatRelativeTime(value, t)
}

function runSearch(queryText: string) {
  void router.push({ name: 'search', query: { q: queryText } })
}

function buildSearchRecordKey() {
  return query.value.trim().toLowerCase()
}

function recordSearchHistory(resultCount: number) {
  if (!isAuthenticated.value) return

  const normalizedQuery = buildSearchRecordKey()
  if (!normalizedQuery || normalizedQuery === lastRecordedSearchKey) {
    return
  }

  const filters: Record<string, unknown> = {
    tab: activeTab.value,
    sort_by: sortBy.value,
    sort_order: sortOrder.value,
  }

  if (currentPlatform.value !== 'all') {
    filters['platform'] = currentPlatform.value
  }

  lastRecordedSearchKey = normalizedQuery
  void historyService
    .recordSearch(query.value.trim(), activeTab.value, resultCount, filters)
    .catch(() => {
      if (lastRecordedSearchKey === normalizedQuery) {
        lastRecordedSearchKey = ''
      }
    })
}

async function fetchSearchInsights() {
  if (!isAuthenticated.value || query.value) return

  const requestToken = ++historyRequestToken
  isHistoryLoading.value = true
  historyError.value = null

  try {
    const [historyResponse, statsResponse] = await Promise.all([
      historyService.getSearchHistory(pageSize.value, 0),
      historyService.getStats(),
    ])

    if (requestToken !== historyRequestToken) return
    searchHistory.value = historyResponse.items
    searchStats.value = statsResponse
  } catch {
    if (requestToken !== historyRequestToken) return
    searchHistory.value = []
    searchStats.value = null
    historyError.value = t('search.historyLoadFailed')
  } finally {
    if (requestToken === historyRequestToken) {
      isHistoryLoading.value = false
    }
  }
}

async function deleteSearchHistoryItem(historyId: string) {
  if (isHistoryMutating.value) return

  isHistoryMutating.value = true
  try {
    await historyService.deleteSearchHistory(historyId)
    await fetchSearchInsights()
  } catch {
    toastStore.error(t('common.error'))
  } finally {
    isHistoryMutating.value = false
  }
}

async function clearSearchHistory() {
  if (isHistoryMutating.value) return

  isHistoryMutating.value = true
  try {
    await historyService.clearSearchHistory()
    searchHistory.value = []
    await fetchSearchInsights()
    toastStore.success(t('search.historyCleared'))
  } catch {
    toastStore.error(t('common.error'))
  } finally {
    isHistoryMutating.value = false
  }
}

function getPostMemo(post: PostListItem) {
  return [
    post.id,
    post.updated_at ?? post.created_at ?? post.published_at ?? '',
    post.view_count ?? 0,
    post.like_count ?? 0,
    post.comment_count ?? 0,
    post.thumbnail_url ?? '',
  ]
}

function getAuthorMemo(author: AuthorListItem) {
  return [
    author.id,
    author.updated_at ?? author.created_at ?? '',
    author.post_count ?? 0,
    author.follower_count ?? 0,
    author.avatar_url ?? '',
    author.display_name ?? author.name ?? author.username,
  ]
}

watch(query, (nextQuery) => {
  lastRecordedSearchKey = ''
  searchVisibility.value = { ...DEFAULT_PUBLIC_VISIBILITY_SCOPE }
  const controller = new AbortController()
  onWatcherCleanup(() => controller.abort())
  abortPostsLoadMoreRequest()

  if (nextQuery) {
    discoverRequestToken += 1
    abortDiscoverRequest()
    isDiscoverLoading.value = false
    discoverError.value = null
    void search(controller.signal)
    void searchAuthors(controller.signal)
  } else {
    postsRequestToken += 1
    authorRequestToken += 1
    abortPostsSearchRequest()
    abortAuthorsSearchRequest()
    isLoading.value = false
    isLoadingMore.value = false
    isLoadingAuthors.value = false
    results.value = []
    authors.value = []
    total.value = 0
    authorTotal.value = 0
    activeTab.value = 'posts'
    void fetchDiscoverPosts(controller.signal)
    void fetchSearchInsights()
  }
})

watch(debouncedSearchControlKey, () => {
  if (!hasInitializedSearchControlWatcher) {
    hasInitializedSearchControlWatcher = true
    return
  }
  const controller = new AbortController()
  onWatcherCleanup(() => controller.abort())
  if (query.value) {
    void search(controller.signal)
  }
})

watch(activeTab, (tab) => {
  const controller = new AbortController()
  onWatcherCleanup(() => controller.abort())
  if (tab === 'authors' && authors.value.length === 0 && query.value) {
    void searchAuthors(controller.signal)
  }
})

watch(pageSize, () => {
  const controller = new AbortController()
  onWatcherCleanup(() => controller.abort())

  if (query.value) {
    void search(controller.signal)
    if (activeTab.value === 'authors') {
      void searchAuthors(controller.signal)
    }
    return
  }

  void fetchDiscoverPosts(controller.signal)
  void fetchSearchInsights()
})

watch(isAuthenticated, (authenticated) => {
  if (!authenticated) {
    searchHistory.value = []
    searchStats.value = null
    historyError.value = null
    return
  }

  if (!query.value) {
    void fetchSearchInsights()
  }
})

onMounted(() => {
  if (query.value) {
    search()
    searchAuthors()
  } else {
    fetchDiscoverPosts()
    if (isAuthenticated.value) {
      void fetchSearchInsights()
    }
  }
})

onBeforeUnmount(() => {
  cancelSearchControlDebounce()
  postsRequestToken += 1
  authorRequestToken += 1
  discoverRequestToken += 1
  abortPostsSearchRequest()
  abortPostsLoadMoreRequest()
  abortAuthorsSearchRequest()
  abortDiscoverRequest()
  isLoading.value = false
  isLoadingMore.value = false
  isLoadingAuthors.value = false
  isDiscoverLoading.value = false
  isHistoryLoading.value = false
})
</script>

<style scoped>
.search-page {
  min-height: 100svh;
  min-height: 100dvh;
  padding: var(--spacing-3) 0;
}

.search-header {
  max-width: min(100%, 52rem);
  margin: 0 auto var(--spacing-4);
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
  display: grid;
  gap: var(--spacing-4);
}

.search-meta {
  margin-bottom: 0;
}

.search-query-info {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.search-query-info strong {
  color: var(--color-text);
}

.search-overview {
  align-items: center;
}

.search-filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: 0;
  flex-wrap: wrap;
  flex: 1;
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

.author-card:focus-visible {
  outline: none;
  transform: translateY(-2px);
  box-shadow:
    var(--shadow-md),
    0 0 0 2px rgba(var(--color-primary-rgb), 0.35);
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
  max-width: min(100%, 42rem);
  margin: 0 auto;
}

.search-empty-surface {
  text-align: center;
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
  display: grid;
  gap: var(--spacing-2);
}

.search-tips li {
  margin-bottom: var(--spacing-1);
}

.search-tips li:last-child {
  margin-bottom: 0;
}

.search-history-section {
  width: min(100%, var(--container-max-fluid));
  display: grid;
  gap: var(--spacing-4);
  padding: clamp(1rem, 2vw, 1.5rem);
  text-align: left;
}

.search-history-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-3);
  flex-wrap: wrap;
}

.search-history-title {
  margin: 0;
  font-size: var(--text-lg);
}

.search-history-hint {
  margin: var(--spacing-1) 0 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.search-history-actions {
  display: flex;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

.search-history-action {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
}

.search-history-layout {
  display: grid;
  gap: var(--spacing-3);
}

.search-history-panel {
  display: grid;
  gap: var(--spacing-3);
  padding: clamp(0.875rem, 2vw, 1rem);
  border-radius: var(--radius-xl);
  background: var(--glass-bg-subtle);
  border: 1px solid var(--glass-border);
}

.search-history-panel__header {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.search-history-panel__header h3,
.search-history-trending h4 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.search-history-list {
  display: grid;
  gap: var(--spacing-2);
}

.search-history-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-lg);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
}

.search-history-item--skeleton {
  justify-content: space-between;
}

.search-history-item__main {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 0.125rem;
  text-align: left;
}

.search-history-item__query {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-history-item__meta {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.search-history-item__delete {
  width: 1.75rem;
  height: 1.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  color: var(--color-text-tertiary);
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}

.search-history-item__delete:hover {
  background: rgba(var(--color-error-rgb, 239, 68, 68), 0.1);
  color: var(--color-error);
}

.search-history-stats {
  display: grid;
  gap: var(--spacing-2);
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.search-history-stat {
  display: grid;
  gap: 0.25rem;
  padding: var(--spacing-3);
}

.search-history-stat__value {
  font-size: clamp(1.125rem, 3vw, 1.5rem);
  font-weight: var(--font-bold);
}

.search-history-stat__label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.search-history-trending {
  display: grid;
  gap: var(--spacing-2);
}

.search-history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.search-history-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: 0.375rem 0.75rem;
  border-radius: var(--radius-full);
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--color-primary);
  font-size: var(--text-xs);
}

.search-history-tag__count {
  color: var(--color-text-secondary);
}

.search-history-empty-copy {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
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

  .search-history-stats {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 960px) {
  .search-history-layout {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  }
}
</style>
