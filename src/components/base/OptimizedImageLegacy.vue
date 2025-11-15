<template>
  <picture class="optimized-image">
    <!-- WebP 格式（如果支持） -->
    <source
      v-if="supportsWebP && webpSrc"
      :srcset="webpSrc"
      :sizes="computedSizes"
      type="image/webp"
    />

    <!-- 原始格式 fallback -->
    <img
      ref="imgRef"
      :src="currentSrc"
      :alt="alt"
      :width="width"
      :height="height"
      :loading="loading"
      :fetchpriority="fetchpriority"
      :class="imageClass"
      :style="imageStyle"
      @load="handleLoad"
      @error="handleError"
    />
  </picture>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  getOptimizedImageUrl,
  generateSrcSet,
  generateSizes,
  generatePlaceholder,
  supportsWebP,
} from '@/utils/imageOptimizer'

interface Props {
  src: string
  alt: string
  width?: number
  height?: number
  loading?: 'lazy' | 'eager'
  fetchpriority?: 'high' | 'low' | 'auto'
  responsive?: boolean
  sizes?: string
  placeholder?: boolean
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
}

const props = withDefaults(defineProps<Props>(), {
  loading: 'lazy',
  fetchpriority: 'auto',
  responsive: true,
  placeholder: true,
  objectFit: 'cover',
})

const emit = defineEmits<{
  load: []
  error: [error: Error]
}>()

const imgRef = ref<HTMLImageElement | null>(null)
const isLoaded = ref(false)
const hasError = ref(false)

// 当前显示的图片源
const currentSrc = computed(() => {
  // 如果还在加载且启用占位符，显示低质量图片
  if (!isLoaded.value && props.placeholder && !hasError.value) {
    return generatePlaceholder(props.src)
  }

  // 加载完成或出错，显示完整图片
  return getOptimizedImageUrl(props.src, {
    width: props.width,
    quality: 80,
    format: 'auto',
  })
})

// WebP 源
const webpSrc = computed(() => {
  if (!props.responsive || !supportsWebP) return ''

  return generateSrcSet(props.src, [320, 640, 960, 1280, 1920])
})

// sizes 属性
const computedSizes = computed(() => {
  if (props.sizes) return props.sizes

  return generateSizes({
    '(max-width: 640px)': '100vw',
    '(max-width: 1024px)': '50vw',
  })
})

// 图片类名
const imageClass = computed(() => ({
  'img-loading': !isLoaded.value && !hasError.value,
  'img-loaded': isLoaded.value,
  'img-error': hasError.value,
}))

// 图片样式
const imageStyle = computed(() => ({
  objectFit: props.objectFit,
  opacity: isLoaded.value ? 1 : 0.3,
  transition: 'opacity 0.3s ease-in-out',
}))

// 图片加载完成
const handleLoad = () => {
  isLoaded.value = true
  emit('load')
}

// 图片加载失败
const handleError = () => {
  hasError.value = true
  emit('error', new Error(`Failed to load image: ${props.src}`))
}

// 组件挂载时预加载（如果是高优先级）
onMounted(() => {
  if (props.fetchpriority === 'high' && props.src) {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = currentSrc.value
    if (supportsWebP) {
      link.type = 'image/webp'
    }
    document.head.appendChild(link)
  }
})
</script>

<style scoped>
.optimized-image {
  display: inline-block;
  overflow: hidden;
}

.optimized-image img {
  display: block;
  max-width: 100%;
  height: auto;
}

.img-loading {
  filter: blur(10px);
}

.img-error {
  opacity: 0.5;
  filter: grayscale(100%);
}
</style>
