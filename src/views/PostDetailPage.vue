<template>
  <MainLayout>
    <div class="post-detail-page">
      <LoadingSpinner v-if="loading" size="lg" :text="$t('common.loading')" />

      <div v-else-if="post" class="post-detail">
        <!-- 返回按钮 -->
        <button class="back-button glass-button" @click="goBack">
          <ArrowLeft :size="20" />
          {{ $t('common.back') }}
        </button>

        <!-- 主要内容 -->
        <div class="post-header glass-card">
          <!-- 缩略图 -->
          <div v-if="post.thumbnail_url" class="post-thumbnail-container">
            <!-- 上一张按钮 -->
            <button
              v-show="allImages.length > 1"
              class="thumbnail-nav-btn prev-thumbnail-btn"
              :class="{ 'nav-btn-disabled': currentThumbnailIndex === 0 }"
              @click.stop="prevThumbnail"
              :disabled="currentThumbnailIndex === 0"
              :aria-label="$t('common.previous')"
            >
              <ChevronLeft :size="20" />
            </button>

            <div class="post-thumbnail" @click="openMediaViewer(currentThumbnailIndex)">
              <transition name="thumbnail-fade" mode="out-in">
                <img
                  :key="currentThumbnailUrl"
                  :src="currentThumbnailUrl"
                  :alt="post.title || 'Post thumbnail'"
                />
              </transition>
              <div class="thumbnail-overlay">
                <Maximize2 :size="32" />
              </div>
              <!-- 图片计数 -->
              <div v-if="allImages.length > 1" class="thumbnail-counter">
                {{ currentThumbnailIndex + 1 }} / {{ allImages.length }}
              </div>
            </div>

            <!-- 下一张按钮 -->
            <button
              v-show="allImages.length > 1"
              class="thumbnail-nav-btn next-thumbnail-btn"
              :class="{ 'nav-btn-disabled': currentThumbnailIndex === allImages.length - 1 }"
              @click.stop="nextThumbnail"
              :disabled="currentThumbnailIndex === allImages.length - 1"
              :aria-label="$t('common.next')"
            >
              <ChevronRight :size="20" />
            </button>
          </div>

          <h1 class="post-title">{{ post.title || 'Untitled' }}</h1>

          <div class="post-meta">
            <div class="meta-item">
              <Calendar :size="18" />
              <span>{{ formatDate(post.published_at || post.scraped_at) }}</span>
            </div>
            <div class="meta-item">
              <span class="platform-badge" :style="{ background: platformColor }">
                {{ platformName }}
              </span>
            </div>
            <!-- 转发标记 -->
            <div v-if="isRetweet" class="meta-item retweet-indicator">
              <Repeat2 :size="18" />
              <span>{{ $t('post.retweet') }}</span>
            </div>
          </div>

          <!-- 转发情况：显示转发者和原作者 -->
          <div v-if="isRetweet" class="retweet-info">
            <div class="retweeter-info">
              <div class="author-avatar">
                <User :size="24" />
              </div>
              <div class="author-details">
                <h3>{{ post.author_name }}</h3>
                <p v-if="post.author_username">@{{ post.author_username }}</p>
              </div>
            </div>
            <div class="retweet-arrow">
              <Repeat2 :size="24" />
            </div>
            <div class="original-author-info">
              <div class="author-avatar original">
                <User :size="24" />
              </div>
              <div class="author-details">
                <h3>{{ post.original_author_name }}</h3>
                <p v-if="post.original_author_username">@{{ post.original_author_username }}</p>
                <span class="original-label">{{ $t('post.originalAuthor') }}</span>
              </div>
            </div>
          </div>
          <!-- 普通帖子：只显示作者 -->
          <div v-else-if="post.author_name" class="author-info">
            <div class="author-avatar">
              <User :size="24" />
            </div>
            <div class="author-details">
              <h3>{{ post.author_name }}</h3>
              <p v-if="post.author_username">@{{ post.author_username }}</p>
            </div>
          </div>

          <div class="post-stats">
            <div v-if="post.view_count" class="stat-item">
              <Eye :size="20" />
              <span>{{ formatNumber(post.view_count) }} {{ $t('post.views') }}</span>
            </div>
            <div v-if="post.like_count" class="stat-item">
              <Heart :size="20" />
              <span>{{ formatNumber(post.like_count) }} {{ $t('post.likes') }}</span>
            </div>
            <div v-if="post.comment_count" class="stat-item">
              <MessageCircle :size="20" />
              <span>{{ formatNumber(post.comment_count) }} {{ $t('post.comments') }}</span>
            </div>
          </div>

          <div v-if="post.description" class="post-description">
            <p>{{ post.description }}</p>
          </div>

          <div class="post-actions">
            <GlassButton @click="toggleFavorite">
              <Heart :size="18" :fill="isFavorited ? 'currentColor' : 'none'" />
              {{ $t('favorite.add') }}
            </GlassButton>
            <a v-if="post.url" :href="post.url" target="_blank" rel="noopener noreferrer">
              <GlassButton variant="secondary">
                <ExternalLink :size="18" />
                {{ $t('post.viewOriginal') }}
              </GlassButton>
            </a>
          </div>
        </div>

        <!-- 媒体文件 -->
        <div v-if="post.media_files && post.media_files.length > 0" class="media-section">
          <h2>{{ $t('post.media') }} ({{ post.media_files.length }})</h2>
          <div class="media-grid">
            <div
              v-for="(media, index) in post.media_files"
              :key="media.id"
              class="media-item glass-card"
            >
              <img
                v-if="media.file_type === 'image'"
                :src="`/api/media/${media.id}/stream`"
                :alt="post.title || ''"
                loading="lazy"
                @click="openMediaViewer(getMediaIndex(index))"
                class="clickable-image"
              />
              <div
                v-else-if="media.file_type === 'video'"
                class="video-thumbnail"
                @click="openMediaViewer(getMediaIndex(index))"
              >
                <video preload="none" poster="">
                  <source :src="`/api/media/${media.id}/stream`" type="video/mp4" />
                </video>
                <div class="video-play-overlay">
                  <div class="play-button">
                    <svg width="64" height="64" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="30" fill="rgba(255,255,255,0.9)" />
                      <polygon points="26,20 26,44 44,32" fill="#000" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 标签 -->
        <div v-if="post.tags && post.tags.length > 0" class="tags-section glass-card">
          <h3>{{ $t('post.tags') }}</h3>
          <div class="tags-list">
            <span v-for="tag in post.tags" :key="tag" class="tag glass-badge">
              {{ tag }}
            </span>
          </div>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-else class="error-state glass-card">
        <AlertCircle :size="64" />
        <h3>{{ $t('common.error') }}</h3>
        <p>Post not found</p>
        <GlassButton @click="goBack">
          {{ $t('common.back') }}
        </GlassButton>
      </div>
    </div>

    <!-- 媒体查看器 -->
    <MediaViewer
      :show="showMediaViewer"
      :media-items="viewerMediaItems"
      :initial-index="viewerInitialIndex"
      @close="closeMediaViewer"
    />
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useMediaPreload } from '@/composables/useSmartPreload'
import { hasViewedPost, markPostAsViewed } from '@/utils/viewTracking'
import logger from '@/utils/logger'
import {
  ArrowLeft,
  Calendar,
  User,
  Eye,
  Heart,
  MessageCircle,
  ExternalLink,
  AlertCircle,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Repeat2,
} from 'lucide-vue-next'
import dayjs from 'dayjs'

import MainLayout from '@/components/layout/MainLayout.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import GlassButton from '@/components/ui/GlassButton.vue'
import MediaViewer from '@/components/ui/MediaViewer.vue'

import { usePostsStore } from '@/stores/posts'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api/client'
import { favoritesApi } from '@/api/services'
import type { PostDetail } from '@/types'
import { PLATFORM_NAMES, PLATFORM_COLORS } from '@/types'
import toast from '@/utils/toast'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const postsStore = usePostsStore()
const authStore = useAuthStore()

const post = ref<PostDetail | null>(null)
const loading = ref(true)
const isFavorited = ref(false)
const favoriteId = ref<number | null>(null)
const favoriteLoading = ref(false)
const showMediaViewer = ref(false)
const viewerMediaItems = ref<Array<{ url: string; type: 'image' | 'video' }>>([])
const viewerInitialIndex = ref(0)
const currentThumbnailIndex = ref(0)

const platformName = computed(
  () => PLATFORM_NAMES[post.value?.platform as keyof typeof PLATFORM_NAMES] || post.value?.platform,
)
const platformColor = computed(
  () => PLATFORM_COLORS[post.value?.platform as keyof typeof PLATFORM_COLORS] || '#666',
)

// 判断是否为转发
const isRetweet = computed(() => {
  return !!post.value?.original_author_id && !!post.value?.original_author_name
})

// 所有媒体项（包括缩略图、图片和视频）
const allMediaItems = computed(() => {
  if (!post.value) return []

  const items: Array<{ url: string; type: 'image' | 'video' }> = []
  const hasThumbnail = !!post.value.thumbnail_url

  // 1. 添加缩略图（如果存在）
  if (hasThumbnail) {
    items.push({
      url: post.value.thumbnail_url!,
      type: 'image',
    })
  }

  // 2. 添加媒体文件中的图片和视频
  if (post.value.media_files && post.value.media_files.length > 0) {
    post.value.media_files.forEach((media, index) => {
      if (media.file_type === 'image' || media.file_type === 'video') {
        const mediaUrl = `/api/media/${media.id}/stream`

        // 如果有缩略图，跳过第一个媒体文件（如果是图片）
        // 因为缩略图通常就是第一张图片的缩略版
        if (hasThumbnail && index === 0 && media.file_type === 'image') {
          return // 跳过第一张图片以避免重复
        }

        items.push({
          url: mediaUrl,
          type: media.file_type as 'image' | 'video',
        })
      }
    })
  }

  return items
})

// 所有图片（仅用于缩略图导航）
const allImages = computed(() => {
  return allMediaItems.value.filter((item) => item.type === 'image').map((item) => item.url)
})

// 当前缩略图URL
const currentThumbnailUrl = computed(() => {
  if (allImages.value.length === 0) return ''
  return allImages.value[currentThumbnailIndex.value]
})

onMounted(async () => {
  const postId = parseInt(route.params.id as string, 10)
  try {
    post.value = await postsStore.fetchPost(postId)

    // 增加浏览计数（如果该帖子未被浏览过）
    if (post.value && !hasViewedPost(postId)) {
      try {
        await api.post(`/posts/${postId}/increment-view`)
        markPostAsViewed(postId)
        logger.log('📊 Post view counted:', postId)
      } catch (error) {
        logger.warn('Failed to increment view count:', error)
      }
    }

    // 检查是否已收藏
    if (authStore.isAuthenticated && post.value) {
      try {
        const result = await favoritesApi.checkFavorite(post.value.id)
        isFavorited.value = result.is_favorited
        favoriteId.value = result.favorite_id
      } catch (error) {
        // 忽略错误
      }
    }
  } catch (error) {
    logger.error('Failed to fetch post:', error)
  } finally {
    loading.value = false
  }
})

const goBack = () => {
  router.back()
}

const toggleFavorite = async () => {
  // 检查登录状态
  if (!authStore.isAuthenticated) {
    toast.warning(t('favorite.loginRequired'))
    router.push('/login')
    return
  }

  if (!post.value || favoriteLoading.value) return

  favoriteLoading.value = true
  try {
    if (isFavorited.value && favoriteId.value) {
      // 删除收藏
      await favoritesApi.deleteFavorite(favoriteId.value)
      isFavorited.value = false
      favoriteId.value = null
      toast.success(t('favorite.removeSuccess'))
    } else {
      // 添加收藏
      const favorite = await favoritesApi.addFavorite({ post_id: post.value.id })
      isFavorited.value = true
      favoriteId.value = favorite.id
      toast.success(t('favorite.addSuccess'))
    }
  } catch (error: any) {
    console.error('Failed to toggle favorite:', error)
    toast.error(error.response?.data?.message || t('common.operationFailed'))
  } finally {
    favoriteLoading.value = false
  }
}

const formatDate = (dateStr: string): string => {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm')
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

const openMediaViewer = (mediaIndex: number) => {
  if (!post.value) return

  viewerMediaItems.value = allMediaItems.value
  viewerInitialIndex.value = mediaIndex
  showMediaViewer.value = true
}

const getMediaIndex = (mediaFileIndex: number): number => {
  // 计算媒体文件在allMediaItems中的实际索引
  // 如果有缩略图，索引需要+1
  const offset = post.value?.thumbnail_url ? 1 : 0
  return offset + mediaFileIndex
}

const closeMediaViewer = () => {
  showMediaViewer.value = false
}

// 媒体预加载
useMediaPreload(allMediaItems, currentThumbnailIndex, {
  lookahead: 2,
  enabled: true,
})

// 缩略图导航
const prevThumbnail = () => {
  if (currentThumbnailIndex.value > 0) {
    currentThumbnailIndex.value--
  }
}

const nextThumbnail = () => {
  if (currentThumbnailIndex.value < allImages.value.length - 1) {
    currentThumbnailIndex.value++
  }
}
</script>

<style scoped>
.post-detail-page {
  max-width: 1000px;
  margin: 0 auto;
}

.back-button {
  margin-bottom: var(--spacing-lg);
}

.post-header {
  padding: var(--spacing-2xl);
  margin-bottom: var(--spacing-xl);
}

.post-thumbnail-container {
  position: relative;
  width: 100%;
  max-width: 800px;
  margin: 0 auto var(--spacing-xl);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.post-thumbnail {
  position: relative;
  flex: 1;
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s ease;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-secondary);
}

.post-thumbnail:hover {
  transform: scale(1.02);
}

.post-thumbnail:hover .thumbnail-overlay {
  opacity: 1;
}

.post-thumbnail img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
  max-height: 600px;
  min-height: 400px;
}

.thumbnail-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  cursor: pointer;
  transition: all 0.3s ease;
}

.thumbnail-counter {
  position: absolute;
  bottom: 12px;
  right: 12px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  color: white;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 5;
  letter-spacing: 0.5px;
}

.thumbnail-nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 10;
}

.thumbnail-nav-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.8);
  transform: translateY(-50%) scale(1.15);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.thumbnail-nav-btn.nav-btn-disabled {
  opacity: 0.25;
  cursor: not-allowed;
  background: rgba(0, 0, 0, 0.3);
}

.thumbnail-nav-btn:disabled {
  cursor: not-allowed;
}

.prev-thumbnail-btn {
  left: 12px;
}

.next-thumbnail-btn {
  right: 12px;
}

/* 缩略图切换动画 */
.thumbnail-fade-enter-active,
.thumbnail-fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.thumbnail-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.thumbnail-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.clickable-image {
  cursor: pointer;
  transition: transform 0.3s ease;
}

.clickable-image:hover {
  transform: scale(1.05);
}

.post-title {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-lg);
  line-height: var(--line-tight);
}

.post-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
}

.retweet-indicator {
  color: #22c55e !important;
  font-weight: var(--font-semibold);
}

.retweet-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-md);
  background: rgba(34, 197, 94, 0.05);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.retweeter-info,
.original-author-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.retweet-arrow {
  color: #22c55e;
  display: flex;
  align-items: center;
}

.original-author-info {
  flex: 1;
}

.author-avatar.original {
  background: rgba(139, 92, 246, 0.2);
}

.original-label {
  display: inline-block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #22c55e;
  font-weight: var(--font-semibold);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.platform-badge {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-sm);
  color: white;
  font-weight: var(--font-semibold);
}

.author-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--glass-bg-light);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-lg);
}

.author-avatar {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-full);
  background: var(--gradient-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.author-details h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.author-details p {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

.post-stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-xl);
  padding: var(--spacing-lg) 0;
  border-top: 1px solid var(--glass-border);
  border-bottom: 1px solid var(--glass-border);
  margin-bottom: var(--spacing-lg);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--color-text-secondary);
  font-size: var(--text-base);
}

.post-description {
  margin-bottom: var(--spacing-xl);
}

.post-description p {
  color: var(--color-text-secondary);
  font-size: var(--text-lg);
  line-height: var(--line-relaxed);
  white-space: pre-wrap;
}

.post-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.media-section {
  margin-bottom: var(--spacing-xl);
}

.media-section h2 {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-lg);
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.media-item {
  overflow: hidden;
}

.media-item img,
.media-item video {
  width: 100%;
  height: auto;
  display: block;
}

.video-thumbnail {
  position: relative;
  cursor: pointer;
  overflow: hidden;
}

.video-thumbnail video {
  pointer-events: none;
}

.video-play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.video-thumbnail:hover .video-play-overlay {
  background: rgba(0, 0, 0, 0.5);
}

.play-button {
  transition: transform 0.3s ease;
}

.video-thumbnail:hover .play-button {
  transform: scale(1.1);
}

.tags-section {
  padding: var(--spacing-xl);
}

.tags-section h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.tag {
  font-size: var(--text-sm);
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-3xl);
  text-align: center;
  color: var(--color-text-tertiary);
}

@media (max-width: 768px) {
  .post-title {
    font-size: var(--text-2xl);
  }

  .media-grid {
    grid-template-columns: 1fr;
  }
}
</style>
