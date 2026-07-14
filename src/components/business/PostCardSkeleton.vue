<template>
  <div class="post-card-skeleton glass-card">
    <!-- 图片区域 - 与 PostCard 完全匹配 -->
    <div class="skeleton-image-wrapper" :style="imageWrapperStyle">
      <!-- Platform Badge 占位 -->
      <div class="skeleton-platform-badge glass-skeleton glass-skeleton--wave" />
      <!-- 图片占位 -->
      <div class="skeleton-image glass-skeleton glass-skeleton--wave" />
    </div>

    <!-- 内容区域 - 与 PostCard 完全匹配 -->
    <div v-if="showContent" class="skeleton-content">
      <!-- 标题：两行，与 PostCard 的 line-clamp-2 匹配 -->
      <div class="skeleton-title-wrapper">
        <div class="skeleton-title glass-skeleton glass-skeleton--wave" />
        <div class="skeleton-title skeleton-title--short glass-skeleton glass-skeleton--wave" />
      </div>

      <div class="skeleton-excerpt">
        <div class="skeleton-line glass-skeleton glass-skeleton--wave" />
        <div class="skeleton-line skeleton-line--short glass-skeleton glass-skeleton--wave" />
      </div>

      <!-- Meta 区域 -->
      <div class="skeleton-meta">
        <div class="skeleton-author-wrapper">
          <div class="skeleton-avatar glass-skeleton glass-skeleton--wave" />
          <div class="skeleton-author glass-skeleton glass-skeleton--wave" />
        </div>
        <div class="skeleton-stats">
          <div class="skeleton-stat glass-skeleton glass-skeleton--wave" />
          <div class="skeleton-stat glass-skeleton glass-skeleton--wave" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" vapor>
import { computed } from 'vue'

interface Props {
  /** 是否显示内容区域 */
  showContent?: boolean
  /** 自定义宽高比 */
  aspectRatio?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  showContent: true,
  aspectRatio: '16 / 9',
})

const imageWrapperStyle = computed(() => ({
  aspectRatio: String(props.aspectRatio),
}))
</script>

<style scoped>
.post-card-skeleton {
  display: block;
  overflow: hidden;
  background:
    linear-gradient(
      160deg,
      color-mix(in srgb, var(--semantic-surface-base) 92%, transparent),
      color-mix(in srgb, var(--semantic-surface-muted) 84%, transparent)
    ),
    var(--glass-bg);
}

/* ========== 图片区域 ========== */
.skeleton-image-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--semantic-surface-base) 90%, transparent),
      color-mix(in srgb, var(--semantic-surface-muted) 82%, transparent)
    ),
    var(--glass-bg-light);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.skeleton-platform-badge {
  position: absolute;
  top: var(--spacing-2);
  left: var(--spacing-2);
  z-index: 3;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: var(--radius-full);
}

.skeleton-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 0;
}

/* ========== 内容区域 ========== */
.skeleton-content {
  display: grid;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
}

.skeleton-title-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.skeleton-title {
  height: 0.875rem;
  width: 100%;
  border-radius: var(--radius-sm);
}

.skeleton-title--short {
  width: 65%;
}

.skeleton-excerpt {
  display: grid;
  gap: 0.375rem;
}

.skeleton-line {
  height: 0.75rem;
  width: 100%;
  border-radius: var(--radius-sm);
}

.skeleton-line--short {
  width: 72%;
}

/* ========== Meta 区域 ========== */
.skeleton-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
}

.skeleton-author-wrapper {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  min-width: 0;
  flex: 1;
}

.skeleton-avatar {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.skeleton-author {
  height: 0.75rem;
  width: 4.5rem;
  border-radius: var(--radius-sm);
}

.skeleton-stats {
  display: flex;
  gap: var(--spacing-3);
  flex-shrink: 0;
}

.skeleton-stat {
  width: 2.25rem;
  height: 0.75rem;
  border-radius: var(--radius-sm);
}

/* ========== 交错动画延迟 ========== */
.post-card-skeleton .skeleton-platform-badge {
  animation-delay: 0ms;
}

.post-card-skeleton .skeleton-image {
  animation-delay: 50ms;
}

.post-card-skeleton .skeleton-title:first-child {
  animation-delay: 100ms;
}

.post-card-skeleton .skeleton-title--short {
  animation-delay: 150ms;
}

.post-card-skeleton .skeleton-avatar {
  animation-delay: 200ms;
}

.post-card-skeleton .skeleton-author {
  animation-delay: 250ms;
}

.post-card-skeleton .skeleton-stat:nth-child(1) {
  animation-delay: 300ms;
}

.post-card-skeleton .skeleton-stat:nth-child(2) {
  animation-delay: 350ms;
}
</style>
