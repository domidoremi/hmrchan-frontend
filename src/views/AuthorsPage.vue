<template>
  <MainLayout>
    <div class="authors-page">
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

      <LoadingSpinner v-if="loading" size="lg" />

      <div v-else-if="authors.length > 0" class="authors-list">
        <div v-for="author in authors" :key="author.id" class="author-card glass-card">
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
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  User,
  Users,
  CheckCircle,
  Calendar,
  ExternalLink,
  FileText,
  Database,
} from 'lucide-vue-next'
import dayjs from 'dayjs'

import MainLayout from '@/components/layout/MainLayout.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import { PLATFORM_COLORS, PLATFORM_NAMES } from '@/types'
import { authorsApi } from '@/api/services'
import type { AuthorListItem } from '@/types'
import { useErrorHandler } from '@/utils/errorHandler'

const { t } = useI18n()
const { handleError } = useErrorHandler('AuthorsPage')
const loading = ref(true)
const authors = ref<AuthorListItem[]>([])

const totalFollowers = computed(() => {
  return authors.value.reduce((sum, author) => sum + (author.follower_count || 0), 0)
})

const totalPosts = computed(() => {
  return authors.value.reduce((sum, author) => sum + (author.post_count || 0), 0)
})

onMounted(async () => {
  try {
    const response = await authorsApi.getAuthors({ page: 1, page_size: 100 })
    authors.value = response.items
  } catch (error) {
    handleError(error, { customMessage: t('author.loadFailed', 'Failed to load authors') })
  } finally {
    loading.value = false
  }
})

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
</script>

<style scoped>
.authors-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2xl);
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
  }

  .avatar-wrapper {
    width: 100px;
    height: 100px;
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
