<template>
  <img
    v-if="shouldRenderImage"
    v-bind="attrs"
    :src="resolvedSrc"
    :srcset="resolvedSrcset"
    :sizes="resolvedSizes"
    :alt="alt"
    :loading="loading"
    :decoding="decoding"
    :fetchpriority="fetchPriority"
    @error="handleImageError"
  />
  <slot v-else name="fallback" />
</template>

<script setup lang="ts">
defineOptions({
  name: 'ThumbnailImage',
  inheritAttrs: false,
})

import { computed, ref, useAttrs, watch } from 'vue'
import type { MediaThumbnailSize } from '@/utils/mediaOptimizer'
import { resolveThumbnailSrc, resolveThumbnailSrcset } from '@/utils/thumbnailPresentation'

interface Props {
  src?: string | null | undefined
  alt?: string
  size?: MediaThumbnailSize
  responsive?: boolean
  sizes?: string
  loading?: 'lazy' | 'eager'
  decoding?: 'async' | 'sync' | 'auto'
  fetchPriority?: 'high' | 'low' | 'auto'
}

const props = withDefaults(defineProps<Props>(), {
  src: null,
  alt: '',
  size: 'original',
  responsive: false,
  loading: 'lazy',
  decoding: 'async',
  fetchPriority: 'auto',
})

const attrs = useAttrs()
const failedSrc = ref<string | null>(null)

const resolvedSrc = computed(() => resolveThumbnailSrc(props.src, props.size))
const resolvedSrcset = computed(() => {
  if (!props.responsive || failedSrc.value) return undefined
  // Don't emit a srcset when the resolved source is already the original/high-quality
  // render, because the browser could then choose a smaller derivative from the set.
  if (resolvedSrc.value && /\/stream\b|size=original/i.test(resolvedSrc.value)) return undefined
  return resolveThumbnailSrcset(props.src)
})
const resolvedSizes = computed(() => (props.responsive ? props.sizes || undefined : undefined))
const shouldRenderImage = computed(() =>
  Boolean(resolvedSrc.value && resolvedSrc.value !== failedSrc.value)
)

watch(resolvedSrc, (nextSrc) => {
  if (nextSrc !== failedSrc.value) {
    failedSrc.value = null
  }
})

function handleImageError() {
  failedSrc.value = resolvedSrc.value ?? null
}
</script>
