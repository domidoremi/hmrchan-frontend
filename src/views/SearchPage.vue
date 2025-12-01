<template>
  <MainLayout>
    <div class="search-page">
      <header class="search-header glass-card">
        <div class="search-header-text">
          <h1 class="page-title">Search</h1>
          <p class="page-subtitle">{{ $t('search.placeholder') }}</p>
        </div>
        <SearchBar @search="handleSearch" />
      </header>

      <div class="search-tabs glass-card">
        <button type="button" :class="['tab-button', { active: activeTab === 'posts' }]" @click="switchTab('posts')">
          {{ $t('nav.posts') }}
        </button>
        <button type="button" :class="['tab-button', { active: activeTab === 'authors' }]"
          @click="switchTab('authors')">
          {{ $t('nav.authors') }}
        </button>
      </div>

      <section v-if="!hasQuery" class="search-empty">
        <p>{{ $t('search.placeholder') }}</p>
      </section>

      <section v-else class="search-results-wrapper">
        <!-- Posts Tab -->
        <div v-if="activeTab === 'posts'" class="results-section glass-card">
          <div v-if="loadingPosts" class="loading-state reduce-motion">
            <div class="spinner spinner-md"></div>
            <span>{{ $t('search.searching') }}</span>
          </div>

          <div v-else-if="posts.length > 0">
            <p v-if="isPostsOffline" class="offline-hint">
              {{ $t('offline.usingCache') }}
            </p>

            <InfinitePostGrid :items="posts" :loading="loadingPosts" :has-more="postsHasMore"
              :is-loading-more="loadingPosts && posts.length > 0" @load-more="handlePostsLoadMore" />
          </div>

          <div v-else class="empty-state glass-card">
            <p>{{ $t('search.noResults') }}</p>
            <p class="hint">{{ $t('search.tryDifferent') }}</p>
          </div>
        </div>

        <!-- Authors Tab -->
        <div v-else class="results-section glass-card">
          <div v-if="loadingAuthors && authors.length === 0" class="loading-state reduce-motion">
            <div class="spinner spinner-md"></div>
            <span>{{ $t('search.searching') }}</span>
          </div>

          <div v-else-if="authors.length > 0" class="results-list authors-list">
            <div v-for="author in authors" :key="author.id" class="author-item glass-card">
              <div class="author-avatar">
                <img v-if="author.avatar_url" :src="author.avatar_url" :alt="author.name" />
                <div v-else class="avatar-placeholder">
                  {{ author.name?.charAt(0) || '?' }}
                </div>
              </div>
              <div class="author-info">
                <div class="author-name-row">
                  <span class="author-name">{{ author.name }}</span>
                  <span class="author-username">@{{ author.username }}</span>
                </div>
                <div class="author-meta">
                  <span v-if="author.platform" class="author-platform">{{ author.platform }}</span>
                  <span v-if="author.follower_count !== null" class="author-followers">
                    {{ author.follower_count }} followers
                  </span>
                </div>
              </div>
              <a v-if="author.profile_url" :href="author.profile_url" class="author-link" target="_blank"
                rel="noopener noreferrer">
                {{ $t('author.viewOriginal') }}
              </a>
            </div>

            <!-- Load More Trigger for Authors -->
            <div ref="authorsLoadMoreTrigger" class="load-more-trigger">
              <div v-if="loadingAuthors" class="spinner spinner-sm"></div>
            </div>
          </div>

          <div v-else class="empty-state glass-card">
            <p>{{ $t('search.noResults') }}</p>
            <p class="hint">{{ $t('search.tryDifferent') }}</p>
          </div>
        </div>
      </section>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useIntersectionObserver } from '@vueuse/core'

import MainLayout from '@/components/layout/MainLayout.vue'
import SearchBar from '@/components/business/SearchBar.vue'
import InfinitePostGrid from '@/components/business/InfinitePostGrid.vue'

import services from '@/api/services'
import type { Post, AuthorListItem, PaginatedResponse } from '@/types'
import { indexedDB } from '@/utils/storage'
import { fetchWithFallback } from '@/utils/cache'
import { withLogging } from '@/utils/error'

const route = useRoute()
const router = useRouter()

const activeTab = ref<'posts' | 'authors'>(route.query.tab === 'authors' ? 'authors' : 'posts')
const query = ref<string>(
  typeof route.query.q === 'string'
    ? route.query.q
    : Array.isArray(route.query.q)
      ? route.query.q[0] || ''
      : '',
)

const posts = ref<Post[]>([])
const authors = ref<AuthorListItem[]>([])

const postsPage = ref(1)
const postsTotalPages = ref(0)
const authorsPage = ref(1)
const authorsTotalPages = ref(0)

const postsPageSize = 20
const authorsPageSize = 20

const loadingPosts = ref(false)
const loadingAuthors = ref(false)
const isPostsOffline = ref(false)

const hasQuery = computed(() => query.value.trim().length > 0)

const postsHasMore = computed(() => postsPage.value < postsTotalPages.value)
const authorsHasMore = computed(() => authorsPage.value < authorsTotalPages.value)

// Authors Infinite Scroll Trigger
const authorsLoadMoreTrigger = ref<HTMLElement | null>(null)
useIntersectionObserver(
  authorsLoadMoreTrigger,
  (entries) => {
    const entry = entries[0]
    if (entry && entry.isIntersecting && authorsHasMore.value && !loadingAuthors.value) {
      handleAuthorsLoadMore()
    }
  },
  { rootMargin: '200px' }
)

const syncRoute = () => {
  const q = query.value.trim()
  const tab = activeTab.value

  const nextQuery: Record<string, string> = {}
  if (q) nextQuery.q = q
  nextQuery.tab = tab

  router.replace({ path: '/search', query: nextQuery })
}

const loadPosts = async (append = false) => {
  if (!hasQuery.value) {
    posts.value = []
    postsTotalPages.value = 0
    isPostsOffline.value = false
    return
  }

  loadingPosts.value = true
  try {
    const currentQuery = query.value.trim()

    const { data, fromFallback } = await withLogging(
      () =>
        fetchWithFallback<PaginatedResponse<Post>>({
          primary: () =>
            services.search.searchPosts(currentQuery, {
              page: postsPage.value,
              page_size: postsPageSize,
            }),
          fallback: async () => {
            // 使用 IndexedDB 中已有的帖子做本地搜索回退
            try {
              const allCached = await indexedDB.getPosts({ limit: 200 })
              if (!allCached.length) return null

              const qLower = currentQuery.toLowerCase()
              const filtered = allCached.filter((p) => {
                const title = p.title?.toLowerCase() || ''
                const desc = p.description?.toLowerCase() || ''
                const author = (p.author_name || '').toLowerCase()
                const platform = (p.platform || '').toLowerCase()
                return (
                  title.includes(qLower) ||
                  desc.includes(qLower) ||
                  author.includes(qLower) ||
                  platform.includes(qLower)
                )
              })

              if (!filtered.length) return null

              const pageSize = postsPageSize
              const start = (postsPage.value - 1) * pageSize
              const end = start + pageSize
              const paged = filtered.slice(start, end)
              const total = filtered.length
              const pages = Math.max(1, Math.ceil(total / pageSize))

              const response: PaginatedResponse<Post> = {
                items: paged as Post[],
                page: postsPage.value,
                page_size: pageSize,
                total,
                pages,
              }

              return response
            } catch (error) {
              await withLogging(() => Promise.reject(error), 'SearchPage:FallbackSearch')
              return null
            }
          },
          onSuccess: async (response) => {
            try {
              await indexedDB.savePosts(response.items)
            } catch (error) {
              await withLogging(() => Promise.reject(error), 'SearchPage:PersistResults')
            }
          },
        }),
      'SearchPage:SearchPosts',
    )

    if (append) {
      posts.value = [...posts.value, ...(data.items || [])]
    } else {
      posts.value = data.items || []
    }

    postsTotalPages.value = data.pages || 0
    isPostsOffline.value = !!fromFallback
  } catch {
    if (!append) posts.value = []
    // postsTotalPages.value = 0 // Keep existing pagination if append fails? No, reset if fresh load fails.
    isPostsOffline.value = false
  } finally {
    loadingPosts.value = false
  }
}

const loadAuthors = async (append = false) => {
  if (!hasQuery.value) {
    authors.value = []
    authorsTotalPages.value = 0
    return
  }

  loadingAuthors.value = true
  try {
    const response = await withLogging(
      () =>
        services.search.searchAuthors(query.value.trim(), {
          page: authorsPage.value,
          page_size: authorsPageSize,
        }),
      'SearchPage:SearchAuthors',
    )

    if (append) {
      authors.value = [...authors.value, ...(response.items || [])]
    } else {
      authors.value = response.items || []
    }

    authorsTotalPages.value = response.pages || 0
  } catch {
    if (!append) authors.value = []
    // authorsTotalPages.value = 0
  } finally {
    loadingAuthors.value = false
  }
}

const loadActiveTab = async () => {
  if (activeTab.value === 'posts') {
    if (posts.value.length === 0) await loadPosts()
  } else {
    if (authors.value.length === 0) await loadAuthors()
  }
}

const handleSearch = (q: string) => {
  query.value = q
  postsPage.value = 1
  authorsPage.value = 1
  posts.value = []
  authors.value = []
  syncRoute()
  void loadActiveTab()
}

const switchTab = (tab: 'posts' | 'authors') => {
  if (activeTab.value === tab) return
  activeTab.value = tab
  syncRoute()
  void loadActiveTab()
}

const handlePostsLoadMore = async () => {
  if (postsPage.value >= postsTotalPages.value) return
  postsPage.value++
  await loadPosts(true)
}

const handleAuthorsLoadMore = async () => {
  if (authorsPage.value >= authorsTotalPages.value) return
  authorsPage.value++
  await loadAuthors(true)
}

onMounted(() => {
  if (hasQuery.value) {
    void loadActiveTab()
  }
})

watch(
  () => route.query,
  (newQuery) => {
    const qRaw = newQuery.q
    const tabRaw = newQuery.tab

    const q = typeof qRaw === 'string' ? qRaw : Array.isArray(qRaw) ? qRaw[0] || '' : ''
    const tab = tabRaw === 'authors' ? 'authors' : 'posts'

    // If query changed or tab changed
    if (q !== query.value) {
      query.value = q
      posts.value = []
      authors.value = []
      postsPage.value = 1
      authorsPage.value = 1
    }

    activeTab.value = tab

    if (!q) {
      posts.value = []
      authors.value = []
      postsTotalPages.value = 0
      authorsTotalPages.value = 0
      return
    }

    void loadActiveTab()
  },
)
</script>

<style scoped>
.search-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2xl);
}

.search-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-lg);
  padding: clamp(24px, 4vw, 32px);
}

.search-header-text {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.page-title {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.page-subtitle {
  color: var(--color-text-secondary);
}

/* 确保 SearchBar 在 header 中正确显示 */
.search-header :deep(.search-bar) {
  flex: 1;
  min-width: 280px;
  max-width: 500px;
}

@media (max-width: 768px) {
  .search-header {
    flex-direction: column;
    align-items: stretch;
  }

  .search-header :deep(.search-bar) {
    max-width: 100%;
  }
}

.search-tabs {
  display: inline-flex;
  align-items: center;
  padding: 6px;
  border-radius: 999px;
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  margin-top: var(--spacing-lg);
}

.tab-button {
  border: none;
  background: transparent;
  padding: 8px 16px;
  border-radius: 999px;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
}

.tab-button.active {
  background: var(--color-primary);
  color: #fff;
}

.search-empty {
  padding: var(--spacing-2xl) 0;
  color: var(--color-text-tertiary);
}

.search-results-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.offline-hint {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: rgba(59, 130, 246, 0.08);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.results-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-xl);
}

.loading-state {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  color: var(--color-text-secondary);
}

/* Spinner styles moved to base.css and utilities.css - use .spinner.spinner-md */

.results-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.authors-list {
  gap: var(--spacing-sm);
}

.results-list.posts-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--spacing-lg);
}

.author-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  content-visibility: auto;
  contain-intrinsic-size: 80px;
}

.author-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.author-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

.author-info {
  flex: 1;
  min-width: 0;
}

.author-name-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.author-name {
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.author-username {
  color: var(--color-text-tertiary);
}

.author-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.author-link {
  color: var(--color-primary);
  font-size: var(--text-sm);
  text-decoration: none;
}

.empty-state {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-xl);
  text-align: center;
  color: var(--color-text-tertiary);
}

.empty-state .hint {
  font-size: var(--text-sm);
}

@media (max-width: 768px) {
  .search-header {
    align-items: flex-start;
  }

  .page-title {
    font-size: var(--text-2xl);
  }
}
</style>
