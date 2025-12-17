<template>
  <button
    type="button"
    class="post-card glass-card post-card-btn"
    @click="handleClick"
  >
    <div class="post-image-wrapper" :style="imageWrapperStyle">
      <img
        v-if="thumbnailSrc"
        ref="imageRef"
        class="post-image"
        :src="thumbnailSrc"
        :alt="post.title"
        loading="lazy"
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
import { ref, computed } from 'vue'
import type { PostListItem } from '@/api'
import { normalizeToThumbnailUrl, getResponsiveThumbnailSize } from '@/utils/mediaOptimizer'

export interface PostCardProps {
  post: PostListItem
  maxHeight?: number
  showContent?: boolean
  showAuthor?: boolean
  thumbnailSize?: 'small' | 'medium' | 'large' | 'responsive'
}

const props = withDefaults(defineProps<PostCardProps>(), {
  maxHeight: 400,
  showContent: true,
  showAuthor: true,
  thumbnailSize: 'responsive',
})

const emit = defineEmits<{
  click: [postId: string, thumbnailSrc: string | null]
}>()

const imageRef = ref<HTMLImageElement | null>(null)
const isImageLoaded = ref(false)

const effectiveThumbnailSize = computed(() => {
  if (props.thumbnailSize === 'responsive') {
    return getResponsiveThumbnailSize('small')
  }
  return props.thumbnailSize
})

const thumbnailSrc = computed(() => {
  if (!props.post.thumbnail_url) return null
  return normalizeToThumbnailUrl(props.post.thumbnail_url, effectiveThumbnailSize.value) || props.post.thumbnail_url
})

const imageWrapperStyle = computed(() => {
  return {
    '--max-height': `${props.maxHeight}px`,
  }
})

function onImageLoad() {
  isImageLoaded.value = true
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
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
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
  max-height: var(--max-height, 400px);
  overflow: hidden;
  background: var(--glass-bg-light);
}

.post-image {
  width: 100%;
  height: auto;
  display: block;
  max-height: var(--max-height, 400px);
  object-fit: cover;
  object-position: top center;
}

.post-image-placeholder {
  width: 100%;
  padding-bottom: 75%;
  background: var(--glass-bg);
}

.post-content {
  padding: var(--spacing-4);
}

.post-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-meta {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: var(--spacing-1) 0 0;
}

/* 移动端限制更严格的高度 */
@media (max-width: 600px) {
  .post-image-wrapper {
    max-height: min(var(--max-height, 400px), 50vh);
  }

  .post-image {
    max-height: min(var(--max-height, 400px), 50vh);
  }
}
</style>
