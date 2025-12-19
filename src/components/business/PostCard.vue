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

const effectiveThumbnailSize = computed(() => {
  if (props.thumbnailSize === 'responsive') {
    return getResponsiveThumbnailSize('medium')
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

const thumbnailSrcset = computed(() => {
  const mediaId = extractMediaIdFromUrl(props.post.thumbnail_url)
  if (!mediaId) return null

  const small = getMediaThumbnailUrl(mediaId, 'small')
  const medium = getMediaThumbnailUrl(mediaId, 'medium')
  const large = getMediaThumbnailUrl(mediaId, 'large')

  return `${small} ${THUMBNAIL_SIZES.small.width}w, ${medium} ${THUMBNAIL_SIZES.medium.width}w, ${large} ${THUMBNAIL_SIZES.large.width}w`
})

const thumbnailSizes = computed(() => {
  if (!thumbnailSrcset.value) return undefined

  return '(max-width: 399px) 100vw, (max-width: 599px) 50vw, (max-width: 1199px) 33vw, (max-width: 1599px) 25vw, (max-width: 1919px) 20vw, 16vw'
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
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
}

.post-card-btn:hover {
  transform: translateY(-2px);
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
