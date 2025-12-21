<template>
  <button
    ref="cardRef"
    type="button"
    class="post-card glass-card post-card-btn"
    @click="handleClick"
    @mouseenter="prefetchPostDetailPage"
    @focus="prefetchPostDetailPage"
  >
    <div class="post-image-wrapper" :style="imageWrapperStyle">
      <!-- Platform Icon Badge -->
      <div v-if="post.platform" class="platform-icon" :title="platformLabel">
        <component :is="platformIcon" :size="14" />
      </div>

      <!-- 预设固定尺寸的占位符，防止图片加载时的布局偏移 -->
      <div v-if="!isImageLoaded" class="post-image-placeholder" />

      <img
        v-if="thumbnailSrc"
        class="post-image"
        :class="{ 'is-loaded': isImageLoaded }"
        :src="thumbnailSrc"
        :alt="post.title"
        width="640"
        height="360"
        loading="lazy"
        decoding="async"
        @load="onImageLoad"
        @error="onImageError"
      />

      <!-- Duration Badge (for videos) -->
      <div v-if="post.duration" class="duration-badge">
        {{ formatDuration(post.duration) }}
      </div>
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
import { Youtube, Twitter, Globe, Music2, Eye, Heart } from 'lucide-vue-next'
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

/** 默认宽高比，用于防止布局偏移 */
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

let hasPrefetchedPostDetailPage = false

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

  const optimized = normalizeToThumbnailUrl(props.post.thumbnail_url, rawSize) || props.post.thumbnail_url

  // 存入缓存
  if (mediaId) {
    thumbnailCache.set(mediaId, optimized, size)
  }

  return optimized
})

// 移除 srcset 以避免双重加载图片

/**
 * 计算图片容器的宽高比
 * 优化 CLS：使用固定宽高比，不在图片加载后动态更新
 */
const wrapperAspectRatio = computed(() => {
  // 优先使用 props 传入的宽高比
  if (props.aspectRatio !== undefined && props.aspectRatio !== null && props.aspectRatio !== '') {
    return String(props.aspectRatio)
  }

  // 使用缓存的宽高比（仅用于已知尺寸的帖子）
  const cached = postAspectRatioCache.get(props.post.id)
  if (cached) return cached

  // 使用固定的默认宽高比，避免布局偏移
  return DEFAULT_ASPECT_RATIO
})

const imageWrapperStyle = computed<Record<string, string>>(() => ({
  aspectRatio: wrapperAspectRatio.value,
}))

watch(thumbnailSrc, () => {
  isImageLoaded.value = false
})

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
  transition: opacity var(--transition-fast);
  will-change: transform;
}

.post-image.is-loaded {
  opacity: 1;
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
</style>
