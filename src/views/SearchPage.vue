<template>
  <div class="search-page">
    <div class="container">
      <header class="search-header page-hero search-hero">
        <div class="page-hero__content">
          <div class="page-hero__header">
            <div class="page-hero__heading">
              <span class="page-hero__eyebrow">{{ $t('search.title') }}</span>
              <div class="page-hero__title-row search-header-top">
                <button
                  type="button"
                  class="back-btn page-control-btn page-control-btn--square"
                  @click="goBack"
                  :aria-label="$t('common.back')"
                >
                  <AnimatedIcon name="explore" :fallback-icon="ArrowLeft" size="md" />
                </button>
                <h1 class="page-hero__title search-title">{{ $t('search.title') }}</h1>
              </div>
              <p class="page-hero__subtitle">{{ $t('search.subtitle') }}</p>
            </div>
            <div v-if="query" class="page-hero__actions">
              <span class="page-hero__note">
                {{ $t('search.resultsFor') }} <strong>"{{ query }}"</strong>
              </span>
            </div>
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
            <div class="filter-tabs page-control-group">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                type="button"
                class="filter-tab page-control-btn"
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
                <span v-if="tab.id === 'posts' && total > 0" class="tab-count page-control-count">{{
                  total
                }}</span>
                <span
                  v-if="tab.id === 'authors' && authorTotal > 0"
                  class="tab-count page-control-count"
                  >{{ authorTotal }}</span
                >
              </button>
            </div>

            <div class="filter-options">
              <div v-if="activeTab === 'posts'" class="platform-filters page-control-group">
                <button
                  v-for="platform in platformOptions"
                  :key="platform.value"
                  type="button"
                  class="platform-btn page-control-btn page-control-btn--compact"
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
                  class="sort-order-btn page-control-btn page-control-btn--square"
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
            <div v-if="mayHaveMoreResults && results.length > 0" class="login-hint empty-surface">
              <AnimatedIcon name="user" :fallback-icon="LogIn" size="md" class="login-hint-icon" />
              <div class="login-hint-content">
                <p class="login-hint-text">{{ $t('search.loginForMore') }}</p>
                <button type="button" class="login-hint-btn page-control-btn" @click="goToLogin">
                  {{ $t('nav.login') }}
                </button>
              </div>
            </div>
          </template>

          <template v-else-if="activeTab === 'authors'">
            <div v-if="isLoadingAuthors && authors.length === 0" class="results-loading">
              <div v-for="i in 4" :key="i" class="author-skeleton empty-surface">
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
                class="author-card page-list-card"
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
                  width="48"
                  height="48"
                  loading="lazy"
                  decoding="async"
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

        <section v-if="isAuthenticated" class="search-history-section empty-surface">
          <div class="search-history-header">
            <div>
              <h2 class="search-history-title">{{ $t('search.history') }}</h2>
              <p class="search-history-hint">{{ $t('search.historyHint') }}</p>
            </div>

            <div class="search-history-actions">
              <button
                type="button"
                class="search-history-action page-control-btn page-control-btn--compact"
                :disabled="isHistoryLoading || isHistoryMutating"
                @click="fetchSearchInsights"
              >
                <AnimatedIcon name="loading" :fallback-icon="RotateCcw" size="sm" />
                {{ $t('common.refresh') }}
              </button>
              <button
                v-if="searchHistory.length > 0"
                type="button"
                class="search-history-action page-control-btn page-control-btn--compact"
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
            <section class="search-history-panel page-list-card">
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

            <section class="search-history-panel page-list-card">
              <div class="search-history-panel__header">
                <AnimatedIcon name="sparkle" :fallback-icon="BarChart3" size="sm" />
                <h3>{{ $t('search.searchStats') }}</h3>
              </div>

              <div class="search-history-stats">
                <article class="search-history-stat page-list-card">
                  <span class="search-history-stat__value">
                    {{ searchStats?.search_history_count ?? 0 }}
                  </span>
                  <span class="search-history-stat__label">
                    {{ $t('search.searchHistoryCount') }}
                  </span>
                </article>
                <article class="search-history-stat page-list-card">
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
                    class="search-history-tag page-control-btn page-control-btn--compact"
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
              class="discover-refresh page-control-btn"
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

import { computed, markRaw } from 'vue'
import { useI18n } from 'vue-i18n'
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
import { normalizeAvatarUrl } from '@/api/userService'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import SearchBar from '@/components/business/SearchBar.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Select from '@/components/ui/Select.vue'
import PostCard from '@/components/business/PostCard.vue'
import PostCardSkeleton from '@/components/business/PostCardSkeleton.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { useSearchPageState } from './search/useSearchPageState'
import type { SearchPlatformFilter, SearchSortBy } from './search/searchPageModel'

const { t } = useI18n()
const {
  query,
  activeTab,
  sortBy,
  sortOrder,
  currentPlatform,
  isAuthenticated,
  results,
  discoverPosts,
  authors,
  searchHistory,
  searchStats,
  total,
  authorTotal,
  isLoading,
  isLoadingMore,
  isLoadingAuthors,
  isDiscoverLoading,
  isHistoryLoading,
  isHistoryMutating,
  error,
  authorError,
  discoverError,
  historyError,
  hasMore,
  topSearchQueries,
  mayHaveMoreResults,
  goBack,
  toggleSortOrder,
  fetchDiscoverPosts,
  search,
  searchAuthors,
  loadMore,
  goToPost,
  goToAuthor,
  goToLogin,
  formatHistoryTime,
  runSearch,
  fetchSearchInsights,
  deleteSearchHistoryItem,
  clearSearchHistory,
  getPostMemo,
  getAuthorMemo,
} = useSearchPageState()

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
  {
    value: 'all' as SearchPlatformFilter,
    label: t('explore.allPlatforms'),
    icon: platformIcons.all,
  },
  { value: 'youtube' as SearchPlatformFilter, label: 'YouTube', icon: platformIcons.youtube },
  { value: 'tiktok' as SearchPlatformFilter, label: 'TikTok', icon: platformIcons.tiktok },
  { value: 'twitter' as SearchPlatformFilter, label: 'X', icon: platformIcons.twitter },
  {
    value: 'instagram' as SearchPlatformFilter,
    label: 'Instagram',
    icon: platformIcons.instagram,
  },
])

const sortOptions = computed(() => [
  { value: 'relevance' as SearchSortBy, label: t('search.sort.relevance') },
  { value: 'published_at' as SearchSortBy, label: t('search.sort.date') },
  { value: 'view_count' as SearchSortBy, label: t('search.sort.views') },
])

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
</script>

<style scoped>
.search-page {
  min-height: 100svh;
  min-height: 100dvh;
  padding: var(--spacing-3) 0;
}

.search-header {
  max-width: min(100%, 58rem);
  margin: 0 auto var(--spacing-4);
}

.search-header-top {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--spacing-3);
  position: relative;
}

.search-header .back-btn {
  position: relative;
  inset-inline-start: auto;
  z-index: auto;
}

.search-title {
  margin: 0;
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
  flex: 1 1 auto;
}

.filter-tab {
  white-space: nowrap;
}

.tab-count {
  flex-shrink: 0;
}

.filter-options {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  flex-wrap: wrap;
}

.platform-filters {
  justify-content: flex-end;
}

.platform-btn {
  justify-content: flex-start;
  min-inline-size: max-content;
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
  min-inline-size: 11.25rem;
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.sort-order-btn {
  flex-shrink: 0;
}

.sort-order-btn :deep(svg) {
  transition: transform var(--transition-fast);
}

.sort-order-btn--asc :deep(svg) {
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
  white-space: nowrap;
}

.login-hint-btn.page-control-btn {
  background:
    linear-gradient(
      135deg,
      rgba(var(--color-primary-rgb), 0.96),
      rgba(var(--color-accent-rgb), 0.88)
    ),
    rgba(var(--color-primary-rgb), 0.92);
  border-color: rgba(var(--color-primary-rgb), 0.16);
  color: var(--color-on-primary);
  box-shadow: 0 0.9rem 1.7rem -1.25rem rgba(var(--color-primary-rgb), 0.34);
}

.login-hint-btn.page-control-btn:hover {
  background:
    linear-gradient(
      135deg,
      rgba(var(--color-primary-rgb), 0.98),
      rgba(var(--color-accent-rgb), 0.92)
    ),
    rgba(var(--color-primary-rgb), 0.94);
  border-color: rgba(var(--color-primary-rgb), 0.22);
  color: var(--color-on-primary);
  transform: none;
}

.results-loading {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 17.5rem), 1fr));
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
  min-block-size: 5.5rem;
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
  --masonry-columns: 1;
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-3);
}

@media (min-width: 640px) {
  .authors-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .authors-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 1400px) {
  .authors-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (min-width: 1800px) {
  .authors-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

.author-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  cursor: pointer;
  min-inline-size: 0;
  min-block-size: 5.5rem;
  text-align: left;
}

.author-avatar {
  inline-size: 3rem;
  block-size: 3rem;
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
  min-inline-size: 0;
  display: grid;
  gap: var(--spacing-1);
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
  white-space: nowrap;
}

.search-history-layout {
  display: grid;
  gap: var(--spacing-3);
}

.search-history-panel {
  display: grid;
  gap: var(--spacing-3);
  padding: clamp(0.875rem, 2vw, 1rem);
  min-inline-size: 0;
  align-content: start;
  min-block-size: 16rem;
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
  border: 1px solid var(--page-control-border);
  background: var(--page-control-bg);
  box-shadow: 0 0.85rem 1.65rem -1.45rem rgba(15, 23, 42, 0.22);
  min-block-size: 3.5rem;
  transition:
    background 220ms var(--ease-out),
    border-color 220ms var(--ease-out),
    box-shadow 220ms var(--ease-out);
}

.search-history-item:hover,
.search-history-item:focus-within {
  background: var(--page-control-bg-hover);
  border-color: var(--page-control-border-strong);
  box-shadow: 0 1rem 1.85rem -1.55rem rgba(15, 23, 42, 0.28);
}

.search-history-item--skeleton {
  justify-content: space-between;
}

.search-history-item__main {
  flex: 1;
  min-inline-size: 0;
  display: grid;
  gap: 0.125rem;
  text-align: left;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  border-radius: var(--radius-full);
  border: 1px solid transparent;
  padding: 0;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.search-history-item__delete:hover {
  background: rgba(var(--color-error-rgb, 239, 68, 68), 0.1);
  border-color: rgba(var(--color-error-rgb, 239, 68, 68), 0.14);
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
  min-inline-size: 0;
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
  justify-content: flex-start;
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
  flex-shrink: 0;
}

.discover-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.discover-masonry {
  margin-bottom: var(--spacing-4);
}

@media (max-width: 768px) {
  .search-header {
    text-align: left;
  }

  .search-overview {
    align-items: stretch;
  }

  .search-meta,
  .search-filters {
    inline-size: 100%;
  }

  .search-header-top {
    justify-content: flex-start;
  }

  .search-header .back-btn {
    position: static;
    flex-shrink: 0;
  }

  .search-title {
    min-inline-size: 0;
  }

  .search-filters {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-tabs {
    inline-size: 100%;
    flex-wrap: wrap;
  }

  .filter-tab {
    flex: 1 1 0;
    justify-content: center;
    min-inline-size: 0;
  }

  .filter-options {
    inline-size: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .platform-filters {
    display: grid;
    inline-size: 100%;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .platform-btn {
    justify-content: center;
  }

  .platform-label {
    display: inline;
  }

  .sort-controls {
    inline-size: 100%;
  }

  .sort-select {
    flex: 1;
    min-inline-size: 0;
  }

  .search-history-stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .filter-tab {
    flex-basis: calc(50% - (var(--spacing-1) / 2));
  }
}

@media (min-width: 960px) {
  .search-history-layout {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  }
}
</style>
