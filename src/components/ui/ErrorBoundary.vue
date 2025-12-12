<template>
  <slot v-if="!hasError" />
  <div v-else class="error-boundary">
    <div class="error-content">
      <AlertTriangle :size="48" class="error-icon" />
      <h2>{{ $t('error.somethingWrong', 'Something went wrong') }}</h2>
      <p class="error-message">{{ errorMessage }}</p>
      <button class="retry-button" @click="reset">
        {{ $t('common.retry', 'Try Again') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import { logger } from '@/utils/logger'

const hasError = ref(false)
const errorMessage = ref('')

onErrorCaptured((error: Error) => {
  hasError.value = true
  errorMessage.value = error.message || 'An unexpected error occurred'
  logger.error('[ErrorBoundary] Caught error:', { error: error.message })
  return false
})

const reset = () => {
  hasError.value = false
  errorMessage.value = ''
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
  text-align: center;
  max-width: 400px;
}

.error-icon {
  color: var(--color-error);
  margin-bottom: var(--spacing-4);
}

.error-message {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-4);
}

.retry-button {
  padding: var(--spacing-2) var(--spacing-4);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: var(--font-medium);
}

.retry-button:hover {
  opacity: 0.9;
}
</style>
