<template>
  <button
    type="button"
    class="post-card glass-card post-card-btn"
    @click="$emit('click', post.id)"
  >
    <img
      v-if="thumbnailSrc"
      class="post-image"
      :src="thumbnailSrc"
      :alt="post.title"
      loading="lazy"
      :style="imageStyle"
    />
    <div v-else class="post-image skeleton" :style="imageStyle" />

    <div v-if="showContent" class="post-content">
      <h3 class="post-title">{{ post.title }}</h3>
      <p v-if="showAuthor" class="post-meta">{{ post.author_name }}</p>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PostListItem } from '@/api'
import { normalizeToThumbnailUrl } from '@/utils/mediaOptimizer'

export interface PostCardProps {
  post: PostListItem
  aspectRatio?: string | 'auto'
  showContent?: boolean
  showAuthor?: boolean
  thumbnailSize?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<PostCardProps>(), {
  aspectRatio: 'auto',
  showContent: true,
  showAuthor: true,
  thumbnailSize: 'medium',
})

defineEmits<{
  click: [postId: string]
}>()

const thumbnailSrc = computed(() => {
  if (!props.post.thumbnail_url) return null
  return normalizeToThumbnailUrl(props.post.thumbnail_url, props.thumbnailSize) || props.post.thumbnail_url
})

const imageStyle = computed(() => {
  if (props.aspectRatio === 'auto') {
    return { objectFit: 'cover' as const }
  }
  return {
    aspectRatio: props.aspectRatio,
    objectFit: 'cover' as const,
  }
})
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

.post-image {
  width: 100%;
  display: block;
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
</style>
