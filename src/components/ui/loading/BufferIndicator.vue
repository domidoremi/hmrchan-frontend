<template>
  <div v-if="isBuffering" class="buffer-indicator" role="status" :aria-label="$t('aria.buffering')">
    <div class="buffer-spinner">
      <div class="spinner-ring"></div>
      <div class="spinner-ring"></div>
      <div class="spinner-ring"></div>
    </div>

    <div v-if="showLabel" class="buffer-label">
      {{ label || $t('post.buffering') }}
    </div>

    <div v-if="showStats && bufferStats" class="buffer-stats">
      <div class="stat-item">
        <span class="stat-label">{{ $t('common.buffered') }}:</span>
        <span class="stat-value">{{ formatDuration(bufferStats.buffered) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">{{ $t('common.speed') }}:</span>
        <span class="stat-value">{{ bufferStats.downloadSpeed }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface BufferStats {
  buffered: number // 已缓冲秒数
  duration: number // 总时长
  downloadSpeed: string // 下载速度
}

interface Props {
  /**
   * 是否正在缓冲
   */
  isBuffering: boolean

  /**
   * 是否显示标签
   */
  showLabel?: boolean

  /**
   * 自定义标签文本
   */
  label?: string

  /**
   * 是否显示统计信息
   */
  showStats?: boolean

  /**
   * 缓冲统计
   */
  bufferStats?: BufferStats

  /**
   * 指示器大小
   */
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  showLabel: true,
  showStats: false,
  size: 'medium',
})

/**
 * 格式化时长
 */
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * 计算指示器尺寸
 */
const spinnerSize = computed(() => {
  switch (props.size) {
    case 'small':
      return '40px'
    case 'large':
      return '80px'
    default:
      return '60px'
  }
})
</script>

<style scoped>
.buffer-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

.buffer-spinner {
  width: v-bind(spinnerSize);
  height: v-bind(spinnerSize);
  position: relative;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 3px solid transparent;
  border-top-color: var(--color-primary, #8b5cf6);
  border-radius: 50%;
  animation: spin 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
}

.spinner-ring:nth-child(2) {
  width: 85%;
  height: 85%;
  top: 7.5%;
  left: 7.5%;
  border-top-color: rgba(139, 92, 246, 0.6);
  animation-delay: -0.5s;
}

.spinner-ring:nth-child(3) {
  width: 70%;
  height: 70%;
  top: 15%;
  left: 15%;
  border-top-color: rgba(139, 92, 246, 0.3);
  animation-delay: -1s;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.buffer-label {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
}

.buffer-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.stat-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.stat-label {
  opacity: 0.7;
}

.stat-value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* 暗色模式 */
:deep(.dark) .buffer-indicator {
  background: rgba(0, 0, 0, 0.9);
}

/* 响应式 */
@media (max-width: 480px) {
  .buffer-indicator {
    padding: 16px;
    gap: 8px;
  }

  .buffer-label {
    font-size: 13px;
  }

  .buffer-stats {
    font-size: 11px;
  }
}
</style>
