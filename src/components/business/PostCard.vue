<template>
  <button
    type="button"
    class="post-card glass-card post-card-btn"
    @click="handleClick"
  >
    <div class="post-image-wrapper">
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
  showContent?: boolean
  showAuthor?: boolean
  thumbnailSize?: 'small' | 'medium' | 'large' | 'responsive'
}

const props = withDefaults(defineProps<PostCardProps>(), {
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
    return getResponsiveThumbnailSize('medium')
  }
  return props.thumbnailSize
})

const thumbnailSrc = computed(() => {
  if (!props.post.thumbnail_url) return null
  return normalizeToThumbnailUrl(props.post.thumbnail_url, effectiveThumbnailSize.value) || props.post.thumbnail_url
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
  overflow: hidden;
  background: var(--glass-bg-light);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.post-image {
  width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
}

.post-image-placeholder {
  width: 100%;
  aspect-ratio: 4 / 3;
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
