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
        <div
          class="post-header glass-card"
          :class="{
            'video-layout': isVideoPost,
            'youtube-layout': isYouTube,
            'tiktok-layout': isTikTok,
          }"
        >
          <!-- 缩略图区域 -->
          <div v-if="post.thumbnail_url" class="post-thumbnail-container">
            <!-- 上一张按钮 -->
            <button
              v-show="allMediaUrls.length > 1"
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
                  loading="eager"
                  decoding="async"
                  fetchpriority="high"
                />
              </transition>
              <div class="thumbnail-overlay">
                <Maximize2 :size="32" />
              </div>
              <!-- 图片计数 -->
              <div v-if="allMediaUrls.length > 1" class="thumbnail-counter">
                {{ currentThumbnailIndex + 1 }} / {{ allMediaUrls.length }}
              </div>
            </div>

            <!-- 下一张按钮 -->
            <button
              v-show="allMediaUrls.length > 1"
              class="thumbnail-nav-btn next-thumbnail-btn"
              :class="{ 'nav-btn-disabled': currentThumbnailIndex === allMediaUrls.length - 1 }"
              @click.stop="nextThumbnail"
              :disabled="currentThumbnailIndex === allMediaUrls.length - 1"
              :aria-label="$t('common.next')"
            >
              <ChevronRight :size="20" />
            </button>
          </div>

          <!-- 内容区域 -->
          <div class="post-content-wrapper">
            <!-- 1. Post Meta -->
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

            <!-- 2. Author Info -->
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
            <RouterLink
              v-if="!isRetweet && post.author_name"
              :to="`/authors/${post.author_id || 0}`"
              custom
              v-slot="{ navigate }"
            >
              <div class="author-info clickable" @click="navigate" role="button" tabindex="0">
                <div class="author-avatar">
                  <User :size="24" />
                </div>
                <div class="author-details">
                  <h3>{{ post.author_name }}</h3>
                  <p v-if="post.author_username">@{{ post.author_username }}</p>
                </div>
                <ExternalLink :size="18" class="link-icon" />
              </div>
            </RouterLink>

            <!-- 3. Post Title -->
            <h1 class="post-title">{{ post.title || 'Untitled' }}</h1>

            <div v-if="showDescription" class="post-description">
              <p>{{ post.description }}</p>
            </div>

            <!-- 4. Post Stats -->
            <a
              v-if="post.url"
              :href="post.url"
              target="_blank"
              rel="noopener noreferrer"
              class="stats-link"
            >
              <div class="post-stats clickable">
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
                <ExternalLink :size="16" class="link-icon" />
              </div>
            </a>
            <div v-else class="post-stats">
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

            <!-- 5. Post Actions -->
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
                :src="mediaApi.getStreamUrl(media.id)"
                :alt="post.title || ''"
                loading="lazy"
                decoding="async"
                @click="openMediaViewer(getMediaIndex(index))"
                class="clickable-image"
              />
              <div
                v-else-if="media.file_type === 'video'"
                class="video-thumbnail"
                @click="openMediaViewer(getMediaIndex(index))"
              >
                <video preload="none" poster="">
                  <source :src="mediaApi.getStreamUrl(media.id)" type="video/mp4" />
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
import { useErrorHandler } from '@/utils/errorHandler'
import { resolveMediaUrl, validateMediaId } from '@/utils/url'
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
import MediaViewer from '@/components/ui/MediaViewerPlyr.vue'

import { usePostsStore } from '@/stores/posts'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api/client'
import { favoritesApi, mediaApi } from '@/api/services'
import type { PostDetail, UUID } from '@/types'
import { PLATFORM_NAMES, PLATFORM_COLORS } from '@/types'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { handleError } = useErrorHandler('PostDetailPage')
const toastStore = useToastStore()
const postsStore = usePostsStore()
const authStore = useAuthStore()

const post = ref<PostDetail | null>(null)
const loading = ref(true)
const isFavorited = ref(false)
const favoriteId = ref<UUID | null>(null)
const favoriteLoading = ref(false)
const showMediaViewer = ref(false)
const viewerMediaItems = ref<
  Array<{
    url: string
    type: 'image' | 'video'
    subtitle?: string // 保留向后兼容
    subtitles?: Array<{ language: string; format: string; label: string }> // 新增：多语言字幕
  }>
>([])
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

// 判断是否显示描述（避免与标题重复）
const showDescription = computed(() => {
  if (!post.value?.description) return false
  const title = (post.value.title || '').trim().toLowerCase()
  const description = post.value.description.trim().toLowerCase()
  // 如果描述为空或与标题完全相同，则不显示
  if (!description || description === title) return false
  // 如果描述只比标题多几个字符（容差10个字符），也不显示
  if (Math.abs(description.length - title.length) < 10 && description.includes(title)) return false
  return true
})

// 所有媒体项（包括缩略图、图片和视频）
const allMediaItems = computed(() => {
  if (!post.value) return []

  const items: Array<{
    url: string
    type: 'image' | 'video'
    subtitle?: string
    subtitles?: Array<{ language: string; format: string; label: string }>
    mediaId?: UUID // 添加mediaId用于生成字幕URL
  }> = []
  const hasThumbnail = !!post.value.thumbnail_url

  // 1. 添加缩略图（如果存在）
  if (hasThumbnail) {
    items.push({
      url: resolveMediaUrl(post.value.thumbnail_url),
      type: 'image',
    })
  }

  // 2. 添加媒体文件中的图片和视频
  if (post.value.media_files && post.value.media_files.length > 0) {
    post.value.media_files.forEach((media, index) => {
      if (media.file_type === 'image' || media.file_type === 'video') {
        const mediaUrl = mediaApi.getStreamUrl(media.id)

        // 如果有缩略图，跳过第一个媒体文件（如果是图片）
        // 因为缩略图通常就是第一张图片的缩略版
        if (hasThumbnail && index === 0 && media.file_type === 'image') {
          return // 跳过第一张图片以避免重复
        }

        const item: {
          url: string
          type: 'image' | 'video'
          subtitle?: string
          subtitles?: Array<{ language: string; format: string; label: string }>
          mediaId?: UUID
        } = {
          url: mediaUrl,
          type: media.file_type as 'image' | 'video',
          mediaId: media.id,
        }

        // 如果是视频且有字幕，添加字幕信息
        if (media.file_type === 'video') {
          // 优先使用新的subtitles数组（多语言支持）
          if (media.subtitles && Array.isArray(media.subtitles) && media.subtitles.length > 0) {
            item.subtitles = media.subtitles
            // 向后兼容：保留subtitle字段（默认语言）
            item.subtitle = mediaApi.getSubtitleUrl(media.id)
          } else if (media.has_subtitle) {
            // 回退到旧的单字幕模式
            item.subtitle = mediaApi.getSubtitleUrl(media.id)
          }
        }

        items.push(item)
      }
    })
  }

  return items
})

// 所有图片（仅用于缩略图导航）
// const allImages = computed(() => {
//   return allMediaItems.value.filter((item) => item.type === 'image').map((item) => item.url)
// })

// 所有媒体URL（用于导航按钮显示）
const allMediaUrls = computed(() => {
  return allMediaItems.value.map((item) => item.url)
})

// 当前缩略图URL
const currentThumbnailUrl = computed(() => {
  if (allMediaUrls.value.length === 0) return ''
  return allMediaUrls.value[currentThumbnailIndex.value]
})

// 判断主要媒体类型
const primaryMediaType = computed(() => {
  if (!post.value?.media_files || post.value.media_files.length === 0) return 'image'
  // 检查第一个媒体文件的类型
  const firstMedia = post.value.media_files[0]
  return firstMedia?.file_type === 'video' ? 'video' : 'image'
})

// 判断是否为视频类型
const isVideoPost = computed(() => primaryMediaType.value === 'video')

// 判断平台类型
const isYouTube = computed(() => post.value?.platform === 'youtube')
const isTikTok = computed(() => post.value?.platform === 'tiktok')
// const isInstagramOrTwitter = computed(
//   () => post.value?.platform === 'instagram' || post.value?.platform === 'twitter',
// )

onMounted(async () => {
  const postId = route.params.id as UUID
  try {
    post.value = await postsStore.fetchPost(postId)

    // 验证媒体文件ID格式（诊断用）
    if (import.meta.env.DEV && post.value?.media_files && post.value.media_files.length > 0) {
      console.group('[PostDetailPage] Media ID Validation')
      post.value.media_files.forEach((media, index) => {
        const isValid = validateMediaId(media.id, `PostDetailPage(post=${postId}, media[${index}])`)
        if (!isValid) {
          console.log('Media File Details:', {
            index,
            id: media.id,
            id_type: typeof media.id,
            file_type: media.file_type,
            file_path: media.file_path
          })
        }
      })
      console.groupEnd()
    }

    // 增加浏览计数（如果该帖子未被浏览过）
    if (post.value && !hasViewedPost(postId)) {
      try {
        await api.post(`/posts/${postId}/increment-view`)
        markPostAsViewed(postId)
        console.debug('[PostDetailPage] Post view counted:', postId)
      } catch (error) {
        console.debug('[PostDetailPage] Failed to increment view count:', error)
      }
    }

    // 检查是否已收藏
    if (authStore.isAuthenticated && post.value) {
      try {
        const result = await favoritesApi.checkFavorite(post.value.id)
        isFavorited.value = result.is_favorited
        favoriteId.value = result.favorite_id
      } catch {
        // 忽略错误
      }
    }
  } catch (error) {
    handleError(error, { customMessage: t('post.loadFailed', 'Failed to load post') })
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
    toastStore.warning(t('favorite.loginRequired'))
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
      toastStore.success(t('favorite.removeSuccess'))
    } else {
      // 添加收藏
      const favorite = await favoritesApi.addFavorite({ post_id: post.value.id })
      isFavorited.value = true
      favoriteId.value = favorite.id
      toastStore.success(t('favorite.addSuccess'))
    }
  } catch (error) {
    const errorMsg =
      (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
      t('common.operationFailed')
    handleError(error, { customMessage: errorMsg })
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
  if (currentThumbnailIndex.value < allMediaUrls.value.length - 1) {
    currentThumbnailIndex.value++
  }
}
</script>

<style scoped>
.post-detail-page {
  max-width: 1920px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.post-detail {
  width: 100%;
}

.back-button {
  margin-bottom: var(--spacing-lg);
  transition: all var(--transition-base);
  backdrop-filter: blur(12px);
}

.back-button:hover {
  transform: translateX(-4px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
}

.post-header {
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  background: transparent;
  border: none;
  box-shadow: none;
}

/* 宽屏优化布局 (>1200px) */
@media (min-width: 1200px) {
  .post-detail-page {
    padding: 0 var(--spacing-2xl);
  }

  /* 统一布局：简洁的左右分栏（图片和视频都使用） */
  .post-header {
    display: flex;
    gap: var(--spacing-3xl);
    padding: var(--spacing-2xl);
    overflow: visible;
  }

  .post-thumbnail-container {
    flex: 1.4;
    min-width: 0;
    position: relative;
    overflow: visible;
  }

  .post-content-wrapper {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
  }
}

.post-thumbnail-container {
  position: relative;
  width: 100%;
  margin: 0 0 var(--spacing-xl) 0;
  overflow: visible;
}

/* 宽屏布局中移除margin，由flex gap控制间距 */
@media (min-width: 1200px) {
  .post-thumbnail-container {
    margin: 0;
  }
}

.post-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.post-thumbnail {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: 600px;
  border-radius: var(--radius-2xl);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  background:
    linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(192, 132, 252, 0.05) 100%),
    var(--color-bg-secondary);
  box-shadow:
    0 20px 60px -10px rgba(0, 0, 0, 0.2),
    0 8px 24px -6px rgba(139, 92, 246, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.1);
  will-change: transform, box-shadow;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (min-width: 1200px) {
  .post-thumbnail {
    max-height: 700px;
  }

  /* 图片类型帖子：让图片自然显示 */
  .post-header:not(.video-layout) .post-thumbnail {
    aspect-ratio: auto;
    height: auto;
  }

  .post-header:not(.video-layout) .post-thumbnail img {
    max-height: 85vh;
    width: 100%;
    height: auto;
  }

  /* 视频类型帖子：保持16:9比例 */
  .post-header.video-layout .post-thumbnail {
    aspect-ratio: 16 / 9;
    max-height: none;
    height: auto;
  }

  .post-header.video-layout .post-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* YouTube：独占一行的布局 */
  .post-header.youtube-layout {
    flex-direction: column;
  }

  .post-header.youtube-layout .post-thumbnail-container {
    flex: none;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  }

  .post-header.youtube-layout .post-thumbnail {
    aspect-ratio: 16 / 9;
  }

  .post-header.youtube-layout .post-content-wrapper {
    flex: none;
    width: 100%;
  }

  /* TikTok：竖屏比例 */
  .post-header.tiktok-layout .post-thumbnail {
    aspect-ratio: 9 / 16;
    max-height: 700px;
  }
}

.post-thumbnail:hover {
  transform: translateY(-4px) scale(1.01);
  box-shadow:
    0 28px 80px -12px rgba(0, 0, 0, 0.25),
    0 12px 32px -8px rgba(139, 92, 246, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  border-color: rgba(139, 92, 246, 0.2);
}

.post-thumbnail:hover .thumbnail-overlay {
  opacity: 1;
}

/* 移除active状态避免点击按钮时容器变色 */
/* .post-thumbnail:active {
  transform: translateY(-2px) scale(1.005);
} */

.post-thumbnail img {
  width: 100%;
  height: auto;
  max-height: 800px;
  display: block;
  object-fit: contain;
  position: relative;
  z-index: 1;
}

/* 视频类型帖子的缩略图使用cover以填充空间 */
.post-header.video-layout .post-thumbnail img {
  height: 100%;
  object-fit: cover;
}

.thumbnail-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.85) 0%, rgba(192, 132, 252, 0.85) 100%);
  backdrop-filter: blur(8px) saturate(150%);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  color: white;
  z-index: 2;
  pointer-events: none;
}

.thumbnail-counter {
  position: absolute;
  bottom: var(--spacing-lg);
  right: var(--spacing-lg);
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(16px) saturate(180%);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-full);
  color: white;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  z-index: 5;
  letter-spacing: 0.05em;
}

.thumbnail-nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 52px;
  height: 52px;
  border-radius: var(--radius-full);
  background: rgba(139, 92, 246, 0.9);
  backdrop-filter: blur(20px) saturate(180%);
  border: 2px solid rgba(255, 255, 255, 0.25);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 10px 30px rgba(139, 92, 246, 0.4),
    0 4px 12px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  z-index: 10;
}

@media (min-width: 1200px) {
  .thumbnail-nav-btn {
    width: 60px;
    height: 60px;
  }
}

.thumbnail-nav-btn:hover:not(:disabled) {
  background: rgba(139, 92, 246, 1);
  transform: translateY(-50%) scale(1.1);
  box-shadow:
    0 14px 40px rgba(139, 92, 246, 0.5),
    0 6px 16px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.35);
}

.thumbnail-nav-btn.nav-btn-disabled {
  opacity: 0.3;
  cursor: not-allowed;
  background: rgba(139, 92, 246, 0.3);
}

.thumbnail-nav-btn:disabled {
  cursor: not-allowed;
}

.prev-thumbnail-btn {
  left: var(--spacing-md);
}

.next-thumbnail-btn {
  right: var(--spacing-md);
}

@media (min-width: 1200px) {
  .prev-thumbnail-btn {
    left: var(--spacing-lg);
  }

  .next-thumbnail-btn {
    right: var(--spacing-lg);
  }
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
  font-size: var(--text-3xl);
  font-weight: 800;
  color: var(--color-text-primary);
  line-height: 1.2;
  word-break: break-word;
  letter-spacing: -0.03em;
  margin-bottom: var(--spacing-sm);
  background: linear-gradient(135deg, var(--color-text-primary) 0%, rgba(139, 92, 246, 0.9) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@media (min-width: 1200px) {
  .post-title {
    font-size: var(--text-4xl);
  }
}

.post-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-md);
}

.retweet-indicator {
  color: #22c55e !important;
  font-weight: var(--font-semibold);
}

.retweet-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  background: rgba(34, 197, 94, 0.05);
  border-radius: var(--radius-xl);
  border: 1px solid rgba(34, 197, 94, 0.2);
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .retweet-info {
    padding: var(--spacing-md);
    gap: var(--spacing-md);
  }
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
  background:
    linear-gradient(135deg, rgba(139, 92, 246, 0.03) 0%, rgba(192, 132, 252, 0.03) 100%),
    var(--glass-bg-light);
  border-radius: var(--radius-2xl);
  border: 1px solid rgba(139, 92, 246, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  position: relative;
}

.author-info.clickable {
  cursor: pointer;
}

.author-info.clickable:hover {
  background:
    linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(192, 132, 252, 0.08) 100%),
    var(--glass-bg-light);
  border-color: rgba(139, 92, 246, 0.3);
  transform: translateY(-2px);
  box-shadow:
    0 8px 24px rgba(139, 92, 246, 0.15),
    0 4px 12px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.author-info .link-icon {
  margin-left: auto;
  color: var(--color-primary);
  opacity: 0.6;
  transition: opacity 0.3s ease;
}

.author-info.clickable:hover .link-icon {
  opacity: 1;
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

.stats-link {
  text-decoration: none;
  display: block;
}

.post-stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  background:
    linear-gradient(135deg, rgba(139, 92, 246, 0.02) 0%, rgba(192, 132, 252, 0.02) 100%),
    var(--glass-bg-light);
  border-radius: var(--radius-2xl);
  border: 1px solid rgba(139, 92, 246, 0.08);
  flex-wrap: wrap;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.03),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  position: relative;
}

.post-stats.clickable {
  cursor: pointer;
}

.post-stats.clickable:hover {
  background:
    linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(192, 132, 252, 0.05) 100%),
    var(--glass-bg-light);
  border-color: rgba(139, 92, 246, 0.15);
  box-shadow:
    0 4px 12px rgba(139, 92, 246, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.post-stats .link-icon {
  margin-left: auto;
  color: var(--color-primary);
  opacity: 0.6;
  transition: opacity 0.3s ease;
}

.post-stats.clickable:hover .link-icon {
  opacity: 1;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--color-text-secondary);
  font-size: var(--text-base);
}

.post-description {
  padding: var(--spacing-lg);
  background:
    linear-gradient(135deg, rgba(139, 92, 246, 0.02) 0%, rgba(192, 132, 252, 0.02) 100%),
    var(--glass-bg-light);
  border-radius: var(--radius-2xl);
  border: 1px solid rgba(139, 92, 246, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.03),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.post-description p {
  color: var(--color-text-secondary);
  font-size: var(--text-base);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (min-width: 1200px) {
  .post-description {
    padding: var(--spacing-xl);
  }

  .post-description p {
    font-size: var(--text-lg);
    line-height: 1.75;
  }
}

.post-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.post-actions a {
  display: inline-flex;
}

.media-section {
  margin-top: var(--spacing-2xl);
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

/* 移动端瀑布流使用单列但保持自然高度 */
@media (max-width: 768px) {
  .media-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
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

/* 平板优化 (769px-1199px) */
@media (min-width: 769px) and (max-width: 1199px) {
  .post-detail-page {
    max-width: 960px;
    padding: 0 var(--spacing-xl);
  }

  .post-header {
    padding: var(--spacing-2xl);
    display: block;
  }

  .post-thumbnail-container {
    margin-bottom: var(--spacing-xl);
  }
}

/* 移动端优化 */
@media (max-width: 768px) {
  .post-detail-page {
    max-width: 100%;
    padding: 0 var(--spacing-md);
  }

  .post-header {
    padding: var(--spacing-lg);
    display: block;
  }

  .post-thumbnail-container {
    margin-bottom: var(--spacing-lg);
  }

  .post-title {
    font-size: var(--text-2xl);
  }

  .post-description {
    padding: var(--spacing-md);
  }

  .author-info,
  .post-stats {
    padding: var(--spacing-md);
  }

  .thumbnail-nav-btn {
    width: 40px;
    height: 40px;
  }

  .prev-thumbnail-btn {
    left: var(--spacing-sm);
  }

  .next-thumbnail-btn {
    right: var(--spacing-sm);
  }

  .back-button {
    margin-bottom: var(--spacing-md);
  }
}
</style>
