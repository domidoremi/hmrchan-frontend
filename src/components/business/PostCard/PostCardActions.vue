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
/**
 * 帖子卡片快捷操作组件
 *
 * 业务功能：
 * - 提供帖子的快捷操作按钮（收藏、分享、书签、更多）
 * - 悬停时显示，提供流畅的交互体验
 * - 支持激活状态显示（如已收藏、已书签）
 *
 * 业务场景：
 * - 用户快速收藏感兴趣的帖子
 * - 分享帖子到其他平台
 * - 添加书签以便后续查看
 * - 访问更多操作选项
 *
 * Props:
 * - showFavorite: 是否显示收藏按钮
 * - showShare: 是否显示分享按钮
 * - showBookmark: 是否显示书签按钮
 * - showMore: 是否显示更多按钮
 * - isFavorited: 是否已收藏
 * - isBookmarked: 是否已书签
 *
 * Emits:
 * - favorite: 收藏操作
 * - share: 分享操作
 * - bookmark: 书签操作
 * - more: 更多操作
 */

import { Heart, Share2, Bookmark, MoreVertical } from 'lucide-vue-next'

interface Props {
  /** 是否显示收藏按钮 */
  showFavorite?: boolean
  /** 是否显示分享按钮 */
  showShare?: boolean
  /** 是否显示书签按钮 */
  showBookmark?: boolean
  /** 是否显示更多按钮 */
  showMore?: boolean
  /** 是否已收藏 */
  isFavorited?: boolean
  /** 是否已书签 */
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
  /** 收藏事件 */
  (e: 'favorite'): void
  /** 分享事件 */
  (e: 'share'): void
  /** 书签事件 */
  (e: 'bookmark'): void
  /** 更多选项事件 */
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
