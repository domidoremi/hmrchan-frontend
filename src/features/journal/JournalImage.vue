<template>
  <span class="journal-image" :class="{ 'image-failed': failed }" :style="{ '--image-fit': fit }">
    <img
      v-if="!failed"
      ref="imageRef"
      :key="src"
      :src="displaySrc"
      :alt="alt"
      :width="width"
      :height="height"
      :loading="loading"
      :fetchpriority="fetchpriority"
      @load="checkResolution"
      @error="handleError"
    />
    <span v-else class="image-fallback" role="img" :aria-label="alt"
      ><JournalIcon name="image" /><span>图片暂不可用</span></span
    >
  </span>
</template>
<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { createResizeObserver } from '@/utils/modernAPIs'
import JournalIcon from './JournalIcon.vue'
const props = withDefaults(
  defineProps<{
    src: string
    originalSrc?: string | null | undefined
    alt: string
    width?: string | number
    height?: string | number
    loading?: 'eager' | 'lazy'
    fetchpriority?: 'high' | 'low' | 'auto'
    fit?: 'cover' | 'contain'
    upgrade?: boolean
  }>(),
  { loading: 'lazy', fetchpriority: 'auto', fit: 'cover', upgrade: true }
)
const failed = ref(false)
const upgraded = ref(false)
const originalFailed = ref(false)
const thumbnailFailed = ref(false)
const imageRef = useTemplateRef<HTMLImageElement>('imageRef')
const displaySrc = computed(() =>
  upgraded.value && props.originalSrc ? props.originalSrc : props.src
)
let observer: ResizeObserver | undefined

function checkResolution() {
  const img = imageRef.value
  if (
    !props.upgrade ||
    !img?.complete ||
    !img.naturalWidth ||
    upgraded.value ||
    originalFailed.value ||
    !props.originalSrc ||
    props.originalSrc === props.src
  )
    return
  const widthScale = img.clientWidth / img.naturalWidth
  const heightScale = img.clientHeight / img.naturalHeight
  const scale =
    props.fit === 'contain' ? Math.min(widthScale, heightScale) : Math.max(widthScale, heightScale)
  if (scale * (window.devicePixelRatio || 1) > 1.05) upgraded.value = true
}
function handleError() {
  if (upgraded.value) {
    originalFailed.value = true
    upgraded.value = false
    failed.value = thumbnailFailed.value
  } else if (props.originalSrc && !originalFailed.value && props.originalSrc !== props.src) {
    thumbnailFailed.value = true
    upgraded.value = true
  } else {
    failed.value = true
  }
}
watch(
  () => [props.src, props.originalSrc],
  () => {
    failed.value = false
    upgraded.value = false
    originalFailed.value = false
    thumbnailFailed.value = false
  }
)
watch(() => props.upgrade, checkResolution, { flush: 'post' })
watch(imageRef, (image, previous) => {
  if (previous) observer?.unobserve(previous)
  if (image) observer?.observe(image)
})
onMounted(() => {
  if (typeof ResizeObserver !== 'undefined') {
    observer = createResizeObserver(checkResolution) ?? undefined
    if (imageRef.value) observer?.observe(imageRef.value)
  }
  window.addEventListener('resize', checkResolution)
  checkResolution()
})
onUnmounted(() => {
  observer?.disconnect()
  window.removeEventListener('resize', checkResolution)
})
</script>
