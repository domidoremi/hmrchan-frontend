<template>
  <MainLayout>
    <div class="post-detail-page">
      <!-- 骨架屏加载状态 -->
      <div v-if="loading" class="skeleton-loader">
        <div class="skeleton-back-btn"></div>
        <div class="skeleton-card">
          <div class="skeleton-thumbnail"></div>
          <div class="skeleton-content">
            <div class="skeleton-meta"></div>
            <div class="skeleton-title"></div>
            <div class="skeleton-description"></div>
            <div class="skeleton-author"></div>
            <div class="skeleton-stats"></div>
            <div class="skeleton-actions"></div>
          </div>
        </div>
      </div>

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
                  v-if="currentMediaType !== 'video'"
                  :key="`image-${currentThumbnailUrl}`"
                  :src="currentThumbnailUrl"
                  :alt="post.title || 'Post thumbnail'"
                  loading="eager"
                  decoding="async"
                  fetchpriority="high"
                />
                <video
                  v-else
                  :key="`video-${currentThumbnailUrl}`"
                  :src="currentThumbnailUrl"
                  preload="metadata"
                  playsinline
                  muted
                  :poster="post.thumbnail_url ? resolveMediaUrl(post.thumbnail_url) : undefined"
                ></video>
              </transition>
              <div class="thumbnail-overlay" :class="{ 'is-video': currentMediaType === 'video' }">
                <component :is="currentMediaType === 'video' ? Play : Maximize2" :size="32" />
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
              <GlassButton 
                @click="toggleFavorite"
                :class="{ 'favorited': isFavorited }"
                :disabled="favoriteLoading"
                :title="isFavorited ? $t('favorite.remove') : $t('favorite.add')"
              >
                <Heart :size="18" :fill="isFavorited ? 'currentColor' : 'none'" />
                <span class="action-label">{{ isFavorited ? $t('favorite.remove') : $t('favorite.add') }}</span>
              </GlassButton>
              <GlassButton 
                v-if="post.url"
                @click="copyLink(post.url)"
                variant="secondary"
                :title="$t('post.copyLink')"
              >
                <Link :size="18" />
                <span class="action-label">{{ $t('post.copyLink') }}</span>
              </GlassButton>
              <a v-if="post.url" :href="post.url" target="_blank" rel="noopener noreferrer">
                <GlassButton variant="secondary" :title="$t('post.viewOriginal')">
                  <ExternalLink :size="18" />
                  <span class="action-label">{{ $t('post.viewOriginal') }}</span>
                </GlassButton>
              </a>
            </div>
          </div>
        </div>

        <!-- 相关推荐 -->
        <div v-if="relatedPosts.length > 0" class="related-posts glass-card">
          <h3 class="related-title">
            <Sparkles :size="20" />
            {{ $t('post.relatedPosts') }}
          </h3>
          <div class="related-grid">
            <RouterLink
              v-for="relatedPost in relatedPosts"
              :key="relatedPost.id"
              :to="`/posts/${relatedPost.id}`"
              class="related-item"
            >
              <img 
                v-if="relatedPost.thumbnail_url" 
                :src="resolveMediaUrl(relatedPost.thumbnail_url)" 
                :alt="relatedPost.title || ''"
                loading="lazy"
              />
              <div class="related-info">
                <h4>{{ relatedPost.title || $t('post.untitled') }}</h4>
                <div class="related-stats">
                  <span v-if="relatedPost.view_count">
                    <Eye :size="14" /> {{ formatNumber(relatedPost.view_count) }}
                  </span>
                  <span v-if="relatedPost.like_count">
                    <Heart :size="14" /> {{ formatNumber(relatedPost.like_count) }}
                  </span>
                </div>
              </div>
            </RouterLink>
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
  Link,
  Sparkles,
  Play,
} from 'lucide-vue-next'
import dayjs from 'dayjs'

import MainLayout from '@/components/layout/MainLayout.vue'
import GlassButton from '@/components/ui/GlassButton.vue'
import MediaViewer from '@/components/ui/MediaViewerPlyr.vue'

import { usePostsStore } from '@/stores/posts'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api/client'
import { favoritesApi, mediaApi } from '@/api/services'
import type { PostDetail, Post, UUID, PostListParams, PaginatedResponse } from '@/types'
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
const relatedPosts = ref<Post[]>([])

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

const currentMediaItem = computed(() => {
  if (allMediaItems.value.length === 0) return null
  return allMediaItems.value[currentThumbnailIndex.value]
})

const currentMediaType = computed(() => currentMediaItem.value?.type ?? 'image')

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

    // 加载相关推荐（异步，不阻塞页面）
    loadRelatedPosts()
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

// 加载相关推荐（直接调用API，不污染全局posts状态）
const loadRelatedPosts = async () => {
  if (!post.value) return
  
  try {
    // 基于标签和平台获取相关帖子
    const baseParams: PostListParams = {
      page: 1,
      page_size: 6,
      sort_by: 'view_count',
      sort_order: 'desc',
    }
    
    // 优先使用相同平台
    if (post.value.platform) {
      baseParams.platform = post.value.platform
    }
    
    // 直接调用API，不通过store避免污染全局状态
    const response = await api.get<PaginatedResponse<Post>>('/posts', {
      params: baseParams,
    })
    
    // 过滤掉当前帖子
    relatedPosts.value = (response?.items || []).filter(
      (p: Post) => p.id !== post.value!.id
    ).slice(0, 4) // 最多显示4个
  } catch (error) {
    console.debug('[PostDetailPage] Failed to load related posts:', error)
  }
}

// 分享功能
const sharePost = async () => {
  if (!post.value) return
  
  const shareData = {
    title: post.value.title || 'Post',
    text: post.value.description || '',
    url: window.location.href,
  }
  
  try {
    if (navigator.share) {
      await navigator.share(shareData)
      toastStore.success(t('post.shareSuccess', 'Shared successfully'))
    } else {
      // 降级：复制链接
      await copyLink(window.location.href)
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.debug('[PostDetailPage] Share failed:', error)
    }
  }
}

// 复制链接
const copyLink = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url)
    toastStore.success(t('post.copySuccess', 'Link copied to clipboard'))
  } catch (error) {
    console.debug('[PostDetailPage] Copy failed:', error)
    toastStore.error(t('post.copyFailed', 'Failed to copy link'))
  }
}

// 键盘快捷键
const handleKeydown = (e: KeyboardEvent) => {
  // ESC: 返回
  if (e.key === 'Escape' && !showMediaViewer.value) {
    goBack()
    return
  }
  
  // 左右箭头：切换图片（当有多张图片时）
  if (!showMediaViewer.value && allMediaUrls.value.length > 1) {
    if (e.key === 'ArrowLeft') {
      prevThumbnail()
    } else if (e.key === 'ArrowRight') {
      nextThumbnail()
    }
  }
  
  // F: 收藏/取消收藏
  if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
    toggleFavorite()
  }
  
  // S: 分享
  if (e.key === 's' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
    sharePost()
  }
}

// 组件挂载时添加键盘事件监听
import { onUnmounted } from 'vue'

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
/* ========================================
   Post Detail Page - Modern Layout
   Material Design + Apple Style
   ======================================== */

.post-detail-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  min-height: calc(100vh - 140px);
  animation: fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.back-button {
  margin-bottom: var(--spacing-lg);
  transition: all var(--transition-base);
  backdrop-filter: blur(12px);
}

.back-button {
  position: sticky;
  top: 100px; /* 进一步增加，适配Samsung Galaxy S20 Ultra */
  z-index: 100;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  margin-bottom: 24px;
  border-radius: 24px;
  font-weight: 600;
  font-size: 14px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  color: var(--color-text-primary);
  cursor: pointer;
  text-decoration: none;
  
  /* Material Design Elevation 2 */
  box-shadow: 
    0 3px 6px -2px rgba(0, 0, 0, 0.12),
    0 6px 12px -3px rgba(0, 0, 0, 0.08);
  
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.back-button:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 6px 12px -3px rgba(139, 92, 246, 0.2),
    0 12px 24px -6px rgba(0, 0, 0, 0.12);
  border-color: rgba(139, 92, 246, 0.4);
}

.back-button:active {
  transform: translateY(0);
  transition-duration: 0.1s;
}

.post-header {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: 0;
  margin-bottom: 32px;
  overflow: hidden;
  
  /* Material Design Elevation 4 */
  box-shadow: 
    0 4px 8px -2px rgba(0, 0, 0, 0.08),
    0 8px 16px -4px rgba(0, 0, 0, 0.12);
  
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.post-header:hover {
  box-shadow: 
    0 6px 12px -3px rgba(139, 92, 246, 0.12),
    0 12px 24px -6px rgba(0, 0, 0, 0.15);
}

.post-thumbnail-container {
  position: relative;
  width: 100%;
  /* 移除aspect-ratio，让图片自适应 */
  background: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.1) 0%,
    rgba(192, 132, 252, 0.1) 100%
  );
  overflow: hidden;
  border-radius: 24px 24px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.post-thumbnail {
  position: relative;
  width: 100%;
  /* 移除固定aspect-ratio和max-height */
  border-radius: var(--radius-2xl);
  overflow: hidden;
  cursor: zoom-in;
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

.post-thumbnail img {
  width: 100%;
  max-width: 100%; /* 不超过容器宽度 */
  height: auto; /* 自适应高度 */
  display: block;
  object-fit: contain;
  position: relative;
  z-index: 1;
}

.post-thumbnail video {
  width: 100%;
  max-width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
  position: relative;
  z-index: 1;
  background: #000;
}

.thumbnail-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.75) 0%, rgba(192, 132, 252, 0.75) 100%);
  backdrop-filter: blur(12px) saturate(180%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  opacity: 0;
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  color: white;
  z-index: 2;
  pointer-events: none;
}

/* Hover效果 - 显示放大提示 */
.post-thumbnail:hover .thumbnail-overlay {
  opacity: 1;
}

.thumbnail-overlay::after {
  content: '点击查看完整大图';
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  opacity: 0.9;
}

.thumbnail-overlay.is-video {
  background: rgba(0, 0, 0, 0.45);
}

.thumbnail-overlay.is-video::after {
  content: '点击播放视频';
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

.retweet-arrow {
  color: #22c55e;
  display: flex;
  align-items: center;
}

.original-author-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
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
  min-width: 60px; /* 防止被压缩 */
  min-height: 60px;
  border-radius: var(--radius-full);
  background: var(--gradient-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0; /* 防止flex布局压缩 */
  aspect-ratio: 1 / 1; /* 保持圆形 */
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
  flex-wrap: nowrap;
  padding: var(--spacing-md);
  border-radius: var(--radius-xl);
  margin: var(--spacing-md) 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.03),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  position: relative;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.post-stats::-webkit-scrollbar {
  display: none;
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
  flex-wrap: nowrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.post-actions::-webkit-scrollbar {
  display: none;
}

.post-actions a {
  display: inline-flex;
}

/* 收藏按钮激活状态 */
.post-actions :deep(.glass-button.favorited) {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(192, 132, 252, 0.2) 100%);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

[data-theme='dark'] .post-actions :deep(.glass-button.favorited) {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(192, 132, 252, 0.3) 100%);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
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
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  .media-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
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
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tags-section h3::before {
  content: '#';
  color: var(--color-primary);
  font-weight: 700;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
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
    padding: var(--spacing-lg); /* 增加移动端内边距 */
    gap: var(--spacing-md); /* 增加元素间隔 */
  }

  .post-stats.clickable .stat-item span {
    display: none;
  }
  
  /* iPhone 14 Pro Max (430x932) 优化 */
  @media (max-width: 430px) {
    .post-stats {
      flex-wrap: nowrap; /* 强制单行显示 */
      gap: var(--spacing-sm);
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    
    .post-stats .stat-item {
      flex-shrink: 0; /* 防止被压缩 */
      min-width: fit-content;
    }
    
    .post-stats .stat-item span {
      font-size: var(--text-sm);
    }
    
    .author-info {
      gap: var(--spacing-md);
    }
    
    .post-title {
      font-size: var(--text-xl);
      line-height: 1.4;
      margin-bottom: var(--spacing-md);
    }
  }
  
  .author-avatar {
    width: 48px;
    height: 48px;
    min-width: 48px;
    min-height: 48px;
  }
  
  .back-button {
    top: 76px; /* 移动端调整位置 */
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
  
  /* 移动端操作按钮优化 */
  .post-actions {
    gap: var(--spacing-sm);
  }
  
  .post-actions .action-label {
    display: none; /* 移动端隐藏文字，只显示图标 */
  }
  
  .post-actions :deep(.glass-button) {
    min-width: auto;
    padding: var(--spacing-sm) var(--spacing-md);
  }
}

/* ========================================
   骨架屏加载状态
   ======================================== */

.skeleton-loader {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-lg);
}

.skeleton-back-btn {
  width: 100px;
  height: 40px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-lg);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-card {
  background: var(--glass-bg);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-xl);
  border: 1px solid var(--glass-border);
}

.skeleton-thumbnail {
  width: 100%;
  height: 400px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-xl);
  margin-bottom: var(--spacing-lg);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.skeleton-meta {
  width: 200px;
  height: 20px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-md);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-title {
  width: 80%;
  height: 32px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-md);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  animation-delay: 0.1s;
}

.skeleton-description {
  width: 100%;
  height: 60px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-md);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  animation-delay: 0.2s;
}

.skeleton-author {
  width: 150px;
  height: 24px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-md);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  animation-delay: 0.3s;
}

.skeleton-stats {
  width: 250px;
  height: 24px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-md);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  animation-delay: 0.4s;
}

.skeleton-actions {
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}

.skeleton-actions::before,
.skeleton-actions::after {
  content: '';
  width: 120px;
  height: 40px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-lg);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  animation-delay: 0.5s;
}

@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* ========================================
   相关推荐
   ======================================== */

.related-posts {
  margin-top: var(--spacing-2xl);
  padding: var(--spacing-xl);
}

.related-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-lg);
}

.related-title svg {
  color: var(--color-primary);
  animation: sparkle 2s ease-in-out infinite;
}

@keyframes sparkle {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.related-item {
  display: flex;
  flex-direction: column;
  background: var(--glass-bg-light);
  border-radius: var(--radius-xl);
  overflow: hidden;
  border: 1px solid var(--glass-border);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  cursor: pointer;
}

.related-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.15);
  border-color: var(--color-primary);
}

.related-item img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.related-item:hover img {
  transform: scale(1.05);
}

.related-info {
  padding: var(--spacing-md);
  flex: 1;
}

.related-info h4 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-sm) 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.related-stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.related-stats span {
  display: flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 768px) {
  .related-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }
  
  .related-posts {
    padding: var(--spacing-lg);
  }
  
  .related-item img {
    height: 120px;
  }
  
  .related-info {
    padding: var(--spacing-sm);
  }
  
  .related-info h4 {
    font-size: var(--text-sm);
  }
}

@media (max-width: 480px) {
  .related-grid {
    grid-template-columns: 1fr;
  }
}
</style>
