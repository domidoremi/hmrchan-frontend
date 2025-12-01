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
          <input v-model="searchQuery" type="text" :placeholder="$t('author.searchPlaceholder', 'Search authors...')"
            class="search-input" @input="debouncedSearch" />
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
      <div v-else-if="paginatedAuthors.length > 0" class="authors-list">
        <div v-for="author in paginatedAuthors" :key="author.id" class="author-card glass-card"
          @click="handleAuthorClick(author)">
          <!-- Banner 背景 -->
          <div v-if="author.profile_banner_url" class="card-banner"
            :style="{ backgroundImage: `url(${author.profile_banner_url})` }"></div>
          <div class="card-overlay"></div>

          <div class="card-content">
            <!-- 头像区域 -->
            <div class="author-avatar-section">
              <div class="avatar-wrapper">
                <img v-if="author.avatar_url" :src="author.avatar_url" :alt="author.name" class="avatar-image"
                  @error="onImageError" />
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
                <div class="platform-badge" :style="{ background: getPlatformColor(author.platform) }">
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
                  <span class="stat-label">{{ $t('platform.' + author.platform) }} {{ $t('author.posts') }}</span>
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
                  <span>{{ $t('author.platformJoined') }}: {{ formatDate(author.created_at) }}</span>
                </div>
                <a v-if="author.profile_url" :href="author.profile_url" target="_blank" rel="noopener noreferrer"
                  class="profile-link">
                  <ExternalLink :size="16" />
                  {{ $t('author.viewOriginal') }}
                </a>
              </div>
            </div>
          </div>
        </div>
        <!-- Pagination -->
        <Pagination v-if="totalPages > 1" :current-page="currentPage" :total-pages="totalPages"
          @change="handlePageChange" />
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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
} from 'lucide-vue-next'
import dayjs from 'dayjs'

import MainLayout from '@/components/layout/MainLayout.vue'
import { Pagination } from '@/components/ui/pagination'
import { PLATFORM_COLORS, PLATFORM_NAMES, PLATFORMS } from '@/types'
import { authorsApi } from '@/api/services'
import type { AuthorListItem } from '@/types'
import { useErrorHandler } from '@/utils/error'
import { indexedDB } from '@/utils/storage'
import logger from '@/utils/logger'

const router = useRouter()
const { t } = useI18n()
const { handleError } = useErrorHandler('AuthorsPage')

// ============================================
// 状态
// ============================================
const loading = ref(true)
const authors = ref<AuthorListItem[]>([])
const allAuthors = ref<AuthorListItem[]>([]) // 缓存所有数据用于本地筛选

// 筛选和排序
const searchQuery = ref('')
const selectedPlatform = ref('')
const sortBy = ref<'follower_count' | 'post_count' | 'name' | 'created_at'>('follower_count')
const platforms = PLATFORMS

// 分页
const currentPage = ref(1)
const itemsPerPage = 12 // 每页显示12个作者
const totalCount = ref(0)

// ============================================
// 计算属性
// ============================================
const totalFollowers = computed(() => {
  return allAuthors.value.reduce((sum, author) => sum + (author.follower_count || 0), 0)
})

const totalPosts = computed(() => {
  return allAuthors.value.reduce((sum, author) => sum + (author.post_count || 0), 0)
})

// 筛选和排序后的作者列表
const filteredAuthors = computed(() => {
  let result = [...allAuthors.value]

  // 搜索筛选
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(
      (author) =>
        author.name.toLowerCase().includes(query) ||
        author.username.toLowerCase().includes(query) ||
        (author.description && author.description.toLowerCase().includes(query)),
    )
  }

  // 平台筛选
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

// 总页数
const totalPages = computed(() => {
  return Math.ceil(filteredAuthors.value.length / itemsPerPage)
})

// 分页后的作者列表
const paginatedAuthors = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredAuthors.value.slice(start, end)
})

// ============================================
// 数据加载
// ============================================
const loadAuthors = async (forceRefresh = false) => {
  try {
    loading.value = true

    // 先尝试从缓存加载
    if (!forceRefresh) {
      const cached = await loadFromCache()
      if (cached.length > 0) {
        allAuthors.value = cached
        authors.value = cached
        loading.value = false
        // 后台刷新
        refreshInBackground()
        return
      }
    }

    // 从 API 加载
    const response = await authorsApi.getAuthors({ page: 1, page_size: 200 })
    allAuthors.value = response.items
    authors.value = response.items
    totalCount.value = response.total

    // 缓存到 IndexedDB
    await cacheAuthors(response.items)
  } catch (error) {
    handleError(error, { customMessage: t('author.loadFailed', 'Failed to load authors') })
  } finally {
    loading.value = false
  }
}

// 从缓存加载
const loadFromCache = async (): Promise<AuthorListItem[]> => {
  try {
    const cached = await indexedDB.getAuthors()
    if (cached.length > 0) {
      logger.debug(`[AuthorsPage] Loaded ${cached.length} authors from cache`)
      return cached as AuthorListItem[]
    }
  } catch (error) {
    logger.warn('[AuthorsPage] Failed to load from cache', { error })
  }
  return []
}

// 缓存作者数据
const cacheAuthors = async (items: AuthorListItem[]) => {
  try {
    await indexedDB.saveAuthors(items)
    logger.debug(`[AuthorsPage] Cached ${items.length} authors`)
  } catch (error) {
    logger.warn('[AuthorsPage] Failed to cache authors', { error })
  }
}

// 后台刷新
const refreshInBackground = async () => {
  try {
    const response = await authorsApi.getAuthors({ page: 1, page_size: 200 })
    if (response.items.length > 0) {
      allAuthors.value = response.items
      authors.value = response.items
      await cacheAuthors(response.items)
      logger.debug('[AuthorsPage] Background refresh complete')
    }
  } catch (error) {
    logger.warn('[AuthorsPage] Background refresh failed', { error })
  }
}

// ============================================
// 事件处理
// ============================================
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const debouncedSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    authors.value = filteredAuthors.value
  }, 300)
}

const clearSearch = () => {
  searchQuery.value = ''
  authors.value = filteredAuthors.value
}

const handleFilterChange = () => {
  currentPage.value = 1 // 筛选变化时重置到第一页
  authors.value = filteredAuthors.value
}

// 处理分页变化
const handlePageChange = (page: number) => {
  currentPage.value = page
  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 点击作者卡片 - 跳转到作者帖子页
const handleAuthorClick = (author: AuthorListItem) => {
  router.push({
    path: '/',
    query: { author_id: author.id, author_name: author.name },
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
    ; (placeholder as HTMLElement).style.display = 'flex'
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

// 监听筛选变化
watch([searchQuery, selectedPlatform, sortBy], () => {
  currentPage.value = 1 // 重置分页
  authors.value = filteredAuthors.value
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
  padding-left: calc(var(--spacing-md) + 24px);
  padding-right: calc(var(--spacing-md) + 24px);
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
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

/* 骨架屏 */
.skeleton-card {
  pointer-events: none;
}

.skeleton {
  background: linear-gradient(90deg,
      var(--glass-bg-light) 25%,
      var(--glass-bg-hover) 50%,
      var(--glass-bg-light) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-line {
  height: 16px;
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg,
      var(--glass-bg-light) 25%,
      var(--glass-bg-hover) 50%,
      var(--glass-bg-light) 75%);
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
  background: linear-gradient(90deg,
      var(--glass-bg-light) 25%,
      var(--glass-bg-hover) 50%,
      var(--glass-bg-light) 75%);
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
  background: linear-gradient(135deg,
      rgba(var(--glass-bg-rgb), 0.95) 0%,
      rgba(var(--glass-bg-rgb), 0.85) 100%);
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-3xl);
  color: var(--color-text-tertiary);
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
</style>
