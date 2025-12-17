<template>
  <div
    class="progressive-image"
    :style="containerStyle"
  >
    <!-- 模糊缩略图占位 -->
    <img
      v-if="placeholderSrc && !isFullLoaded"
      class="progressive-image__placeholder"
      :src="placeholderSrc"
      :alt="alt"
      aria-hidden="true"
    />

    <!-- 原图 -->
    <img
      ref="fullImageRef"
      class="progressive-image__full"
      :class="{ 'is-loaded': isFullLoaded }"
      :src="src"
      :alt="alt"
      @load="onFullLoad"
      @error="onFullError"
    />

    <!-- 加载指示器 -->
    <div v-if="!isFullLoaded && showSpinner" class="progressive-image__loader">
      <span class="spinner spinner-sm" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

export interface ProgressiveImageProps {
  src: string
  placeholderSrc?: string
  alt?: string
  aspectRatio?: number | null
  objectFit?: 'cover' | 'contain'
  showSpinner?: boolean
  maxHeight?: string
}

const props = withDefaults(defineProps<ProgressiveImageProps>(), {
  alt: '',
  aspectRatio: null,
  objectFit: 'cover',
  showSpinner: true,
})

const emit = defineEmits<{
  load: []
  error: [error: Error]
}>()

const fullImageRef = ref<HTMLImageElement | null>(null)
const isFullLoaded = ref(false)
const hasError = ref(false)

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

function onFullLoad() {
  isFullLoaded.value = true
  emit('load')
}

function onFullError() {
  hasError.value = true
  emit('error', new Error(`Failed to load image: ${props.src}`))
}

// 当 src 变化时重置状态
watch(() => props.src, () => {
  isFullLoaded.value = false
  hasError.value = false
})

// 检查图片是否已经在缓存中
onMounted(() => {
  if (fullImageRef.value?.complete && fullImageRef.value?.naturalWidth > 0) {
    isFullLoaded.value = true
  }
})
</script>

<style scoped>
.progressive-image {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: var(--glass-bg-light);
}

/* 有宽高比时使用 padding-top 技巧 */
.progressive-image[style*="--aspect-ratio"] {
  aspect-ratio: var(--aspect-ratio);
}

/* 限制最大高度 */
.progressive-image[style*="--max-height"] {
  max-height: var(--max-height);
}

.progressive-image__placeholder {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: var(--object-fit, cover);
  filter: blur(10px);
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

.progressive-image__loader {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.1);
}
</style>
