<template>
  <button
    ref="cardRef"
    type="button"
    class="post-card glass-card post-card-btn"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @focus="handleMouseEnter"
    @blur="handleMouseLeave"
  >
    <div class="post-image-wrapper" :style="imageWrapperStyle">
      <!-- Platform Icon Badge -->
      <div v-if="post.platform" class="platform-icon" :title="platformLabel">
        <component :is="platformIcon" :size="14" />
      </div>

      <!-- 预设固定尺寸的占位符，防止图片加载时的布局偏移 -->
      <div v-if="!isImageLoaded" class="post-image-placeholder" />

      <img
        v-if="thumbnailSrc && shouldRenderImage"
        class="post-image"
        :class="{ 'is-loaded': isImageLoaded }"
        :src="thumbnailSrc"
        :alt="post.title"
        :width="imageWidth"
        :height="imageHeight"
        loading="lazy"
        decoding="async"
        fetchpriority="low"
        @load="onImageLoad"
        @error="onImageError"
      />

      <!-- Duration Badge (for videos) -->
      <div v-if="post.duration" class="duration-badge">
        {{ formatDuration(post.duration) }}
      </div>

      <!-- Hover Details Overlay -->
      <Transition name="hover-details">
        <div v-if="showHoverDetails" class="hover-details-overlay">
          <div class="hover-details-content">
            <h4 class="hover-title">{{ post.title }}</h4>
            <p v-if="post.author_name" class="hover-author">{{ post.author_name }}</p>
            <div class="hover-stats">
              <span v-if="post.view_count" class="hover-stat">
                <Eye :size="14" />
                {{ formatCount(post.view_count) }} {{ $t('post.views') }}
              </span>
              <span v-if="post.like_count" class="hover-stat">
                <Heart :size="14" />
                {{ formatCount(post.like_count) }} {{ $t('post.likes') }}
              </span>
              <span v-if="post.duration" class="hover-stat">
                <Clock :size="14" />
                {{ formatDuration(post.duration) }}
              </span>
            </div>
            <p v-if="post.platform" class="hover-platform">
              <component :is="platformIcon" :size="14" />
              {{ platformLabel }}
            </p>
          </div>
        </div>
      </Transition>
    </div>

    <div v-if="showContent" class="post-content">
      <h3 class="post-title">{{ post.title }}</h3>

      <div class="post-footer">
        <p v-if="showAuthor" class="post-author">{{ post.author_name }}</p>

        <!-- Stats Row -->
        <div class="post-stats">
          <span v-if="post.view_count" class="post-stat" :title="$t('post.views')">
            <Eye :size="12" />
            {{ formatCount(post.view_count) }}
          </span>
          <span v-if="post.like_count" class="post-stat" :title="$t('post.likes')">
            <Heart :size="12" />
            {{ formatCount(post.like_count) }}
          </span>
        </div>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { ref, computed, watch, type Component } from 'vue'
import { Youtube, Twitter, Globe, Music2, Eye, Heart, Clock } from 'lucide-vue-next'
import type { PostListItem } from '@/api'
import { prefetchPostDetail } from '@/utils/prefetch'
import {
  normalizeToThumbnailUrl,
  getResponsiveThumbnailSize,
  extractMediaIdFromUrl,
} from '@/utils/mediaOptimizer'
import { thumbnailCache } from '@/utils/thumbnailCache'
import { useCardAnimation } from '@/composables/useCardAnimation'

/**
 * 固定宽高比缓存 - 用于保持布局稳定，避免 CLS
 * 只在首次加载时缓存，不在图片加载后更新
 */
const postAspectRatioCache = new Map<string, string>()

/**
 * 根据平台设置默认宽高比，减少 CLS
 * - TikTok: 9:16 (竖屏短视频)
 * - YouTube/Twitter/其他: 16:9 (横屏)
 */
const PLATFORM_ASPECT_RATIOS: Record<string, string> = {
  tiktok: '9 / 16',
  youtube: '16 / 9',
  twitter: '16 / 9',
  bilibili: '16 / 9',
  pixiv: '3 / 4', // Pixiv 图片通常偏竖屏
  weibo: '4 / 3', // 微博图片多为方形或竖屏
}

const DEFAULT_ASPECT_RATIO = '16 / 9'

export interface PostCardProps {
  post: PostListItem
  showContent?: boolean
  showAuthor?: boolean
  thumbnailSize?: 'small' | 'medium' | 'large' | 'responsive'
  aspectRatio?: string | number
}

const props = withDefaults(defineProps<PostCardProps>(), {
  showContent: true,
  showAuthor: true,
  thumbnailSize: 'responsive',
})

const emit = defineEmits<{
  click: [postId: string, thumbnailSrc: string | null]
}>()

const cardRef = ref<HTMLElement | null>(null)
const isImageLoaded = ref(false)
const shouldRenderImage = ref(true)
const imageWidth = ref(640)
const imageHeight = ref(360)
const showHoverDetails = ref(false)

let hasPrefetchedPostDetailPage = false
let hoverTimeout: ReturnType<typeof setTimeout> | null = null

// GSAP animation
useCardAnimation(cardRef)

// Platform icon mapping
const platformIconMap: Record<string, Component> = {
  youtube: Youtube,
  twitter: Twitter,
  tiktok: Music2,
  bilibili: Globe,
  pixiv: Globe,
  weibo: Globe,
}

const platformIcon = computed(() => {
  const platform = props.post.platform?.toLowerCase()
  return platform ? (platformIconMap[platform] ?? Globe) : Globe
})

const platformLabel = computed(() => {
  const raw = props.post.platform
  if (!raw) return ''

  const map: Record<string, string> = {
    bilibili: 'Bilibili',
    youtube: 'YouTube',
    twitter: 'Twitter',
    pixiv: 'Pixiv',
    weibo: 'Weibo',
    tiktok: 'TikTok',
  }

  return map[raw] ?? raw.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
})

const effectiveThumbnailSize = computed(() => {
  if (props.thumbnailSize === 'responsive') {
    return getResponsiveThumbnailSize('small')
  }
  return props.thumbnailSize
})

const thumbnailSrc = computed(() => {
  if (!props.post.thumbnail_url) return null

  const mediaId = extractMediaIdFromUrl(props.post.thumbnail_url)
  const rawSize = effectiveThumbnailSize.value || 'medium'
  const size = rawSize === 'original' ? 'large' : rawSize

  // 尝试从缓存获取
  if (mediaId) {
    const cached = thumbnailCache.get(mediaId, size)
    if (cached) return cached
  }

  const optimized =
    normalizeToThumbnailUrl(props.post.thumbnail_url, rawSize) || props.post.thumbnail_url

  // 存入缓存
  if (mediaId) {
    thumbnailCache.set(mediaId, optimized, size)
  }

  return optimized
})

// 移除 srcset 以避免双重加载图片

/**
 * 真实宽高比状态（预加载获取）
 */
const preloadedAspectRatio = ref<string | null>(null)

/**
 * 计算图片容器的宽高比
 * 优化 CLS：按优先级使用不同来源的宽高比
 * 优先级：props > 后端数据 > 预加载 > 缓存 > 平台默认 > 全局默认
 */
const wrapperAspectRatio = computed(() => {
  // 1. 优先使用 props 传入的宽高比（最高优先级）
  if (props.aspectRatio !== undefined && props.aspectRatio !== null && props.aspectRatio !== '') {
    return String(props.aspectRatio)
  }

  // 2. 使用后端提供的缩略图尺寸（如果后端已升级）
  if (props.post.thumbnail_width && props.post.thumbnail_height) {
    const ratio = (props.post.thumbnail_width / props.post.thumbnail_height).toFixed(4)
    // 缓存后端数据以供后续使用
    postAspectRatioCache.set(props.post.id, ratio)
    return ratio
  }

  // 3. 使用预加载获取的真实宽高比
  if (preloadedAspectRatio.value) return preloadedAspectRatio.value

  // 4. 使用缓存的宽高比（仅用于已知尺寸的帖子）
  const cached = postAspectRatioCache.get(props.post.id)
  if (cached) return cached

  // 5. 根据平台使用对应的默认宽高比，减少 CLS
  const platform = props.post.platform?.toLowerCase()
  if (platform && PLATFORM_ASPECT_RATIOS[platform]) {
    return PLATFORM_ASPECT_RATIOS[platform]
  }

  // 6. 使用固定的默认宽高比，避免布局偏移
  return DEFAULT_ASPECT_RATIO
})

const imageWrapperStyle = computed<Record<string, string>>(() => ({
  aspectRatio: wrapperAspectRatio.value,
}))

/**
 * 预加载图片以获取真实尺寸
 * 在渲染前获取宽高比，消除 CLS
 */
function preloadImageDimensions() {
  // 1. 优先使用后端提供的尺寸
  if (props.post.thumbnail_width && props.post.thumbnail_height) {
    imageWidth.value = props.post.thumbnail_width
    imageHeight.value = props.post.thumbnail_height
    const ratio = (props.post.thumbnail_width / props.post.thumbnail_height).toFixed(4)
    preloadedAspectRatio.value = ratio
    postAspectRatioCache.set(props.post.id, ratio)
    return
  }

  // 2. 检查缓存
  const cachedRatio = postAspectRatioCache.get(props.post.id)
  if (cachedRatio) {
    const ratio = parseFloat(cachedRatio)
    if (!isNaN(ratio)) {
      // 根据固定宽度计算高度
      imageWidth.value = 640
      imageHeight.value = Math.round(640 / ratio)
      preloadedAspectRatio.value = cachedRatio
    }
    return
  }

  if (!thumbnailSrc.value) return

  const img = new Image()

  img.onload = () => {
    if (img.naturalWidth && img.naturalHeight) {
      const ratio = (img.naturalWidth / img.naturalHeight).toFixed(4)
      // 更新图片尺寸属性
      imageWidth.value = img.naturalWidth
      imageHeight.value = img.naturalHeight
      // 更新预加载的宽高比
      preloadedAspectRatio.value = ratio
      // 同时缓存以供后续使用
      postAspectRatioCache.set(props.post.id, ratio)
    }
  }

  img.onerror = () => {
    // 预加载失败，使用平台默认值（已在 computed 中处理）
    // 确保图片仍然可以渲染
    shouldRenderImage.value = true
  }

  // 开始预加载
  img.src = thumbnailSrc.value
}

watch(
  thumbnailSrc,
  (newSrc, oldSrc) => {
    isImageLoaded.value = false

    // 当图片 URL 变化时，重新预加载获取尺寸
    if (newSrc !== oldSrc) {
      preloadedAspectRatio.value = null
      preloadImageDimensions()
    }
  },
  { immediate: true }
)

/**
 * Format number to compact form (1.2K, 3.5M)
 */
function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
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
 * 图片加载完成回调
 * 注意：为了避免 CLS，不再在加载后更新 aspect-ratio
 * 只缓存宽高比供下次使用（如从详情页返回）
 */
function onImageLoad(event: Event) {
  const img = event.target as HTMLImageElement | null
  if (img?.naturalWidth && img?.naturalHeight) {
    // 缓存实际宽高比，供后续使用（不触发当前布局更新）
    const ratio = (img.naturalWidth / img.naturalHeight).toFixed(4)
    postAspectRatioCache.set(props.post.id, ratio)
  }
  isImageLoaded.value = true
}

/**
 * 图片加载失败回调
 * 显示占位符并记录错误
 */
function onImageError() {
  isImageLoaded.value = true
  console.warn(`Failed to load image for post ${props.post.id}`)
}

function prefetchPostDetailPage() {
  if (hasPrefetchedPostDetailPage) return
  hasPrefetchedPostDetailPage = true
  import('@/views/PostDetailPage.vue').catch(() => {})
  prefetchPostDetail(props.post.id)
}

/**
 * 鼠标进入卡片，延迟显示详情悬浮层
 * 延迟 300ms 防止快速划过时触发
 */
function handleMouseEnter() {
  prefetchPostDetailPage()
  if (hoverTimeout) clearTimeout(hoverTimeout)
  hoverTimeout = setTimeout(() => {
    showHoverDetails.value = true
  }, 300)
}

/**
 * 鼠标离开卡片，隐藏详情悬浮层
 */
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
</script>

<style scoped>
.post-card {
  overflow: hidden;
}

.post-card-btn {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
  will-change: transform;
}

/* Remove CSS hover - GSAP handles animation */
.post-card-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.post-card-btn:active {
  transform: scale(0.99);
}

.post-image-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: var(--glass-bg-light);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

/* Platform Icon Badge */
.platform-icon {
  position: absolute;
  top: var(--spacing-2);
  left: var(--spacing-2);
  z-index: 2;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: background-color 0.2s ease;
}

.post-card-btn:hover .platform-icon {
  background: rgba(59, 130, 246, 0.85);
}

/* Duration Badge */
.duration-badge {
  position: absolute;
  bottom: var(--spacing-2);
  right: var(--spacing-2);
  z-index: 2;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: var(--font-medium);
  font-variant-numeric: tabular-nums;
  color: #fff;
  background: rgba(0, 0, 0, 0.75);
}

.post-image {
  position: relative;
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
  opacity: 0;
  filter: blur(10px);
  transform: scale(1.05);
  transition:
    opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    filter 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity, filter, transform;
}

.post-image.is-loaded {
  opacity: 1;
  filter: blur(0);
  transform: scale(1);
}

.post-image-skeleton {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.post-image-placeholder {
  width: 100%;
  /* 固定宽高比，防止布局偏移 */
  aspect-ratio: 16 / 9;
  background: var(--glass-bg);
}

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
}

.post-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
  margin-top: var(--spacing-2);
}

.post-author {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin: 0;
  flex: 1;
  min-width: 0;
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

/* ========== Hover Details Overlay ========== */
.hover-details-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: var(--spacing-3);
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.85) 0%,
    rgba(0, 0, 0, 0.6) 40%,
    rgba(0, 0, 0, 0.2) 70%,
    transparent 100%
  );
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  /* GPU 加速 */
  will-change: opacity, transform;
  transform: translate3d(0, 0, 0);
}

.hover-details-content {
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.hover-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  line-height: 1.4;
  margin: 0 0 var(--spacing-1);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hover-author {
  font-size: var(--text-xs);
  opacity: 0.9;
  margin: 0 0 var(--spacing-2);
}

.hover-stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-3);
  font-size: var(--text-xs);
  margin-bottom: var(--spacing-2);
}

.hover-stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  opacity: 0.9;
}

.hover-platform {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  opacity: 0.8;
  margin: 0;
}

/* GPU 加速过渡动画 */
.hover-details-enter-active,
.hover-details-leave-active {
  transition:
    opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.hover-details-enter-from {
  opacity: 0;
  transform: translate3d(0, 10px, 0);
}

.hover-details-leave-to {
  opacity: 0;
  transform: translate3d(0, 5px, 0);
}

/* 移动端禁用悬浮详情（触摸设备没有 hover） */
@media (hover: none) {
  .hover-details-overlay {
    display: none !important;
  }
}

/* 减少动效偏好 */
@media (prefers-reduced-motion: reduce) {
  .hover-details-enter-active,
  .hover-details-leave-active {
    transition: opacity 0.1s;
  }

  .hover-details-enter-from,
  .hover-details-leave-to {
    transform: none;
  }
}
</style>
