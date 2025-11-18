<template>
  <div
    v-if="visible"
    class="loading-progress"
    role="progressbar"
    :aria-valuenow="progress"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div class="progress-container">
      <div class="progress-bar" :style="{ width: `${progress}%` }">
        <div class="progress-glow"></div>
      </div>
    </div>

    <div v-if="showLabel" class="progress-label">
      <span class="progress-text">{{ label || $t('common.loading') }}</span>
      <span class="progress-percent">{{ Math.round(progress) }}%</span>
    </div>

    <div v-if="showSpeed && speed" class="progress-speed">
      {{ formatSpeed(speed) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /**
   * 进度值 (0-100)
   */
  progress: number

  /**
   * 是否可见
   */
  visible?: boolean

  /**
   * 是否显示标签
   */
  showLabel?: boolean

  /**
   * 自定义标签文本
   */
  label?: string

  /**
   * 是否显示速度
   */
  showSpeed?: boolean

  /**
   * 加载速度 (bytes/second)
   */
  speed?: number

  /**
   * 进度条类型
   */
  variant?: 'default' | 'success' | 'warning' | 'error'
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
  showLabel: true,
  showSpeed: false,
  variant: 'default',
})

/**
 * 格式化速度
 */
const formatSpeed = (bytesPerSecond: number): string => {
  if (bytesPerSecond < 1024) {
    return `${bytesPerSecond.toFixed(0)} B/s`
  } else if (bytesPerSecond < 1024 * 1024) {
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
  } else {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
  }
}

/**
 * 进度条颜色
 */
const progressColor = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'var(--color-success)'
    case 'warning':
      return 'var(--color-warning)'
    case 'error':
      return 'var(--color-error)'
    default:
      return 'var(--color-primary, #8b5cf6)'
  }
})
</script>

<style scoped>
.loading-progress {
  width: 100%;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.progress-container {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-bar {
  height: 100%;
  background: v-bind(progressColor);
  border-radius: 4px;
  transition: width 0.3s ease;
  position: relative;
  overflow: hidden;
}

.progress-glow {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  to {
    left: 200%;
  }
}

.progress-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
}

.progress-text {
  font-weight: 500;
}

.progress-percent {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.progress-speed {
  margin-top: 4px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  text-align: right;
}

/* 暗色模式 */
:deep(.dark) .loading-progress {
  background: rgba(0, 0, 0, 0.8);
}

/* 响应式 */
@media (max-width: 480px) {
  .loading-progress {
    padding: 8px 12px;
  }

  .progress-label {
    font-size: 12px;
  }

  .progress-speed {
    font-size: 10px;
  }
}
</style>
