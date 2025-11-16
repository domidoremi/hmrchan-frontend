<template>
  <div ref="mediaRef" class="card-media">
    <div class="media-wrapper">
      <OptimizedImage
        v-if="thumbnailUrl"
        :src="thumbnailUrl"
        :alt="alt"
        :lazy="!isFirstScreen"
        :loading="isFirstScreen ? 'eager' : 'lazy'"
        :fetchpriority="isFirstScreen ? 'high' : 'auto'"
        class="media-image"
      />
      <div v-else class="media-placeholder">
        <ImageIcon :size="48" />
      </div>
      <!-- 渐变遮罩 -->
      <div class="media-overlay"></div>
    </div>

    <!-- 悬浮标签 -->
    <div class="card-badges">
      <div class="platform-badge" :style="{ backgroundColor: platformColor }">
        {{ platformName }}
      </div>
      <div v-if="duration" class="duration-badge">
        <Play :size="12" />
        {{ formatDuration(duration) }}
      </div>
      <div v-if="mediaCount > 1" class="media-count-badge">
        <ImageIcon :size="12" />
        {{ mediaCount }}
      </div>
    </div>

    <!-- 转发标记 -->
    <div v-if="isRetweet" class="retweet-indicator">
      <Repeat2 :size="16" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ImageIcon, Play, Repeat2 } from 'lucide-vue-next'
import OptimizedImage from '@/components/ui/image/OptimizedImage.vue'
import { formatDuration } from '@/utils/format'

interface Props {
  thumbnailUrl?: string
  alt: string
  isFirstScreen?: boolean
  platformColor: string
  platformName: string
  duration?: number | null
  mediaCount: number
  isRetweet: boolean
}

withDefaults(defineProps<Props>(), {
  thumbnailUrl: '',
  isFirstScreen: false,
  duration: null,
})

const mediaRef = ref<HTMLElement | null>(null)

defineExpose({
  mediaRef,
})
</script>

<style scoped>
/* ========================================
   Media Section
   ======================================== */

.card-media {
  position: relative;
  width: 100%;
  flex-shrink: 0;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.06) 0%,
    rgba(6, 182, 212, 0.06) 50%,
    rgba(244, 114, 182, 0.06) 100%
  );
}

.media-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  /* 横向渐变模糊（媒体宽度不足时） */
  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 60px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &::before {
    left: 0;
    background: linear-gradient(to right, rgba(139, 92, 246, 0.3) 0%, transparent 100%);
  }

  &::after {
    right: 0;
    background: linear-gradient(to left, rgba(139, 92, 246, 0.3) 0%, transparent 100%);
  }
}

/* 当图片宽度不足时显示渐变 */
.media-wrapper:has(img[style*='object-fit: contain'])::before,
.media-wrapper:has(img[style*='object-fit: contain'])::after {
  opacity: 1;
}

/* 媒体图片 - 瀑布流自适应 */
.media-wrapper :deep(.media-image),
.media-wrapper :deep(img) {
  width: 100%;
  height: auto;
  max-height: 600px;
  object-fit: cover;
  display: block;
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 渐变遮罩 */
.media-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0) 100%);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

/* Placeholder */
.media-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  opacity: 0.2;
}

/* ========================================
   Badges & Indicators
   ======================================== */

.card-badges {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  z-index: 10;
  pointer-events: none;
}

.platform-badge,
.duration-badge,
.media-count-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  gap: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.platform-badge {
  opacity: 0.95;
  transition: opacity 0.3s ease;
}

.duration-badge,
.media-count-badge {
  background: rgba(0, 0, 0, 0.7);
  margin-left: auto;
}

/* 转发指示器 */
.retweet-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(34, 197, 94, 0.95);
  border-radius: 50%;
  color: white;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
  z-index: 10;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.8;
  }
}

/* ========================================
   Responsive Design
   ======================================== */

@media (max-width: 768px) {
  .media-wrapper :deep(img) {
    max-height: 400px;
  }

  .platform-badge,
  .duration-badge,
  .media-count-badge {
    font-size: 10px;
    padding: 3px 8px;
  }
}

/* ========================================
   Theme Adaptations
   ======================================== */

[data-theme='light'] .media-overlay {
  background: linear-gradient(to top, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%);
}
</style>
