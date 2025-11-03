<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import logger from '@/utils/logger'

interface Props {
  fallback?: boolean
  onError?: (error: Error, instance: any, info: string) => void
}

const props = withDefaults(defineProps<Props>(), {
  fallback: true,
})

const error = ref<Error | null>(null)
const errorInfo = ref<string>('')
const hasError = ref(false)
const router = useRouter()
const { t } = useI18n()
const isDev = import.meta.env.DEV

// 捕获子组件错误
onErrorCaptured((err: Error, instance: any, info: string) => {
  logger.criticalError('[ErrorBoundary] Caught error:', err)
  logger.criticalError('[ErrorBoundary] Error info:', info)

  error.value = err
  errorInfo.value = info
  hasError.value = true

  // 调用自定义错误处理
  if (props.onError) {
    props.onError(err, instance, info)
  }

  // 阻止错误继续向上传播
  return false
})

const reset = () => {
  error.value = null
  errorInfo.value = ''
  hasError.value = false
}

const goHome = () => {
  reset()
  router.push('/')
}

const reload = () => {
  window.location.reload()
}
</script>

<template>
  <div v-if="hasError && fallback" class="error-boundary">
    <div class="error-container">
      <div class="error-icon">⚠️</div>
      <h1 class="error-title">{{ t('error.title') }}</h1>
      <p class="error-message">{{ error?.message || t('error.unknown') }}</p>

      <details v-if="isDev" class="error-details">
        <summary>{{ t('error.details') }}</summary>
        <pre class="error-stack">{{ error?.stack }}</pre>
        <p class="error-info"><strong>{{ t('error.componentInfo') }}:</strong> {{ errorInfo }}</p>
      </details>

      <div class="error-actions">
        <button @click="reset" class="btn btn-primary">{{ t('error.retry') }}</button>
        <button @click="goHome" class="btn btn-secondary">{{ t('error.goHome') }}</button>
        <button @click="reload" class="btn btn-secondary">{{ t('error.reload') }}</button>
      </div>
    </div>
  </div>

  <slot v-else />
</template>

<style scoped>
.error-boundary {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.error-container {
  max-width: 600px;
  background: white;
  border-radius: 1rem;
  padding: 3rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-10px);
  }
  75% {
    transform: translateX(10px);
  }
}

.error-title {
  font-size: 2rem;
  font-weight: bold;
  color: #dc2626;
  margin-bottom: 1rem;
}

.error-message {
  font-size: 1.125rem;
  color: #6b7280;
  margin-bottom: 2rem;
}

.error-details {
  text-align: left;
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f3f4f6;
  border-radius: 0.5rem;
  cursor: pointer;
}

.error-details summary {
  font-weight: 600;
  color: #374151;
  user-select: none;
}

.error-stack {
  margin-top: 1rem;
  padding: 1rem;
  background: #1f2937;
  color: #f3f4f6;
  border-radius: 0.25rem;
  overflow-x: auto;
  font-size: 0.875rem;
  line-height: 1.5;
}

.error-info {
  margin-top: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 1rem;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover {
  background: #d1d5db;
  transform: translateY(-2px);
}
</style>
