<template>
  <div class="api-unavailable-notice glass-card">
    <div class="notice-icon">
      <ServerOff :size="48" />
    </div>
    <h2>{{ $t('error.apiUnavailable') }}</h2>
    <p class="notice-description">
      {{ $t('error.apiUnavailableDesc') }}
    </p>
    <div class="notice-details">
      <p><strong>API URL:</strong> {{ apiUrl }}</p>
      <p><strong>Status:</strong> <span class="status-offline">Offline</span></p>
    </div>
    <div class="notice-actions">
      <GlassButton @click="retry" variant="primary">
        <RefreshCw :size="16" />
        {{ $t('common.retry') }}
      </GlassButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ServerOff, RefreshCw } from 'lucide-vue-next'
import GlassButton from './GlassButton.vue'
import { getApiEndpoint } from '@/utils/url'

const apiUrl = getApiEndpoint()

const emit = defineEmits<{
  retry: []
}>()

const retry = () => {
  emit('retry')
}
</script>

<style scoped>
.api-unavailable-notice {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  text-align: center;
}

.notice-icon {
  margin-bottom: 1.5rem;
  color: var(--color-warning);
  display: flex;
  justify-content: center;
}

.api-unavailable-notice h2 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--color-text);
}

.notice-description {
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.notice-details {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  text-align: left;
}

.notice-details p {
  margin: 0.5rem 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  font-family: monospace;
}

.status-offline {
  color: var(--color-error);
  font-weight: 600;
}

.notice-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}
</style>
