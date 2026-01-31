<template>
  <button
    ref="cardRef"
    type="button"
    class="post-card glass-card glass-card--interactive"
    :class="{ 'post-card--contain': imageFit === 'contain' }"
    :data-post-id="post.id"
    :aria-label="displayTitle"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @focus="handleMouseEnter"
    @blur="handleMouseLeave"
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
      <div v-if="!isImageLoaded" class="post-image-placeholder glass-skeleton" />

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

      <!-- Image Overlay Gradient -->
      <div class="image-overlay" />

      <!-- Hover Details Overlay -->
      <Transition name="hover-details">
        <div v-if="showHoverDetails" class="hover-overlay">
          <div class="hover-header">
            <div class="hover-action">
              <div class="hover-action-icon">
                <AnimatedIcon name="sparkle" :fallback-icon="ArrowUpRight" size="md" />
              </div>
            </div>
          </div>
          <div class="hover-scroll">
            <div class="hover-meta">
              <div class="hover-pill">
                <AnimatedIcon name="explore" :fallback-icon="platformIcon" size="sm" />
                <span>{{ platformLabel }}</span>
              </div>
              <div v-if="post.published_at" class="hover-pill">
                <AnimatedIcon name="explore" :fallback-icon="Calendar" size="sm" />
                <span>{{ formatPublishedTime(post.published_at) }}</span>
              </div>
              <div v-if="post.duration" class="hover-pill">
                <AnimatedIcon name="explore" :fallback-icon="Clock" size="sm" />
                <span>{{ formatDuration(post.duration) }}</span>
              </div>
              <div v-else-if="post.media_count && post.media_count > 1" class="hover-pill">
                <AnimatedIcon name="explore" :fallback-icon="Images" size="sm" />
                <span>{{ post.media_count }}</span>
              </div>
            </div>
            <!-- Only show title/author in hover overlay when the card hides its content -->
            <h4 v-if="!showContent" class="hover-title">{{ displayTitle }}</h4>
            <div v-if="!showContent && displayAuthorName" class="hover-author">
              <Avatar
                v-if="showAuthorAvatar && post.author_avatar_url"
                :src="normalizeAvatarUrl(post.author_avatar_url) || undefined"
                :alt="displayAuthorName"
                size="xs"
                class="hover-author-avatar"
              />
              <AnimatedIcon v-else name="user" :fallback-icon="User" size="sm" />
              <span>{{ displayAuthorName }}</span>
            </div>
            <p v-if="hoverContent" class="hover-text">
              {{ hoverContent }}
            </p>
          </div>
        </div>
      </Transition>
    </div>

    <div v-if="showContent" class="post-content">
      <h3 class="post-title">{{ displayTitle }}</h3>

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
          <span v-if="post.view_count" class="post-stat" :title="$t('post.views')">
            <AnimatedIcon name="explore" :fallback-icon="Eye" size="sm" />
            {{ formatCount(post.view_count) }}
          </span>
          <span v-if="post.like_count" class="post-stat" :title="$t('post.likes')">
            <AnimatedIcon name="heart" :fallback-icon="Heart" size="sm" />
            {{ formatCount(post.like_count) }}
          </span>
        </div>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ArrowUpRight,
  Calendar,
  Clock,
  Eye,
  Globe,
  Heart,
  Images,
  Instagram,
  Music2,
  Play,
  User,
  Video,
} from 'lucide-vue-next'
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
import { useCardAnimation } from '@/composables/useCardAnimation'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import Avatar from '@/components/ui/Avatar.vue'

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
  /** 是否在悬浮overlay中显示作者头像 */
  showAuthorAvatar?: boolean
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
  showAuthorAvatar: false,
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
  return String(input ?? '').replace(/\s+/g, ' ').trim()
}

const displayAuthorName = computed(() => {
  const name = normalizeText(props.post.author_name)
  if (name) return name
  const username = normalizeText(props.post.author_username)
  return username ? `@${username}` : ''
})

const titleFromContent = computed(() => {
  const title = normalizeText(props.post.title)
  const content = normalizeText(props.post.content)
  if (!title && content) return true
  if (title && content && title === content) return true
  // very short titles are often placeholders on some platforms
  if (title.length > 0 && title.length <= 3 && content) return true
  return false
})

const displayTitle = computed(() => {
  const title = normalizeText(props.post.title)
  const content = normalizeText(props.post.content)

  if (!titleFromContent.value) {
    return title || content || t('post.untitled', 'Untitled')
  }

  // Use the first line / sentence of content as title
  if (content) {
    const firstLine = content.split(/\n/)[0] || content
    return firstLine.length > 120 ? firstLine.slice(0, 120) + '…' : firstLine
  }

  return title || t('post.untitled', 'Untitled')
})

const displayExcerpt = computed(() => {
  const content = normalizeText(props.post.content)
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

const hoverContent = computed(() => {
  const content = normalizeText(props.post.content)
  if (!content) return ''

  // When card hides its content, hover overlay becomes the primary reading surface.
  // If we already show the first line as title, avoid duplicating it in the body.
  if (!props.showContent && titleFromContent.value) {
    const firstLine = content.split(/\n/)[0] || content
    const rest = content.slice(firstLine.length).trim()
    return rest
  }

  // Requirement: hover overlay should include full content for reading (no line-clamp).
  return content
})

const cardRef = ref<HTMLElement | null>(null)
const isImageLoaded = ref(false)
const shouldRenderImage = ref(true)
const imageWidth = ref(640)
const imageHeight = ref(360)
const showHoverDetails = ref(false)

let hasPrefetchedPostDetailPage = false
let hasPreloadedLargeImage = false
let hoverTimeout: ReturnType<typeof setTimeout> | null = null

// GSAP animation
useCardAnimation(cardRef)

// Platform icon mapping - 使用非废弃图标
const platformIconMap: Record<string, Component> = {
  youtube: Video,
  twitter: Globe,
  tiktok: Music2,
  instagram: Instagram,
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

const preloadedAspectRatio = ref<string | null>(null)

const wrapperAspectRatio = computed(() => {
  if (props.aspectRatio !== undefined && props.aspectRatio !== null && props.aspectRatio !== '') {
    return String(props.aspectRatio)
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

const imageWrapperStyle = computed<Record<string, string>>(() => ({
  aspectRatio: wrapperAspectRatio.value,
}))

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
  if (hoverTimeout) clearTimeout(hoverTimeout)
  hoverTimeout = setTimeout(() => {
    showHoverDetails.value = true
  }, 200)
}

function handleMouseLeave() {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout)
    hoverTimeout = null
  }
  showHoverDetails.value = false
}

function handleClick() {
  emit('click', props.post.id, thumbnailSrc.value)
}

// 组件卸载时清理定时器，防止内存泄漏
onUnmounted(() => {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout)
    hoverTimeout = null
  }
})
</script>

<style scoped>
.post-card {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  padding: 0;
  background: var(--glass-bg);
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
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
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
  font-size: 10px;
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
}

.platform-badge--bilibili {
  background: rgba(251, 114, 153, 0.85);
}

.platform-badge--instagram {
  background: linear-gradient(135deg, #f9ce34 0%, #ee2a7b 45%, #6228d7 100%);
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
  padding: 3px 8px;
  border-radius: var(--radius-md);
  font-size: 11px;
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
  background: #000;
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

/* ========== Hover Overlay - 增强版 ========== */
.hover-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.4) 0%,
    rgba(0, 0, 0, 0.2) 40%,
    rgba(0, 0, 0, 0.6) 70%,
    rgba(0, 0, 0, 0.9) 100%
  );
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  will-change: opacity, transform;
  transform: translate3d(0, 0, 0);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.hover-header {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
}

.hover-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: var(--font-medium);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: fit-content;
}

.hover-pill :deep(svg) {
  opacity: 0.85;
}

.hover-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
  color: #fff;
  overscroll-behavior: contain;
}

.hover-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  margin: 0 0 var(--spacing-2);
}

.hover-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  line-height: 1.4;
  margin: 0 0 var(--spacing-2);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.hover-author {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 var(--spacing-2);
}

.hover-author-avatar {
  flex-shrink: 0;
}

.hover-author svg {
  opacity: 0.7;
}

/* Legacy hover-stats kept for compatibility (older markup) */
.hover-stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-3);
}

.hover-stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.8);
  font-variant-numeric: tabular-nums;
}

.hover-text {
  margin: 0;
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  white-space: pre-wrap;
}

.hover-stat svg {
  opacity: 0.7;
}

.hover-action {
  flex-shrink: 0;
}

.hover-action-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: var(--radius-full);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all var(--transition-fast);
}

.post-card:hover .hover-action-icon {
  background: var(--color-primary);
  border-color: var(--color-primary);
  transform: translate(2px, -2px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.4);
}

/* ========== Hover Transition ========== */
.hover-details-enter-active,
.hover-details-leave-active {
  transition:
    opacity var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

.hover-details-enter-from {
  opacity: 0;
  transform: translate3d(0, 8px, 0);
}

.hover-details-leave-to {
  opacity: 0;
  transform: translate3d(0, 4px, 0);
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
  width: 20px;
  height: 20px;
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
  gap: 3px;
  font-variant-numeric: tabular-nums;
}

.post-stat svg {
  opacity: 0.7;
}

/* ========== Mobile - Disable Hover ========== */
@media (hover: none) {
  .hover-overlay {
    display: none !important;
  }

  .post-card:hover .post-image.is-loaded {
    transform: scale(1);
  }
}

/* ========== Reduced Motion ========== */
@media (prefers-reduced-motion: reduce) {
  .hover-details-enter-active,
  .hover-details-leave-active {
    transition: opacity 0.1s;
  }

  .hover-details-enter-from,
  .hover-details-leave-to {
    transform: none;
  }

  .post-image {
    transition: opacity 0.1s;
  }
}
</style>
