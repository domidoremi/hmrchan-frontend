<template>
  <div class="progressive-image" :style="containerStyle">
    <img
      v-if="placeholderSrc && !isFullLoaded"
      class="progressive-image__placeholder"
      :src="placeholderSrc"
      :alt="alt"
      aria-hidden="true"
    />

    <img
      ref="fullImageRef"
      class="progressive-image__full"
      :class="{ 'is-loaded': isFullLoaded, 'is-error': hasError }"
      :src="resolvedSrc"
      :alt="alt"
      :loading="loadingStrategy"
      :decoding="decoding"
      :fetchpriority="fetchPriority"
      @load="onFullLoad"
      @error="onFullError"
    />

    <div v-if="!isFullLoaded && showSpinner && !hasError" class="progressive-image__loader">
      <span class="spinner spinner-sm" />
    </div>

    <div v-if="hasError" class="progressive-image__error empty-surface">
      <AnimatedIcon name="sparkle" :fallback-icon="AlertTriangle" size="sm" />
      <span>{{ errorLabel }}</span>
      <button type="button" class="retry-btn" @click="retry">
        <AnimatedIcon name="loading" :fallback-icon="RefreshCw" size="sm" />
        {{ $t('common.retry') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, RefreshCw } from 'lucide-vue-next'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import { warmDecodedImage } from '@/utils/performance'

export interface ProgressiveImageProps {
  src: string
  placeholderSrc?: string
  alt?: string
  aspectRatio?: number | null
  objectFit?: 'cover' | 'contain'
  showSpinner?: boolean
  maxHeight?: string
  loading?: 'lazy' | 'eager'
  decoding?: 'async' | 'sync' | 'auto'
  errorLabel?: string
  priority?: boolean
}

const props = withDefaults(defineProps<ProgressiveImageProps>(), {
  alt: '',
  aspectRatio: null,
  objectFit: 'cover',
  showSpinner: true,
  loading: 'lazy',
  decoding: 'async',
  errorLabel: '',
  priority: false,
})

const emit = defineEmits<{
  load: []
  error: [error: Error]
}>()

const { t } = useI18n()

const fullImageRef = useTemplateRef<HTMLImageElement>('fullImageRef')
const isFullLoaded = ref(false)
const hasError = ref(false)
const reloadToken = ref(0)
const resolvedSrc = computed(() =>
  reloadToken.value > 0
    ? `${props.src}${props.src.includes('?') ? '&' : '?'}retry=${reloadToken.value}`
    : props.src
)

const containerStyle = computed(() => {
  const style: Record<string, string> = {}

  if (props.aspectRatio) {
    style['--aspect-ratio'] = String(props.aspectRatio)
  }

  if (props.maxHeight) {
    style['--max-height'] = props.maxHeight
  }

  style['--object-fit'] = props.objectFit

  return style
})

const loadingStrategy = computed(() => props.loading)
const decoding = computed(() => props.decoding)
const errorLabel = computed(() => props.errorLabel || t('common.imageLoadFailed'))
const fetchPriority = computed(() => (props.priority ? 'high' : 'auto'))

function onFullLoad() {
  isFullLoaded.value = true
  emit('load')
}

function onFullError() {
  hasError.value = true
  emit('error', new Error(`Failed to load image: ${resolvedSrc.value}`))
}

watch(
  () => props.src,
  () => {
    reloadToken.value = 0
  }
)

watch(resolvedSrc, (nextSrc) => {
  isFullLoaded.value = false
  hasError.value = false
  if (nextSrc) {
    void warmDecodedImage(nextSrc)
  }
})

// 检查图片是否已经在缓存中
onMounted(() => {
  if (fullImageRef.value?.complete && fullImageRef.value?.naturalWidth > 0) {
    isFullLoaded.value = true
    return
  }

  if (resolvedSrc.value) {
    void warmDecodedImage(resolvedSrc.value)
  }
})

function retry() {
  hasError.value = false
  isFullLoaded.value = false
  reloadToken.value += 1
}
</script>

<style scoped>
.progressive-image {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: var(--glass-bg-light);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(var(--color-border-rgb), 0.6);
}

/* 有宽高比时使用 padding-top 技巧 */
.progressive-image[style*='--aspect-ratio'] {
  aspect-ratio: var(--aspect-ratio);
}

/* 限制最大高度 */
.progressive-image[style*='--max-height'] {
  max-height: var(--max-height);
}

.progressive-image__placeholder {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: var(--object-fit, cover);
  filter: blur(0.625rem);
  transform: scale(1.05);
  opacity: 1;
  transition: opacity 0.3s ease;
}

.progressive-image__full {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: var(--object-fit, cover);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.progressive-image__full.is-loaded {
  opacity: 1;
}

.progressive-image__full.is-error {
  opacity: 0.15;
}

.progressive-image__loader {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.2);
  backdrop-filter: blur(0.375rem);
}

.progressive-image__error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  background: rgba(var(--color-surface-rgb), 0.6);
  backdrop-filter: blur(0.375rem);
  border-radius: inherit;
}

.progressive-image__error.empty-surface {
  animation: none;
}

.retry-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-full);
  border: 1px solid rgba(var(--color-border-rgb), 0.8);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.retry-btn:hover {
  background: var(--color-muted);
  color: var(--color-text-primary);
}
</style>
