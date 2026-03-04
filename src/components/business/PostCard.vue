<template>
  <button
    type="button"
    class="post-card glass-card glass-card--interactive"
    :class="{ 'post-card--contain': imageFit === 'contain' }"
    :data-post-id="post.id"
    :aria-label="cardAriaLabel"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @focus="handleMouseEnter"
  >
    <div class="post-image-wrapper" :style="imageWrapperStyle">
      <!-- Platform Icon Badge -->
      <div
        v-if="post.platform"
        class="platform-badge"
        :class="`platform-badge--${post.platform?.toLowerCase()}`"
      >
        <AnimatedIcon :name="platformAnimation" :fallback-icon="platformIcon" size="sm" />
        <span class="platform-label">{{ platformLabel }}</span>
      </div>

      <!-- 预设固定尺寸的占位符，防止图片加载时的布局偏移 -->
      <div v-if="!isImageLoaded && thumbnailSrc" class="post-image-placeholder glass-skeleton" />

      <!-- 无缩略图：纯文本帖子 → 不显示图片占位区域 -->

      <!-- 无缩略图：有媒体但缩略图缺失 → 显示媒体类型指示 -->
      <div
        v-else-if="!thumbnailSrc && hasMediaNoThumbnail"
        class="post-image-placeholder post-image-placeholder--media"
      >
        <component :is="mediaTypeIcon" :size="32" />
        <span v-if="post.duration" class="post-media-hint__duration">
          {{ formatDuration(post.duration) }}
        </span>
        <span v-else class="post-media-hint__label">
          {{ post.media_count }} {{ post.media_count > 1 ? 'files' : 'file' }}
        </span>
      </div>

      <!-- 无缩略图：无媒体也无文本 → 平台图标占位 -->
      <div v-else-if="!thumbnailSrc" class="post-image-placeholder post-image-placeholder--empty">
        <component :is="platformIcon" :size="28" />
      </div>

      <img
        v-if="thumbnailSrc && shouldRenderImage"
        class="post-image"
        :class="{ 'is-loaded': isImageLoaded }"
        :src="thumbnailSrc"
        :alt="displayTitle"
        :width="imageWidth"
        :height="imageHeight"
        :loading="imageLoadingStrategy"
        decoding="async"
        :fetchpriority="imageFetchPriority"
        @load="onImageLoad"
        @error="onImageError"
      />

      <!-- Duration Badge (for videos) -->
      <div v-if="post.duration" class="duration-badge">
        <AnimatedIcon name="explore" :fallback-icon="Play" size="sm" />
        {{ formatDuration(post.duration) }}
      </div>

      <!-- Published Time Badge -->
      <div v-if="post.published_at" class="time-badge">
        <AnimatedIcon name="explore" :fallback-icon="Calendar" size="sm" />
        {{ formatPublishedTime(post.published_at) }}
      </div>

      <!-- Image Overlay Gradient -->
      <div class="image-overlay" />
    </div>

    <div v-if="showContent" class="post-content">
      <h3 v-if="displayTitle" class="post-title">{{ displayTitle }}</h3>

      <p v-if="cardExcerpt" class="post-excerpt">
        {{ cardExcerpt }}
      </p>

      <div class="post-meta">
        <div class="post-author-wrapper" v-if="showAuthor && displayAuthorName">
          <img
            v-if="post.author_avatar_url"
            class="post-author-avatar"
            :src="normalizeAvatarUrl(post.author_avatar_url) || undefined"
            :alt="displayAuthorName"
            loading="lazy"
            decoding="async"
          />
          <div v-else class="post-author-avatar post-author-avatar--fallback">
            <AnimatedIcon name="user" :fallback-icon="User" size="sm" />
          </div>
          <span class="post-author">{{ displayAuthorName }}</span>
        </div>

        <div class="post-stats">
          <Tooltip v-if="post.view_count" :content="t('post.views')">
            <span class="post-stat">
              <AnimatedIcon name="explore" :fallback-icon="Eye" size="sm" />
              {{ formatCount(post.view_count) }}
            </span>
          </Tooltip>
          <Tooltip v-if="post.like_count" :content="t('post.likes')">
            <span class="post-stat">
              <AnimatedIcon name="heart" :fallback-icon="Heart" size="sm" />
              {{ formatCount(post.like_count) }}
            </span>
          </Tooltip>
        </div>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts" vapor>
import { ref, computed, watch, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { Calendar, Eye, Film, Globe, Heart, Play, User } from 'lucide-vue-next'
import { IconYoutube, IconX, IconTiktok, IconInstagram } from '@/components/icons'
import type { PostListItem } from '@/api'
import { normalizeAvatarUrl } from '@/api/userService'
import { prefetchPostDetail } from '@/utils/prefetch'
import {
  normalizeToThumbnailUrl,
  extractMediaIdFromUrl,
  getMediaThumbnailUrl,
  isMobileDevice,
} from '@/utils/mediaOptimizer'
import { thumbnailCache } from '@/utils/thumbnailCache'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import Tooltip from '@/components/ui/Tooltip.vue'

/**
 * 固定宽高比缓存 - 用于保持布局稳定，避免 CLS
 * 添加大小限制防止内存泄漏
 */
const postAspectRatioCache = new Map<string, string>()
const MAX_ASPECT_RATIO_CACHE_SIZE = 500

/**
 * 设置宽高比缓存，带大小限制
 */
function setAspectRatioCache(id: string, ratio: string): void {
  // 缓存满时清理最早的 100 条
  if (postAspectRatioCache.size >= MAX_ASPECT_RATIO_CACHE_SIZE) {
    const keysToDelete = Array.from(postAspectRatioCache.keys()).slice(0, 100)
    keysToDelete.forEach((k) => postAspectRatioCache.delete(k))
  }
  postAspectRatioCache.set(id, ratio)
}

/**
 * 根据平台设置默认宽高比
 */
const PLATFORM_ASPECT_RATIOS: Record<string, string> = {
  tiktok: '9 / 16', // 竖屏视频
  youtube: '16 / 9',
  twitter: '16 / 9',
  bilibili: '16 / 9',
  pixiv: '3 / 4', // 竖屏图片
  weibo: '4 / 3',
  instagram: '4 / 5', // Instagram 常见比例
}

const DEFAULT_ASPECT_RATIO = '16 / 9'

export interface PostCardProps {
  post: PostListItem
  showContent?: boolean
  showAuthor?: boolean
  /** 是否显示文本摘要（在content区域） */
  showExcerpt?: boolean
  thumbnailSize?: 'small' | 'medium' | 'large' | 'responsive'
  aspectRatio?: string | number
  /** Media sizing strategy for the card thumbnail */
  imageFit?: 'cover' | 'contain'
  /** 是否为首屏图片（前4张优先加载） */
  priority?: boolean
}

const props = withDefaults(defineProps<PostCardProps>(), {
  showContent: true,
  showAuthor: true,
  // on touch devices we default to showing excerpt in the card (no hover)
  showExcerpt: isMobileDevice(),
  thumbnailSize: 'responsive',
  imageFit: 'cover',
  priority: false,
})

const imageFit = computed(() => props.imageFit)

const emit = defineEmits<{
  click: [postId: string, thumbnailSrc: string | null]
  'height-change': []
}>()

const { t } = useI18n()

function normalizeText(input: string | null | undefined): string {
  return String(input ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

const displayAuthorName = computed(() => {
  const name = normalizeText(props.post.author_name)
  if (name) return name
  const username = normalizeText(props.post.author_username)
  return username ? `@${username}` : ''
})

const titleFromContent = computed(() => {
  const title = normalizeText(props.post.title)
  const content = normalizeText(props.post.description)
  if (!title && content) return true
  if (title && content && title === content) return true
  // very short titles are often placeholders on some platforms
  if (title.length > 0 && title.length <= 3 && content) return true
  return false
})

const displayTitle = computed(() => {
  const title = normalizeText(props.post.title)
  const content = normalizeText(props.post.description)

  if (!titleFromContent.value) {
    return title || ''
  }

  // Title comes from content — extract a short snippet (first segment up to a space boundary)
  const source = content || title
  if (!source) return ''

  // Take the first line, then truncate at a reasonable word boundary
  const firstLine = source.split(/\n/)[0] || source
  if (firstLine.length <= 30) return firstLine

  // Find a space boundary within the first ~30 chars
  const cutoff = firstLine.lastIndexOf(' ', 30)
  const end = cutoff > 10 ? cutoff : 30
  return firstLine.slice(0, end) + '…'
})

const displayExcerpt = computed(() => {
  const content = normalizeText(props.post.description)
  if (!content) return ''

  // If title already came from content, avoid duplicating excerpt.
  if (titleFromContent.value) return ''

  return content
})

const cardExcerpt = computed(() => {
  if (!props.showContent) return ''
  if (!props.showExcerpt) return ''
  return displayExcerpt.value
})

const cardAriaLabel = computed(() => {
  // 卡片已渲染可见文本时，避免 aria-label 覆盖可见名称（修复 label-content-name-mismatch）
  if (props.showContent) {
    return undefined
  }

  const actionLabel = t('post.viewDetail')
  const subject = displayTitle.value || platformLabel.value
  return subject ? `${subject} · ${actionLabel}` : actionLabel
})

const isImageLoaded = ref(false)
const shouldRenderImage = ref(true)
const imageWidth = ref(640)
const imageHeight = ref(360)

let hasPrefetchedPostDetailPage = false
let hasPreloadedLargeImage = false

// Platform icon mapping - 品牌 SVG 图标
const platformIconMap: Record<string, Component> = {
  youtube: IconYoutube,
  twitter: IconX,
  tiktok: IconTiktok,
  instagram: IconInstagram,
  bilibili: Globe,
  pixiv: Globe,
  weibo: Globe,
}

const platformIcon = computed(() => {
  const platform = props.post.platform?.toLowerCase()
  return platform ? (platformIconMap[platform] ?? Globe) : Globe
})

const platformAnimation = computed(() => {
  const platform = props.post.platform?.toLowerCase()
  const map: Record<string, string> = {
    youtube: 'sparkle',
    twitter: 'explore',
    tiktok: 'explore',
    instagram: 'heart',
    bilibili: 'sparkle',
    pixiv: 'heart',
    weibo: 'explore',
  }
  return platform ? (map[platform] ?? 'explore') : 'explore'
})

const platformLabel = computed(() => {
  const raw = props.post.platform
  if (!raw) return ''

  const map: Record<string, string> = {
    bilibili: 'Bilibili',
    youtube: 'YouTube',
    twitter: 'X',
    instagram: 'Instagram',
    pixiv: 'Pixiv',
    weibo: 'Weibo',
    tiktok: 'TikTok',
  }

  return map[raw] ?? raw.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
})

const effectiveThumbnailSize = computed(() => {
  if (props.thumbnailSize === 'responsive') {
    // 移动端使用 medium，桌面端使用 large 作为基础尺寸
    const baseSize = isMobileDevice() ? 'medium' : 'large'
    return baseSize
  }
  return props.thumbnailSize
})

const thumbnailSrc = computed(() => {
  if (!props.post.thumbnail_url) return null

  const mediaId = extractMediaIdFromUrl(props.post.thumbnail_url)
  const rawSize = effectiveThumbnailSize.value || 'medium'
  const size = rawSize

  if (mediaId) {
    const cached = thumbnailCache.get(mediaId, size)
    if (cached) return cached
  }

  const optimized =
    normalizeToThumbnailUrl(props.post.thumbnail_url, rawSize) || props.post.thumbnail_url

  if (mediaId) {
    thumbnailCache.set(mediaId, optimized, size)
  }

  return optimized
})

/** 纯文本帖子：无缩略图且无媒体 */
const isTextOnlyPost = computed(() => {
  if (thumbnailSrc.value) return false
  const count = props.post.media_count ?? 0
  if (count > 0) return false
  const text = normalizeText(props.post.description) || normalizeText(props.post.content)
  return text.length > 0
})

/** 有媒体但缩略图缺失 */
const hasMediaNoThumbnail = computed(() => {
  if (thumbnailSrc.value) return false
  return (props.post.media_count ?? 0) > 0
})

/** 媒体类型图标 */
const mediaTypeIcon = computed(() => {
  const postType = props.post.post_type?.toLowerCase()
  if (postType === 'video' || postType === 'short' || postType === 'live_replay') return Play
  if (props.post.duration && props.post.duration > 0) return Play
  return Film
})

const preloadedAspectRatio = ref<string | null>(null)

const wrapperAspectRatio = computed(() => {
  if (props.aspectRatio !== undefined && props.aspectRatio !== null && props.aspectRatio !== '') {
    return String(props.aspectRatio)
  }

  // 纯文本帖子使用较矮的比例
  if (isTextOnlyPost.value) {
    return '16 / 10'
  }

  if (props.post.thumbnail_width && props.post.thumbnail_height) {
    const ratio = (props.post.thumbnail_width / props.post.thumbnail_height).toFixed(4)
    setAspectRatioCache(props.post.id, ratio)
    return ratio
  }

  if (preloadedAspectRatio.value) return preloadedAspectRatio.value

  const cached = postAspectRatioCache.get(props.post.id)
  if (cached) return cached

  const platform = props.post.platform?.toLowerCase()
  if (platform && PLATFORM_ASPECT_RATIOS[platform]) {
    return PLATFORM_ASPECT_RATIOS[platform]
  }

  return DEFAULT_ASPECT_RATIO
})

const imageWrapperStyle = computed<Record<string, string>>(() => {
  if (isTextOnlyPost.value) return {}
  return { aspectRatio: wrapperAspectRatio.value }
})

// 图片加载策略：首屏图片 eager，其他 lazy
const imageLoadingStrategy = computed(() => (props.priority ? 'eager' : 'lazy'))

// 图片优先级：首屏图片 high，其他 low
const imageFetchPriority = computed(() => (props.priority ? 'high' : 'low'))

function preloadImageDimensions() {
  // 如果后端提供了尺寸数据，使用它
  if (props.post.thumbnail_width && props.post.thumbnail_height) {
    imageWidth.value = props.post.thumbnail_width
    imageHeight.value = props.post.thumbnail_height
    const ratio = (props.post.thumbnail_width / props.post.thumbnail_height).toFixed(4)
    preloadedAspectRatio.value = ratio
    setAspectRatioCache(props.post.id, ratio)
    return
  }

  // 检查缓存
  const cachedRatio = postAspectRatioCache.get(props.post.id)
  if (cachedRatio) {
    const ratio = parseFloat(cachedRatio)
    if (!isNaN(ratio)) {
      imageWidth.value = 640
      imageHeight.value = Math.round(640 / ratio)
      preloadedAspectRatio.value = cachedRatio
    }
    return
  }

  // 没有尺寸数据时，使用平台默认比例，不再预加载图片获取尺寸
  // 这样可以避免图片加载后 aspect-ratio 变化导致的 CLS
  const platform = props.post.platform?.toLowerCase()
  if (platform && PLATFORM_ASPECT_RATIOS[platform]) {
    preloadedAspectRatio.value = PLATFORM_ASPECT_RATIOS[platform]
  } else {
    preloadedAspectRatio.value = DEFAULT_ASPECT_RATIO
  }
}

watch(
  thumbnailSrc,
  (newSrc, oldSrc) => {
    isImageLoaded.value = false
    if (newSrc !== oldSrc) {
      preloadedAspectRatio.value = null
      preloadImageDimensions()
    }
  },
  { immediate: true }
)

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * 格式化发布时间为相对时间或日期
 */
function formatPublishedTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return t('common.justNow')
  if (diffMin < 60) return t('common.minutesAgo', { n: diffMin })
  if (diffHour < 24) return t('common.hoursAgo', { n: diffHour })
  if (diffDay < 7) return t('common.daysAgo', { n: diffDay })
  if (diffDay < 30) return t('common.weeksAgo', { n: Math.floor(diffDay / 7) })
  if (diffDay < 365) return t('common.monthsAgo', { n: Math.floor(diffDay / 30) })
  return t('common.yearsAgo', { n: Math.floor(diffDay / 365) })
}

/**
 * 预加载大图到浏览器缓存（hover 时触发）
 * 注意：只预加载到缓存，不替换当前显示的小图，避免 CLS
 */
function preloadLargeImage() {
  if (hasPreloadedLargeImage || !props.post.thumbnail_url) return
  hasPreloadedLargeImage = true

  const mediaId = extractMediaIdFromUrl(props.post.thumbnail_url)
  if (!mediaId) return

  const largeUrl = getMediaThumbnailUrl(mediaId, 'large')

  // 使用 Image 对象预加载到浏览器缓存
  // 用户进入详情页时，大图已在缓存中，加载更快
  const img = new Image()
  img.src = largeUrl
}

function onImageLoad(event: Event) {
  const img = event.target as HTMLImageElement | null
  if (img?.naturalWidth && img?.naturalHeight) {
    const ratio = (img.naturalWidth / img.naturalHeight).toFixed(4)
    // 只缓存比例，不更新当前显示的 aspect-ratio，避免 CLS
    setAspectRatioCache(props.post.id, ratio)
  }
  isImageLoaded.value = true
  // 通知父组件高度可能已变化
  emit('height-change')
}

function onImageError() {
  isImageLoaded.value = true
}

function prefetchPostDetailPage() {
  if (hasPrefetchedPostDetailPage) return
  hasPrefetchedPostDetailPage = true
  import('@/views/PostDetailPage.vue').catch(() => {})
  prefetchPostDetail(props.post.id)
}

function handleMouseEnter() {
  prefetchPostDetailPage()
  preloadLargeImage()
}

function handleClick() {
  emit('click', props.post.id, thumbnailSrc.value)
}
</script>

<style scoped>
.post-card {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  padding: 0;
  background: var(--glass-bg);
  overflow: hidden;
  cursor: pointer;
  will-change: transform;
  transition:
    transform var(--transition-base),
    box-shadow var(--transition-base);
}

.post-card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 12px 24px -8px rgba(0, 0, 0, 0.15),
    0 4px 8px -4px rgba(0, 0, 0, 0.1);
}

.post-card:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ========== Image Wrapper ========== */
.post-image-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: var(--glass-bg-light);
}

/* ========== Platform Badge - 增强版 v2 ========== */
.platform-badge {
  position: absolute;
  top: var(--spacing-2);
  left: var(--spacing-2);
  z-index: 12;
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-full);
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #fff;
  font-size: 0.625rem;
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  transition: all var(--transition-fast);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.post-card:hover .platform-badge {
  transform: scale(1.05);
}

.platform-label {
  display: none;
}

.post-card:hover .platform-label {
  display: inline;
}

/* Platform colors */
.platform-badge--youtube {
  background: rgba(255, 0, 0, 0.85);
}

.platform-badge--twitter {
  background: rgba(29, 161, 242, 0.85);
}

.platform-badge--tiktok {
  background: linear-gradient(135deg, #25f4ee 0%, #fe2c55 100%);
  border-color: transparent;
}

.platform-badge--bilibili {
  background: rgba(251, 114, 153, 0.85);
}

.platform-badge--instagram {
  background: linear-gradient(135deg, #f9ce34 0%, #ee2a7b 45%, #6228d7 100%);
  border-color: transparent;
}

/* ========== Duration Badge ========== */
.duration-badge {
  position: absolute;
  bottom: var(--spacing-2);
  right: var(--spacing-2);
  z-index: 3;
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: 0.1875rem 0.5rem;
  border-radius: var(--radius-md);
  font-size: 0.6875rem;
  font-weight: var(--font-semibold);
  font-variant-numeric: tabular-nums;
  color: #fff;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

/* ========== Time Badge ========== */
.time-badge {
  position: absolute;
  bottom: var(--spacing-2);
  left: var(--spacing-2);
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: 0.1875rem 0.5rem;
  border-radius: var(--radius-md);
  font-size: 0.6875rem;
  font-weight: var(--font-semibold);
  font-variant-numeric: tabular-nums;
  color: #fff;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

/* ========== Image ========== */
.post-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  opacity: 0;
  transform: scale(1.02);
  transition:
    opacity var(--duration-normal) var(--ease-out),
    transform var(--duration-normal) var(--ease-out);
  will-change: opacity, transform;
}

.post-card--contain .post-image {
  object-fit: contain;
}

.post-image.is-loaded {
  opacity: 1;
  transform: scale(1);
}

.post-card:hover .post-image.is-loaded {
  transform: scale(1.05);
}

.post-card--contain:hover .post-image.is-loaded {
  transform: scale(1);
}

.post-image-placeholder {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.post-image-placeholder--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg-light);
  color: var(--color-text-tertiary);
  opacity: 0.5;
}

/* ========== Text-Only Post Placeholder ========== */
.post-image-placeholder--text {
  display: flex;
  align-items: flex-start;
  padding: var(--spacing-4);
  background: var(--glass-bg-light);
  overflow: hidden;
}

.post-text-preview {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  width: 100%;
  min-height: 0;
}

.post-text-preview__icon {
  color: var(--color-text-tertiary);
  opacity: 0.6;
  flex-shrink: 0;
}

.post-text-preview__content {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--color-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 6;
  line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  overflow-wrap: anywhere;
}

/* ========== Media-No-Thumbnail Placeholder ========== */
.post-image-placeholder--media {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  background: var(--glass-bg-light);
  color: var(--color-text-tertiary);
}

.post-media-hint__duration {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-secondary);
}

.post-media-hint__label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

/* ========== Image Overlay ========== */
.image-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(180deg, transparent 0%, transparent 50%, rgba(0, 0, 0, 0.15) 100%);
  pointer-events: none;
  transition: opacity var(--transition-fast);
}

.post-card:hover .image-overlay {
  opacity: 0;
}

/* ========== Content Section ========== */
.post-content {
  padding: var(--spacing-3);
}

.post-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  transition: color var(--transition-fast);
}

.post-excerpt {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin: var(--spacing-2) 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

.post-card:hover .post-title {
  color: var(--color-primary);
}

.post-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
  margin-top: var(--spacing-2);
}

.post-author-wrapper {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  min-width: 0;
  flex: 1;
}

.post-author-avatar {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: var(--radius-full);
  flex-shrink: 0;
  object-fit: cover;
  background: var(--glass-bg-subtle);
  border: 1px solid var(--glass-border);
}

.post-author-avatar--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
}

.post-author {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-stats {
  display: flex;
  gap: var(--spacing-3);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.post-stat {
  display: flex;
  align-items: center;
  gap: 0.1875rem;
  font-variant-numeric: tabular-nums;
}

.post-stat svg {
  opacity: 0.7;
}

/* ========== Mobile - Disable Hover ========== */
@media (hover: none) {
  .post-card:hover .post-image.is-loaded {
    transform: scale(1);
  }
}

/* ========== Reduced Motion ========== */
@media (prefers-reduced-motion: reduce) {
  .post-image {
    transition: opacity 0.1s;
  }
}
</style>
