<template>
  <div class="search-page">
    <div class="container">
      <header class="search-header">
        <SearchBar ref="searchBarRef" />
      </header>

      <div v-if="query" class="search-content">
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
            </button>
          </div>

          <div class="sort-options">
            <select v-model="sortBy" class="glass-input sort-select">
              <option value="relevance">{{ $t('search.sort.relevance') }}</option>
              <option value="published_at">{{ $t('search.sort.date') }}</option>
              <option value="view_count">{{ $t('search.sort.views') }}</option>
            </select>
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

            <div v-else class="posts-grid">
              <PostCard v-for="post in results" :key="post.id" :post="post" @click="goToPost" />
            </div>

            <LoadMoreSection v-if="hasMore" :is-loading="isLoadingMore" @load-more="loadMore" />
          </template>

          <template v-else-if="activeTab === 'authors'">
            <StateIndicator
              v-if="authorError"
              variant="error"
              :description="authorError"
              @action="searchAuthors"
            />

            <StateIndicator
              v-else-if="authors.length === 0 && !isLoadingAuthors"
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
                />
                <div v-else class="author-avatar author-placeholder">
                  <User :size="24" />
                </div>
                <div class="author-info">
                  <h3 class="author-name">{{ author.name }}</h3>
                  <p class="author-platform">{{ author.platform }}</p>
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
        <Search :size="48" class="empty-icon" />
        <h2>{{ $t('search.title') }}</h2>
        <p>{{ $t('search.emptyHint') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Search, FileText, User } from 'lucide-vue-next'
import { searchService, type AuthorListItem, type PostListItem } from '@/api'
import { normalizeAvatarUrl } from '@/api/userService'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import PostCard from '@/components/business/PostCard.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import SearchBar from '@/components/business/SearchBar.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const searchBarRef = ref<InstanceType<typeof SearchBar>>()

const query = computed(() => (route.query.q as string) || '')
const activeTab = ref<'posts' | 'authors'>('posts')
const sortBy = ref<'relevance' | 'published_at' | 'view_count'>('relevance')

const results = ref<PostListItem[]>([])
const authors = ref<AuthorListItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

const isLoading = ref(false)
const isLoadingMore = ref(false)
const isLoadingAuthors = ref(false)
const error = ref<string | null>(null)
const authorError = ref<string | null>(null)

const hasMore = computed(() => results.value.length < total.value)

const tabs = [
  { id: 'posts' as const, label: t('search.tab.posts'), icon: FileText },
  { id: 'authors' as const, label: t('search.tab.authors'), icon: User },
]

async function search() {
  if (!query.value) return

  isLoading.value = true
  error.value = null
  page.value = 1

  try {
    const res = await searchService.searchPosts({
      q: query.value,
      page: 1,
      page_size: pageSize,
      sort_by: sortBy.value,
    })
    results.value = res.items
    total.value = res.total
  } catch {
    error.value = t('common.error')
    results.value = []
  } finally {
    isLoading.value = false
  }
}

async function loadMore() {
  if (isLoadingMore.value || !hasMore.value) return

  isLoadingMore.value = true

  try {
    const nextPage = page.value + 1
    const res = await searchService.searchPosts({
      q: query.value,
      page: nextPage,
      page_size: pageSize,
      sort_by: sortBy.value,
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
  } catch {
    authorError.value = t('common.error')
    authors.value = []
  } finally {
    isLoadingAuthors.value = false
  }
}

function goToPost(post: PostListItem) {
  router.push({ name: 'post-detail', params: { id: post.id } })
}

function goToAuthor(authorId: string) {
  router.push({ name: 'author-detail', params: { id: authorId } })
}

watch(query, () => {
  if (query.value) {
    search()
    searchAuthors()
  } else {
    results.value = []
    authors.value = []
  }
})

watch(sortBy, () => {
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
  padding: var(--spacing-6) 0;
}

.search-header {
  max-width: 800px;
  margin: 0 auto var(--spacing-6);
}

.search-content {
  max-width: 1400px;
  margin: 0 auto;
}

.search-filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-6);
  flex-wrap: wrap;
}

.filter-tabs {
  display: flex;
  gap: var(--spacing-2);
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
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

.sort-select {
  padding: var(--spacing-2) var(--spacing-3);
  font-size: var(--text-sm);
}

.results-loading {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-4);
}

.result-skeleton {
  padding: var(--spacing-4);
}

.skeleton-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  margin-top: var(--spacing-3);
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-4);
}

.authors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--spacing-4);
}

.author-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.author-card:hover {
  transform: translateY(-2px);
}

.author-avatar {
  width: 56px;
  height: 56px;
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
  min-height: 400px;
  text-align: center;
  color: var(--color-text-secondary);
}

.empty-icon {
  opacity: 0.5;
  margin-bottom: var(--spacing-4);
}

.search-empty h2 {
  margin: 0 0 var(--spacing-2);
  font-size: var(--text-xl);
}

.search-empty p {
  margin: 0;
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .search-filters {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-tabs {
    justify-content: center;
  }

  .sort-options {
    width: 100%;
  }

  .sort-select {
    width: 100%;
  }
}
</style>
