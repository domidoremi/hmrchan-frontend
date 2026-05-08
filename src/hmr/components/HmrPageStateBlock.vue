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
    <div v-else>
      <p class="hmr-kicker">{{ eyebrowCopy }}</p>
      <strong>{{ titleCopy }}</strong>
      <span v-if="bodyCopy">{{ bodyCopy }}</span>
    </div>
    <button
      v-if="!loading && canRetry"
      class="hmr-status-button"
      type="button"
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
    loadingTag?: string
    emptyTag?: string
    errorTag?: string
  }>(),
  {
    loading: false,
    empty: false,
    error: null,
    title: '',
    body: '',
    loadingTitle: '',
    loadingBody: '',
    emptyTitle: '暂时没有内容。',
    emptyBody: '',
    errorTitle: '刷新失败。',
    errorBody: '稍后再试。',
    retryLabel: '重新加载',
    showWhenReady: false,
    showRetry: true,
    loadingTag: '',
    emptyTag: '暂无内容',
    errorTag: '需要重试',
  }
)

const emit = defineEmits<{
  retry: []
}>()

const isVisible = computed(
  () => props.showWhenReady || props.loading || props.empty || Boolean(props.error)
)

const canRetry = computed(() => props.showRetry && (props.empty || Boolean(props.error)))

const eyebrowCopy = computed(() => {
  if (props.loading) return props.loadingTag
  if (props.error) return props.errorTag
  if (props.empty) return props.emptyTag
  return '页面状态'
})

const titleCopy = computed(() => {
  if (props.title) return props.title
  if (props.loading) return props.loadingTitle
  if (props.error) return errorTitle.value
  if (props.empty) return props.emptyTitle
  return '内容已准备好。'
})

const bodyCopy = computed(() => {
  if (props.body) return props.body
  if (props.loading) return props.loadingBody
  if (props.error) return errorBody.value
  if (props.empty) return props.emptyBody
  return '你可以继续浏览当前页面。'
})

const errorTitle = computed(() => {
  if (props.error?.kind === 'unauthorized') return '需要登录。'
  if (props.error?.kind === 'not-found') return '内容不存在或已下架。'
  if (props.error?.kind === 'rate-limited') return '操作太频繁。'
  if (props.error?.kind === 'refresh-needed') return '页面需要刷新。'
  return props.errorTitle
})

const errorBody = computed(() => {
  if (props.error?.kind === 'unauthorized') return '登录后可以查看完整内容和个人状态。'
  if (props.error?.kind === 'not-found') return '你可以返回上一页，或从探索页重新打开内容。'
  if (props.error?.kind === 'rate-limited') return '请稍等片刻，再重新加载。'
  if (props.error?.kind === 'refresh-needed') return '请刷新页面，重新载入最新体验。'
  return props.errorBody
})
</script>
