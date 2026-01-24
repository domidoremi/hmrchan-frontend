<template>
  <slot v-if="!hasError" />
  <div v-else class="error-boundary">
    <div class="error-panel glass-card">
      <div class="error-badge">
        <AlertTriangle :size="26" />
        <span>{{ $t('error.componentError') }}</span>
      </div>

      <h2 class="error-title">{{ headline }}</h2>
      <p class="error-message">{{ errorMessage }}</p>

      <div class="error-actions">
        <Button variant="primary" @click="retry">
          <RefreshCw :size="16" />
          {{ $t('common.retry') }}
        </Button>
        <Button variant="secondary" @click="copyReport">
          <Copy :size="16" />
          {{ copyLabel }}
        </Button>
        <Button variant="ghost" @click="goHome">
          <Home :size="16" />
          {{ $t('nav.home') }}
        </Button>
      </div>

      <div class="error-meta">
        <span>{{ $t('error.technicalDetails') }}</span>
        <span class="error-meta-divider">•</span>
        <span>{{ timestamp }}</span>
      </div>

      <details v-if="isDev && errorDetails" class="error-details">
        <summary>{{ $t('error.technicalDetails') || 'Technical details' }}</summary>
        <pre class="error-stack">{{ errorDetails }}</pre>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { AlertTriangle, RefreshCw, Home, Copy } from 'lucide-vue-next'
import Button from './Button.vue'

interface Props {
  fallbackMessage?: string
  headline?: string
  logError?: boolean
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
const { t } = useI18n()
const hasError = ref(false)
const errorMessage = ref('')
const errorDetails = ref('')
const timestamp = ref('')
const copyLabel = ref(t('error.copyReport'))

const isDev = computed(() => import.meta.env.DEV)
const headline = computed(() => props.headline || t('error.componentError'))

onErrorCaptured((error: Error, instance, info: string) => {
  hasError.value = true
  errorMessage.value = props.fallbackMessage || error.message || 'An unexpected error occurred'
  errorDetails.value = `${error.name}: ${error.message}\n\nComponent: ${instance?.$options?.name || 'Unknown'}\nInfo: ${info}\n\nStack:\n${error.stack || 'No stack trace available'}`
  timestamp.value = new Date().toLocaleString()

  if (props.logError) {
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Component info:', info)
  }

  props.onError?.(error, info)
  emit('error', error, info)

  return false
})

function retry() {
  hasError.value = false
  errorMessage.value = ''
  errorDetails.value = ''
  copyLabel.value = t('error.copyReport')
  emit('retry')
}

function goHome() {
  hasError.value = false
  router.push('/')
}

async function copyReport() {
  const report = `${errorMessage.value}\n${errorDetails.value}\nTime: ${timestamp.value}`
  try {
    await navigator.clipboard.writeText(report)
    copyLabel.value = t('error.copySuccess')
  } catch {
    copyLabel.value = t('error.copyFailed')
  }
}
</script>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  padding: var(--spacing-6);
}

.error-panel {
  max-width: 520px;
  width: 100%;
  padding: var(--spacing-8);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.error-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-full);
  background: rgba(var(--color-error-rgb), 0.12);
  color: var(--color-error);
  font-size: var(--text-sm);
  margin: 0 auto;
}

.error-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.error-message {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0;
}

.error-actions {
  display: flex;
  justify-content: center;
  gap: var(--spacing-3);
  flex-wrap: wrap;
}

.error-meta {
  display: flex;
  justify-content: center;
  gap: var(--spacing-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.error-meta-divider {
  opacity: 0.6;
}

.error-details {
  margin-top: var(--spacing-2);
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
  max-height: 220px;
  overflow-y: auto;
}

@media (max-width: 640px) {
  .error-panel {
    padding: var(--spacing-6);
  }

  .error-actions {
    flex-direction: column;
  }

  .error-actions .btn {
    width: 100%;
  }
}
</style>