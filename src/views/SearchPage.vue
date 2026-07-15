<template>
  <div class="search-page">
    <div class="container">
      <PageHeroShell class="search-header search-hero">
        <template #heading>
          <div class="page-hero-shell__title-row search-header-top">
            <ControlButton
              class="back-btn"
              size="square"
              icon-only
              :aria-label="$t('common.back')"
              @click="goBack"
            >
              <template #start>
                <AnimatedIcon name="explore" :fallback-icon="ArrowLeft" size="md" />
              </template>
            </ControlButton>
            <h1 class="page-hero-shell__title search-title">{{ $t('search.title') }}</h1>
          </div>
          <p class="page-hero-shell__subtitle">{{ $t('search.subtitle') }}</p>
        </template>

        <template #actions>
          <PageMetaChip v-if="query">
            {{ $t('search.resultsFor') }} <strong>"{{ query }}"</strong>
          </PageMetaChip>
        </template>

        <SearchBar class="search-bar-main" />

        <template #meta>
          <PageMetaRow v-if="!query">
            <PageMetaChip>{{ $t('search.tips.keyword') }}</PageMetaChip>
            <PageMetaChip>{{ $t('search.tips.author') }}</PageMetaChip>
          </PageMetaRow>
        </template>
      </PageHeroShell>

      <div v-if="query" class="search-content">
        <PageToolbar tag="section" class="search-overview">
          <div class="search-meta">
            <p class="search-query-info">
              {{ $t('search.resultsFor') }} <strong>"{{ query }}"</strong>
            </p>
          </div>

          <div class="search-filters">
            <ControlGroup class="filter-tabs">
              <ControlButton
                v-for="tab in tabs"
                :key="tab.id"
                class="filter-tab"
                :pressed="activeTab === tab.id"
                @click="activeTab = tab.id"
              >
                <template #start>
                  <AnimatedIcon
                    :name="tab.id === 'posts' ? 'search' : 'user'"
                    :fallback-icon="tab.icon"
                    size="sm"
                    :active="activeTab === tab.id"
                  />
                </template>
                {{ tab.label }}
                <template #end>
                  <span
                    v-if="tab.id === 'posts' && total > 0"
                    class="tab-count page-control-count"
                    >{{ total }}</span
                  >
                  <span
                    v-else-if="tab.id === 'authors' && authorTotal > 0"
                    class="tab-count page-control-count"
                    >{{ authorTotal }}</span
                  >
                </template>
              </ControlButton>
            </ControlGroup>
          </div>
        </PageToolbar>

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
                <div
                  v-for="post in results"
                  :key="post.id"
                  v-memo="getPostMemo(post)"
                  class="posts-masonry__item"
                >
                  <PostCard :post="post" @click="goToPost" />
                </div>
              </div>
            </template>

            <LoadMoreSection
              v-if="results.length > 0"
              :count="results.length"
              :total="loadMoreTotal"
              :has-more="hasMore"
              :loading="isLoadingMore"
              @load-more="loadMore"
            />

            <!-- 未登录用户提示 -->
            <div v-if="mayHaveMoreResults && results.length > 0" class="login-hint empty-surface">
              <AnimatedIcon name="user" :fallback-icon="LogIn" size="md" class="login-hint-icon" />
              <div class="login-hint-content">
                <p class="login-hint-text">{{ $t('search.loginForMore') }}</p>
                <ControlButton class="login-hint-btn" @click="goToLogin">
                  {{ $t('nav.login') }}
                </ControlButton>
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
              <AuthorCard
                v-for="author in authors"
                :key="author.id"
                v-memo="getAuthorMemo(author)"
                compact
                :author="author"
                @click="goToAuthor"
              />
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
            </ul>
          </div>
        </div>

        <section
          v-if="isAuthenticated"
          class="search-history-section empty-surface content-auto-xl"
        >
          <div class="search-history-header">
            <div>
              <h2 class="search-history-title">{{ $t('search.history') }}</h2>
              <p class="search-history-hint">{{ $t('search.historyHint') }}</p>
            </div>

            <div class="search-history-actions">
              <ControlButton
                class="search-history-action"
                size="compact"
                :disabled="isHistoryLoading || isHistoryMutating"
                @click="fetchSearchInsights"
              >
                <template #start>
                  <AnimatedIcon name="loading" :fallback-icon="RotateCcw" size="sm" />
                </template>
                {{ $t('common.refresh') }}
              </ControlButton>
              <ControlButton
                v-if="searchHistory.length > 0"
                class="search-history-action"
                size="compact"
                :disabled="isHistoryMutating"
                @click="clearSearchHistory"
              >
                <template #start>
                  <AnimatedIcon name="sparkle" :fallback-icon="Trash2" size="sm" />
                </template>
                {{ $t('search.clearHistory') }}
              </ControlButton>
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
                  <ControlButton
                    v-for="item in topSearchQueries"
                    :key="item.query"
                    class="search-history-tag"
                    size="compact"
                    @click="runSearch(item.query)"
                  >
                    <span>#{{ item.query }}</span>
                    <template #end>
                      <span v-if="item.count" class="search-history-tag__count">{{
                        item.count
                      }}</span>
                    </template>
                  </ControlButton>
                </div>
                <p v-else class="search-history-empty-copy">
                  {{ $t('search.topSearchesEmpty') }}
                </p>
              </div>
            </section>
          </div>
        </section>

        <section class="discover-section content-auto-lg">
          <div class="discover-header">
            <div>
              <h2 class="discover-title">{{ $t('search.discoverTitle') }}</h2>
              <p class="discover-subtitle">{{ $t('search.discoverHint') }}</p>
            </div>
            <ControlButton
              class="discover-refresh"
              :disabled="isDiscoverLoading"
              @click="fetchDiscoverPosts"
            >
              <template #start>
                <AnimatedIcon name="loading" :fallback-icon="RotateCcw" size="sm" />
              </template>
              <span>{{ $t('common.refresh') }}</span>
            </ControlButton>
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
  LogIn,
  ArrowLeft,
  RotateCcw,
  History,
  BarChart3,
  Trash2,
} from '@lucide/vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import AuthorCard from '@/components/business/AuthorCard.vue'
import SearchBar from '@/components/business/SearchBar.vue'
import {
  ControlButton,
  ControlGroup,
  PageHeroShell,
  PageMetaChip,
  PageMetaRow,
  PageToolbar,
} from '@/components/appearance'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import PostCard from '@/components/business/PostCard.vue'
import PostCardSkeleton from '@/components/business/PostCardSkeleton.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { useSearchPageState } from './search/useSearchPageState'

const { t } = useI18n()
const {
  query,
  activeTab,
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
  loadMoreTotal,
  topSearchQueries,
  mayHaveMoreResults,
  goBack,
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
</script>
