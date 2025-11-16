<template>
  <div class="card-actions" role="toolbar" aria-label="Post actions">
    <button
      v-if="showFavorite"
      type="button"
      class="action-button"
      :class="{ active: isFavorited }"
      :aria-label="isFavorited ? 'Remove from favorites' : 'Add to favorites'"
      :aria-pressed="isFavorited"
      @click.prevent.stop="$emit('favorite')"
    >
      <Heart :size="18" :fill="isFavorited ? 'currentColor' : 'none'" />
    </button>

    <button
      v-if="showShare"
      type="button"
      class="action-button"
      aria-label="Share post"
      @click.prevent.stop="$emit('share')"
    >
      <Share2 :size="18" />
    </button>

    <button
      v-if="showBookmark"
      type="button"
      class="action-button"
      :class="{ active: isBookmarked }"
      :aria-label="isBookmarked ? 'Remove bookmark' : 'Bookmark post'"
      :aria-pressed="isBookmarked"
      @click.prevent.stop="$emit('bookmark')"
    >
      <Bookmark :size="18" :fill="isBookmarked ? 'currentColor' : 'none'" />
    </button>

    <button
      v-if="showMore"
      type="button"
      class="action-button"
      aria-label="More options"
      aria-haspopup="true"
      @click.prevent.stop="$emit('more')"
    >
      <MoreVertical :size="18" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { Heart, Share2, Bookmark, MoreVertical } from 'lucide-vue-next'

interface Props {
  showFavorite?: boolean
  showShare?: boolean
  showBookmark?: boolean
  showMore?: boolean
  isFavorited?: boolean
  isBookmarked?: boolean
}

withDefaults(defineProps<Props>(), {
  showFavorite: true,
  showShare: true,
  showBookmark: false,
  showMore: true,
  isFavorited: false,
  isBookmarked: false,
})

defineEmits<{
  (e: 'favorite'): void
  (e: 'share'): void
  (e: 'bookmark'): void
  (e: 'more'): void
}>()
</script>

<style scoped>
.card-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  opacity: 0;
  transform: translateY(-8px);
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
  z-index: 20;
}

/* 显示快捷操作 */
:deep(.post-card:hover) .card-actions,
:deep(.post-card:focus-within) .card-actions {
  opacity: 1;
  transform: translateY(0);
}

.action-button {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.action-button:hover {
  background: rgba(0, 0, 0, 0.8);
  transform: scale(1.1);
}

.action-button:active {
  transform: scale(0.95);
}

.action-button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.action-button.active {
  background: var(--color-primary);
  color: white;
}

.action-button.active:hover {
  background: var(--color-primary-dark, #7c3aed);
}

/* 移动端始终显示 */
@media (max-width: 768px) {
  .card-actions {
    opacity: 1;
    transform: translateY(0);
  }

  .action-button {
    width: 32px;
    height: 32px;
  }
}

/* 主题适配 */
[data-theme='light'] .action-button {
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-text-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

[data-theme='light'] .action-button:hover {
  background: white;
}

[data-theme='light'] .action-button.active {
  background: var(--color-primary);
  color: white;
}
</style>
