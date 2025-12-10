<template>
  <MainLayout>
    <div class="authors-page">
      <!-- 页面头部 -->
      <div class="page-header">
        <h1 class="page-title">{{ $t('author.title') }}</h1>
        <div class="header-stats">
          <div class="stat-item">
            <span class="stat-label">{{ $t('author.totalFollowers') }}</span>
            <span class="stat-value">{{ formatNumber(totalFollowers) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ $t('author.totalPosts') }}</span>
            <span class="stat-value">{{ totalPosts }}</span>
          </div>
        </div>
      </div>

      <!-- 筛选工具栏 -->
      <div class="filter-toolbar glass-card">
        <!-- 搜索框 -->
        <div class="search-box">
          <Search :size="18" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="$t('author.searchPlaceholder', 'Search authors...')"
            class="search-input"
            @input="debouncedSearch"
          />
          <button v-if="searchQuery" class="clear-btn" @click="clearSearch">
            <X :size="16" />
          </button>
        </div>

        <!-- 平台筛选 -->
        <div class="filter-group">
          <label class="filter-label">{{ $t('common.platform') }}</label>
          <select v-model="selectedPlatform" class="filter-select" @change="handleFilterChange">
            <option value="">{{ $t('common.all') }}</option>
            <option v-for="platform in platforms" :key="platform" :value="platform">
              {{ getPlatformName(platform) }}
            </option>
          </select>
        </div>

        <!-- 排序 -->
        <div class="filter-group">
          <label class="filter-label">{{ $t('common.sortBy') }}</label>
          <select v-model="sortBy" class="filter-select" @change="handleFilterChange">
            <option value="follower_count">{{ $t('author.followers') }}</option>
            <option value="post_count">{{ $t('author.posts') }}</option>
            <option value="name">{{ $t('author.name') }}</option>
            <option value="created_at">{{ $t('common.date') }}</option>
          </select>
        </div>
      </div>

      <!-- 骨架屏加载 -->
      <div v-if="loading && authors.length === 0" class="authors-list">
        <div v-for="i in 6" :key="i" class="author-card glass-card skeleton-card">
          <div class="card-content">
            <div class="author-avatar-section">
              <div class="avatar-wrapper skeleton"></div>
            </div>
            <div class="author-content">
              <div class="skeleton-line skeleton-title"></div>
              <div class="skeleton-line skeleton-subtitle"></div>
              <div class="skeleton-line skeleton-text"></div>
              <div class="skeleton-stats">
                <div class="skeleton-stat"></div>
                <div class="skeleton-stat"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 作者列表 -->
      <div v-else-if="displayAuthors.length > 0" class="authors-list">
        <div
          v-for="(author, index) in displayAuthors"
          :key="author.id"
          class="author-card glass-card"
          @click="handleAuthorClick(author)"
        >
          <!-- Banner 背景 -->
          <div
            v-if="author.profile_banner_url"
            class="card-banner"
            :style="{ backgroundImage: `url(${author.profile_banner_url})` }"
          ></div>
          <div class="card-overlay"></div>

          <div class="card-content">
            <!-- 头像区域 -->
            <div class="author-avatar-section">
              <div class="avatar-wrapper">
                <img
                  v-if="author.avatar_url"
                  :src="author.avatar_url"
                  :alt="author.name"
                  class="avatar-image"
                  :loading="index < 6 ? 'eager' : 'lazy'"
                  :fetchpriority="index < 4 ? 'high' : 'auto'"
                  @error="onImageError"
                />
                <div v-else class="avatar-placeholder">
                  <User :size="48" />
                </div>
              </div>
            </div>

            <!-- 内容区域 -->
            <div class="author-content">
              <div class="author-header">
                <div class="author-info">
                  <div class="name-row">
                    <h3 class="author-name">{{ author.name }}</h3>
                    <CheckCircle v-if="author.is_verified" :size="20" class="verified-badge" />
                  </div>
                  <p class="author-username">@{{ author.username }}</p>
                </div>
                <div
                  class="platform-badge"
                  :style="{ background: getPlatformColor(author.platform) }"
                >
                  {{ getPlatformName(author.platform) }}
                </div>
              </div>

              <p v-if="author.description" class="author-bio">
                {{ truncateText(author.description, 120) }}
              </p>

              <div class="author-stats">
                <div class="stat-item">
                  <Users :size="16" />
                  <span class="stat-value">{{ formatNumber(author.follower_count || 0) }}</span>
                  <span class="stat-label">{{ $t('author.followers') }}</span>
                </div>
                <div class="stat-item">
                  <FileText :size="16" />
                  <span class="stat-value">{{ formatNumber(author.video_count || 0) }}</span>
                  <span class="stat-label"
                    >{{ $t('platform.' + author.platform) }} {{ $t('author.posts') }}</span
                  >
                </div>
                <div v-if="author.post_count > 0" class="stat-item scraped">
                  <Database :size="16" />
                  <span class="stat-value">{{ author.post_count }}</span>
                  <span class="stat-label">{{ $t('author.scraped') }}</span>
                </div>
              </div>

              <div class="author-footer">
                <div class="author-meta">
                  <Calendar :size="14" />
                  <span
                    >{{ $t('author.platformJoined') }}: {{ formatDate(author.created_at) }}</span
                  >
                </div>
                <a
                  v-if="author.profile_url"
                  :href="author.profile_url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="profile-link"
                >
                  <ExternalLink :size="16" />
                  {{ $t('author.viewOriginal') }}
                </a>
              </div>
            </div>
          </div>
        </div>
        <!-- Loading More Indicator -->
        <div v-if="loadingMore || scrollLoading" class="loading-more">
          <LoadingSpinner size="sm" :text="$t('common.loading')" />
        </div>

        <!-- Load More Hint -->
        <div v-else-if="hasMore" class="load-more-hint">
          {{ $t('common.scrollToLoadMore', '向下滚动加载更多') }}
        </div>

        <!-- All Loaded -->
        <div v-else-if="authors.length > 0" class="all-loaded-hint">
          {{ $t('author.allLoaded', '已加载全部作者') }} ({{ authors.length }})
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state glass-card">
        <AlertCircle :size="64" />
        <h3>{{ $t('common.error') }}</h3>
        <p>{{ error }}</p>
        <button class="retry-button glass-button" @click="loadAuthors(true)">
          <RotateCcw :size="18" />
          {{ $t('common.retry') }}
        </button>
      </div>

      <div v-else class="empty-state glass-card">
        <Users :size="64" />
        <h3>{{ $t('author.noAuthors') }}</h3>
      </div>
    </div>
  </MainLayout>
</template>

<script lang="ts">
export default {
  name: 'AuthorsPage',
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  User,
  Users,
  CheckCircle,
  Calendar,
  ExternalLink,
  FileText,
  Database,
  Search,
  X,
  AlertCircle,
  RotateCcw,
} from 'lucide-vue-next'
import dayjs from 'dayjs'

import MainLayout from '@/components/layout/MainLayout.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import { PLATFORM_COLORS, PLATFORM_NAMES, PLATFORMS } from '@/types'
import { authorsApi } from '@/api/services'
import type { AuthorListItem } from '@/types'
import { useErrorHandler } from '@/utils'
import { useInfiniteScroll } from '@/composables'
import { indexedDB } from '@/utils/storage'
import logger from '@/utils/logger'

const router = useRouter()
const { t } = useI18n()
const { handleError } = useErrorHandler('AuthorsPage')

// ============================================
// 常量
// ============================================
const PAGE_SIZE = 10 // 每次加载的作者数量

// ============================================
// 状态
// ============================================
const loading = ref(true)
const loadingMore = ref(false)
const error = ref<string | null>(null)
const authors = ref<AuthorListItem[]>([])

// 筛选和排序
const searchQuery = ref('')
const selectedPlatform = ref('')
const sortBy = ref<'follower_count' | 'post_count' | 'name' | 'created_at'>('follower_count')
const platforms = PLATFORMS

// 分页
const currentPage = ref(1)
const totalCount = ref(0)
const totalPages = ref(0)
const hasMore = ref(true)

// ============================================
// 计算属性
// ============================================
const totalFollowers = computed(() => {
  return authors.value.reduce(
    (sum: number, author: AuthorListItem) => sum + (author.follower_count || 0),
    0,
  )
})

const totalPosts = computed(() => {
  return authors.value.reduce(
    (sum: number, author: AuthorListItem) => sum + (author.post_count || 0),
    0,
  )
})

// 客户端筛选和排序（用于已加载的数据）
const displayAuthors = computed(() => {
  let result = [...authors.value]

  // 搜索筛选（客户端）
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(
      (author) =>
        author.name.toLowerCase().includes(query) ||
        author.username.toLowerCase().includes(query) ||
        (author.description && author.description.toLowerCase().includes(query)),
    )
  }

  // 平台筛选（客户端）
  if (selectedPlatform.value) {
    result = result.filter((author) => author.platform === selectedPlatform.value)
  }

  // 排序
  result.sort((a, b) => {
    switch (sortBy.value) {
      case 'follower_count':
        return (b.follower_count || 0) - (a.follower_count || 0)
      case 'post_count':
        return (b.post_count || 0) - (a.post_count || 0)
      case 'name':
        return a.name.localeCompare(b.name)
      case 'created_at':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      default:
        return 0
    }
  })

  return result
})

// ============================================
// 数据加载
// ============================================

/**
 * 加载作者列表（初始加载或刷新）
 */
const loadAuthors = async (reset = false) => {
  if (reset) {
    authors.value = []
    currentPage.value = 1
    hasMore.value = true
  }

  try {
    loading.value = true
    error.value = null

    const response = await authorsApi.getAuthors({
      page: currentPage.value,
      page_size: PAGE_SIZE,
    })

    authors.value = response.items
    totalCount.value = response.total
    totalPages.value = response.pages || Math.ceil(response.total / PAGE_SIZE)
    hasMore.value = currentPage.value < totalPages.value

    // 缓存到 IndexedDB
    await cacheAuthors(response.items)

    logger.debug('[AuthorsPage] Loaded authors', {
      page: currentPage.value,
      count: response.items.length,
      total: response.total,
    })
  } catch (err) {
    error.value = t('author.loadFailed', 'Failed to load authors')
    handleError(err, { customMessage: t('author.loadFailed', 'Failed to load authors') })
  } finally {
    loading.value = false
  }
}

/**
 * 加载更多作者（无限滚动触发）
 */
const loadMoreAuthors = async () => {
  if (loadingMore.value || !hasMore.value) return

  try {
    loadingMore.value = true
    currentPage.value++

    const response = await authorsApi.getAuthors({
      page: currentPage.value,
      page_size: PAGE_SIZE,
    })

    // 追加新数据
    authors.value = [...authors.value, ...response.items]
    totalPages.value = response.pages || Math.ceil(response.total / PAGE_SIZE)
    hasMore.value = currentPage.value < totalPages.value

    // 增量缓存
    await cacheAuthors(authors.value)

    logger.debug('[AuthorsPage] Loaded more authors', {
      page: currentPage.value,
      newCount: response.items.length,
      totalLoaded: authors.value.length,
    })
  } catch (err) {
    // 加载更多失败，回退页码
    currentPage.value--
    logger.warn('[AuthorsPage] Failed to load more', { error: err })
  } finally {
    loadingMore.value = false
  }
}

// 无限滚动
const { isLoading: scrollLoading } = useInfiniteScroll({
  onLoadMore: loadMoreAuthors,
  hasMore: () => hasMore.value && !loadingMore.value,
  threshold: 400,
  enabled: computed(() => !loading.value && authors.value.length > 0),
})

// 缓存作者数据
const cacheAuthors = async (items: AuthorListItem[]) => {
  try {
    await indexedDB.saveAuthors(items)
    logger.debug(`[AuthorsPage] Cached ${items.length} authors`)
  } catch (err) {
    logger.warn('[AuthorsPage] Failed to cache authors', { error: err })
  }
}

// ============================================
// 事件处理
// ============================================
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const debouncedSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    // 搜索只在客户端过滤已加载的数据
  }, 300)
}

const clearSearch = () => {
  searchQuery.value = ''
}

const handleFilterChange = () => {
  // 筛选只在客户端过滤已加载的数据
}

// 点击作者卡片 - 跳转到探索页筛选该作者帖子
const handleAuthorClick = (author: AuthorListItem) => {
  router.push({
    path: '/explore',
    query: {
      author_id: author.id,
      platform: author.platform,
    },
  })
}

// ============================================
// 工具函数
// ============================================
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

const formatDate = (dateStr: string): string => {
  return dayjs(dateStr).format('YYYY-MM-DD')
}

const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

const getPlatformColor = (platform: string) => {
  return PLATFORM_COLORS[platform as keyof typeof PLATFORM_COLORS] || '#666'
}

const getPlatformName = (platform: string) => {
  return PLATFORM_NAMES[platform as keyof typeof PLATFORM_NAMES] || platform
}

const onImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
  const placeholder = img.parentElement?.querySelector('.avatar-placeholder')
  if (placeholder) {
    ;(placeholder as HTMLElement).style.display = 'flex'
  }
}

// ============================================
// 生命周期
// ============================================
onMounted(() => {
  loadAuthors()
})

onUnmounted(() => {
  if (searchTimeout) clearTimeout(searchTimeout)
})
</script>

<style scoped>
.authors-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-lg);
}

.page-title {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin: 0;
}

.header-stats {
  display: flex;
  gap: var(--spacing-xl);
}

.header-stats .stat-item {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.header-stats .stat-label {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-xs);
}

.header-stats .stat-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
}

/* 筛选工具栏 */
.filter-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 200px;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: var(--spacing-md);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  padding-left: calc(var(--spacing-md) * 2 + 18px);
  padding-right: calc(var(--spacing-md) + 28px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
  font-size: var(--text-base);
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.clear-btn {
  position: absolute;
  right: var(--spacing-sm);
  top: 50%;
  transform: translateY(-50%);
  padding: var(--spacing-xs);
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.clear-btn:hover {
  color: var(--color-text-primary);
  background: var(--glass-bg-hover);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.filter-label {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

.filter-select {
  padding: var(--spacing-sm) var(--spacing-md);
  padding-right: calc(var(--spacing-md) + 16px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  min-width: 120px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--spacing-sm) center;
  background-size: 16px;
}

.filter-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.1);
}

/* 骨架屏 */
.skeleton-card {
  pointer-events: none;
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--glass-bg-light) 25%,
    var(--glass-bg-hover) 50%,
    var(--glass-bg-light) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-line {
  height: 16px;
  border-radius: var(--radius-sm);
  background: linear-gradient(
    90deg,
    var(--glass-bg-light) 25%,
    var(--glass-bg-hover) 50%,
    var(--glass-bg-light) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-title {
  width: 60%;
  height: 24px;
  margin-bottom: var(--spacing-sm);
}

.skeleton-subtitle {
  width: 40%;
  height: 14px;
  margin-bottom: var(--spacing-md);
}

.skeleton-text {
  width: 80%;
  height: 14px;
  margin-bottom: var(--spacing-md);
}

.skeleton-stats {
  display: flex;
  gap: var(--spacing-lg);
}

.skeleton-stat {
  width: 80px;
  height: 20px;
  border-radius: var(--radius-sm);
  background: linear-gradient(
    90deg,
    var(--glass-bg-light) 25%,
    var(--glass-bg-hover) 50%,
    var(--glass-bg-light) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

.authors-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.author-card {
  position: relative;
  display: flex;
  gap: var(--spacing-xl);
  padding: var(--spacing-xl);
  transition: all 0.3s ease;
  cursor: pointer;
  overflow: hidden;
}

.author-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

/* Banner 背景 */
.card-banner {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  filter: blur(20px);
  opacity: 0.3;
  transform: scale(1.1);
  z-index: 0;
}

/* 遮罩层 */
.card-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    135deg,
    rgba(var(--glass-bg-rgb), 0.95) 0%,
    rgba(var(--glass-bg-rgb), 0.85) 100%
  );
  backdrop-filter: blur(10px);
  z-index: 1;
}

/* 内容容器 */
.card-content {
  position: relative;
  z-index: 2;
  display: flex;
  gap: var(--spacing-xl);
  width: 100%;
}

/* 头像区域 */
.author-avatar-section {
  flex-shrink: 0;
}

.avatar-wrapper {
  width: 120px;
  height: 120px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  position: relative;
  background: var(--gradient-primary);
}

.avatar-image {
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
  color: white;
}

/* 内容区域 */
.author-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-width: 0;
}

.author-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-md);
}

.author-info {
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
}

.author-name {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.verified-badge {
  color: var(--color-primary);
  flex-shrink: 0;
}

.author-username {
  font-size: var(--text-base);
  color: var(--color-text-tertiary);
  margin: 0;
}

.platform-badge {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-sm);
  color: white;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  white-space: nowrap;
}

.author-bio {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  line-height: var(--line-relaxed);
  margin: 0;
}

.author-stats {
  display: flex;
  gap: var(--spacing-2xl);
  flex-wrap: wrap;
}

.author-stats .stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.author-stats .stat-value {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
}

.author-stats .stat-label {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.author-stats .stat-item.scraped {
  opacity: 0.7;
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--glass-bg-light);
  border-radius: var(--radius-sm);
}

.author-stats .stat-item.scraped .stat-value {
  color: var(--color-text-secondary);
}

.author-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--glass-border);
}

.author-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.profile-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--glass-bg-light);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-primary);
  text-decoration: none;
  transition: all 0.3s ease;
}

.profile-link:hover {
  background: var(--glass-bg-hover);
  transform: translateX(4px);
}

.empty-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-3xl);
  color: var(--color-text-tertiary);
  text-align: center;
}

.error-state {
  border-color: var(--color-error);
}

.error-state svg {
  color: var(--color-error);
}

.retry-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-md);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .author-card {
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: var(--spacing-lg);
  }

  .avatar-wrapper {
    width: 100px;
    height: 100px;
  }

  .card-content {
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
  }

  .author-content {
    align-items: center;
  }

  .author-name,
  .author-username,
  .author-bio {
    white-space: normal;
    word-break: break-word;
    text-align: center;
  }

  .author-header {
    flex-direction: column;
    align-items: center;
  }

  .author-footer {
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-stats {
    width: 100%;
    justify-content: space-around;
  }
}

/* 加载更多指示器 */
.loading-more {
  display: flex;
  justify-content: center;
  padding: var(--spacing-xl);
  grid-column: 1 / -1;
}

.load-more-hint {
  text-align: center;
  padding: var(--spacing-lg);
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  grid-column: 1 / -1;
}

.all-loaded-hint {
  text-align: center;
  padding: var(--spacing-lg);
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  grid-column: 1 / -1;
  opacity: 0.7;
}
</style>
