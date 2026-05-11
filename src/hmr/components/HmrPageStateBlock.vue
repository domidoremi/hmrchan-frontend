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
    <div class="hmr-page-state-body">
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
      <div class="hmr-page-state-copy">
        <strong>{{ titleText }}</strong>
        <span>{{ bodyText }}</span>
      </div>
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

const titleText = computed(() => {
  if (props.loading) return props.loadingTitle || props.title || '内容加载中'
  if (props.error) return props.errorTitle || props.title || '内容暂时不可用'
  if (props.empty) return props.emptyTitle || props.title || '暂无内容'
  return props.title || ''
})

const bodyText = computed(() => {
  if (props.loading) return props.loadingBody || props.body || '我们正在拉取最新公开内容。'
  if (props.error) return props.errorBody || props.error.message || props.body || '稍后重试。'
  if (props.empty) return props.emptyBody || props.body || '当前没有可显示的内容。'
  return props.body || ''
})
</script>
