<template>
  <button
    type="button"
    class="post-card glass-card post-card-btn post-card-optimized"
    @click="handleClick"
    @mouseenter="prefetchPostDetailPage"
    @focus="prefetchPostDetailPage"
  >
    <div class="post-image-wrapper" :style="imageWrapperStyle">
      <div v-if="thumbnailSrc && !isImageLoaded" class="post-image-skeleton skeleton" />
      <div v-if="post.platform" class="platform-badge">{{ platformLabel }}</div>
      <img
        v-if="thumbnailSrc"
        class="post-image"
        :class="{ 'is-loaded': isImageLoaded }"
        :src="thumbnailSrc"
        :srcset="thumbnailSrcset || undefined"
        :sizes="thumbnailSizes"
        :alt="post.title"
        loading="lazy"
        decoding="async"
        @load="onImageLoad"
      />
      <div v-else class="post-image-placeholder" />
    </div>

    <div v-if="showContent" class="post-content">
      <h3 class="post-title">{{ post.title }}</h3>
      <p v-if="showAuthor" class="post-meta">{{ post.author_name }}</p>
    </div>
  </button>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PostListItem } from '@/api'
import { prefetchPostDetail } from '@/utils/prefetch'
import {
  normalizeToThumbnailUrl,
  getResponsiveThumbnailSize,
  extractMediaIdFromUrl,
  getMediaThumbnailUrl,
  THUMBNAIL_SIZES,
} from '@/utils/mediaOptimizer'

const postAspectRatioCache = new Map<string, string>()

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

const isImageLoaded = ref(false)
const measuredAspectRatio = ref<string | null>(null)

let hasPrefetchedPostDetailPage = false

const platformLabel = computed(() => {
  const raw = props.post.platform
  if (!raw) return ''

  const map: Record<string, string> = {
    bilibili: 'Bilibili',
    youtube: 'YouTube',
    twitter: 'Twitter',
    pixiv: 'Pixiv',
    weibo: 'Weibo',
  }

  return map[raw] ?? raw.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
})

const effectiveThumbnailSize = computed(() => {
  if (props.thumbnailSize === 'responsive') {
    // 卡片列表使用 small 作为基准，避免加载过大图片
    return getResponsiveThumbnailSize('small')
  }
  return props.thumbnailSize
})

const thumbnailSrc = computed(() => {
  if (!props.post.thumbnail_url) return null
  return (
    normalizeToThumbnailUrl(props.post.thumbnail_url, effectiveThumbnailSize.value) ||
    props.post.thumbnail_url
  )
})

// 卡片视图只使用 small/medium，不加载 large 以节省带宽
const thumbnailSrcset = computed(() => {
  const mediaId = extractMediaIdFromUrl(props.post.thumbnail_url)
  if (!mediaId) return null

  const small = getMediaThumbnailUrl(mediaId, 'small')
  const medium = getMediaThumbnailUrl(mediaId, 'medium')

  // 不包含 large，限制最大加载 medium (400px)
  return `${small} ${THUMBNAIL_SIZES.small.width}w, ${medium} ${THUMBNAIL_SIZES.medium.width}w`
})

// 保守的 sizes 值，确保浏览器不会选择过大的图片
const thumbnailSizes = computed(() => {
  if (!thumbnailSrcset.value) return undefined

  // 卡片实际显示宽度通常 < 300px，即使 2x DPR 也只需 medium
  return '(max-width: 599px) 50vw, 200px'
})

const wrapperAspectRatio = computed(() => {
  if (props.aspectRatio !== undefined && props.aspectRatio !== null && props.aspectRatio !== '') {
    return String(props.aspectRatio)
  }

  if (measuredAspectRatio.value) return measuredAspectRatio.value

  const cached = postAspectRatioCache.get(props.post.id)
  if (cached) return cached

  return '16 / 9'
})

const imageWrapperStyle = computed<Record<string, string>>(() => ({
  aspectRatio: wrapperAspectRatio.value,
}))

watch(thumbnailSrc, () => {
  isImageLoaded.value = false
  measuredAspectRatio.value = null
})

function onImageLoad(event: Event) {
  const img = event.target as HTMLImageElement | null
  if (img?.naturalWidth && img?.naturalHeight) {
    const ratio = (img.naturalWidth / img.naturalHeight).toFixed(4)
    measuredAspectRatio.value = ratio
    postAspectRatioCache.set(props.post.id, ratio)
  }
  isImageLoaded.value = true
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
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
}

.post-card-btn:hover,
.post-card-btn:focus-visible {
  transform: translateY(-2px) scale(1.01);
  box-shadow: var(--shadow-lg);
}

.post-card-btn:active {
  transform: translateY(0);
}

.post-image-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: var(--glass-bg-light);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.platform-badge {
  position: absolute;
  top: var(--spacing-2);
  left: var(--spacing-2);
  z-index: 2;
  padding: var(--spacing-0) var(--spacing-2);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.post-image {
  position: relative;
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
  opacity: 0;
  transition: opacity var(--transition-fast);
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
  height: 100%;
  background: var(--glass-bg);
}

.post-content {
  padding: var(--spacing-3);
}

.post-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

.post-meta {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin: var(--spacing-1) 0 0;
}
</style>
