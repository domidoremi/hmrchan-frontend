<template>
  <slot v-if="!hasError" />
  <div v-else class="error-boundary">
    <div class="error-content glass-card">
      <div class="error-icon">
        <AlertTriangle :size="48" />
      </div>
      <h2 class="error-title">{{ $t('error.componentError') }}</h2>
      <p class="error-message">{{ errorMessage }}</p>

      <div class="error-actions">
        <Button variant="primary" @click="retry">
          <RefreshCw :size="16" />
          {{ $t('common.retry') }}
        </Button>
        <Button variant="ghost" @click="goHome">
          <Home :size="16" />
          {{ $t('nav.home') }}
        </Button>
      </div>

      <!-- 开发环境显示详细错误信息 -->
      <details v-if="isDev && errorDetails" class="error-details">
        <summary>{{ $t('error.technicalDetails') }}</summary>
        <pre class="error-stack">{{ errorDetails }}</pre>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, computed } from 'vue'
import { useRouter } from 'vue-router'
import { AlertTriangle, RefreshCw, Home } from 'lucide-vue-next'
import Button from './Button.vue'

interface Props {
  /** 自定义错误消息 */
  fallbackMessage?: string
  /** 是否在控制台输出错误 */
  logError?: boolean
  /** 错误回调 */
  onError?: (error: Error, info: string) => void
}

const props = withDefaults(defineProps<Props>(), {
  logError: true,
})

const emit = defineEmits<{
  error: [error: Error, info: string]
  retry: []
}>()

const router = useRouter()

const hasError = ref(false)
const errorMessage = ref('')
const errorDetails = ref('')

const isDev = computed(() => import.meta.env.DEV)

// 捕获子组件错误
onErrorCaptured((error: Error, instance, info: string) => {
  hasError.value = true
  errorMessage.value = props.fallbackMessage || error.message || 'An unexpected error occurred'
  errorDetails.value = `${error.name}: ${error.message}\n\nComponent: ${instance?.$options?.name || 'Unknown'}\nInfo: ${info}\n\nStack:\n${error.stack || 'No stack trace available'}`

  // 控制台输出
  if (props.logError) {
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Component info:', info)
  }

  // 触发回调
  props.onError?.(error, info)
  emit('error', error, info)

  // 阻止错误继续向上传播
  return false
})

function retry() {
  hasError.value = false
  errorMessage.value = ''
  errorDetails.value = ''
  emit('retry')
}

function goHome() {
  hasError.value = false
  router.push('/')
}
</script>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: var(--spacing-6);
}

.error-content {
  max-width: 480px;
  width: 100%;
  padding: var(--spacing-8);
  text-align: center;
}

.error-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin: 0 auto var(--spacing-4);
  background: rgba(var(--color-error-rgb), 0.1);
  border-radius: var(--radius-full);
  color: var(--color-error);
}

.error-title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-2);
}

.error-message {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-6);
  line-height: 1.6;
}

.error-actions {
  display: flex;
  justify-content: center;
  gap: var(--spacing-3);
  flex-wrap: wrap;
}

.error-details {
  margin-top: var(--spacing-6);
  text-align: left;
}

.error-details summary {
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  padding: var(--spacing-2);
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.error-details summary:hover {
  background: var(--glass-bg-subtle);
}

.error-stack {
  margin-top: var(--spacing-3);
  padding: var(--spacing-4);
  background: var(--color-surface-variant);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .error-content {
    padding: var(--spacing-6);
  }

  .error-icon {
    width: 64px;
    height: 64px;
  }

  .error-icon svg {
    width: 32px;
    height: 32px;
  }

  .error-actions {
    flex-direction: column;
  }

  .error-actions .btn {
    width: 100%;
  }
}
</style>
