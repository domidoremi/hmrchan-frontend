<template>
  <aside
    v-if="isVisible"
    class="hmr-page-state-block"
    :class="{
      'is-loading': loading,
      'is-empty': empty && !error,
      'is-error': Boolean(error),
    }"
    aria-live="polite"
  >
    <div v-if="loading" class="hmr-page-state-skeleton" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <div v-else class="hmr-page-state-mark" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <button
      v-if="!loading && canRetry"
      class="hmr-status-button"
      type="button"
      :aria-label="retryLabel"
      @click="emit('retry')"
    >
      {{ retryLabel }}
    </button>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { HmrApiErrorState } from '@/hmr/types'

const props = withDefaults(
  defineProps<{
    loading?: boolean
    empty?: boolean
    error?: HmrApiErrorState | null
    title?: string
    body?: string
    loadingTitle?: string
    loadingBody?: string
    emptyTitle?: string
    emptyBody?: string
    errorTitle?: string
    errorBody?: string
    retryLabel?: string
    showWhenReady?: boolean
    showRetry?: boolean
  }>(),
  {
    loading: false,
    empty: false,
    error: null,
    title: '',
    body: '',
    loadingTitle: '',
    loadingBody: '',
    retryLabel: '重试',
    showWhenReady: false,
    showRetry: true,
  }
)

const emit = defineEmits<{
  retry: []
}>()

const isVisible = computed(
  () => props.showWhenReady || props.loading || props.empty || Boolean(props.error)
)

const canRetry = computed(() => props.showRetry && (props.empty || Boolean(props.error)))
</script>
