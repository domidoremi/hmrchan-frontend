<template>
  <picture class="optimized-image">
    <!-- WebP 格式（如果支持） -->
    <source
      v-if="webpSrcset && supportsWebP"
      :srcset="webpSrcset"
      :sizes="computedSizes"
      type="image/webp"
    />

    <!-- 原始格式 fallback with srcset -->
    <source v-if="responsive && originalSrcset" :srcset="originalSrcset" :sizes="computedSizes" />

    <!-- 主图片元素 -->
    <img
      ref="imgRef"
      :src="lazy && lazyLoad ? generatePlaceholder(cachedSrc) : currentSrc"
      :data-src="lazy && lazyLoad ? currentSrc : undefined"
      :data-srcset="lazy && lazyLoad && originalSrcset ? originalSrcset : undefined"
      :alt="alt"
      :width="width"
      :height="height"
      :loading="lazy && !lazyLoad ? 'lazy' : 'eager'"
      :decoding="async ? 'async' : 'auto'"
      :fetchpriority="fetchpriority"
      :class="imageClass"
      :style="imageStyle"
      @load="onLoad"
      @error="onError"
    />
  </picture>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { hybridCache } from '@/utils/hybridCache'
import {
  supportsWebP,
  generateSrcSet,
  generateSizes,
  generatePlaceholder,
  getOptimizedImageUrl,
} from '@/utils/imageOptimizer'
import { useImageLazyLoad } from '@/composables/useImageLazyLoad'

interface Props {
  src: string
  alt?: string
  lazy?: boolean
  async?: boolean
  webp?: boolean
  imgClass?: string
  useCache?: boolean
  // 新增：响应式图片支持
  responsive?: boolean
  sizes?: string
  widths?: number[]
  // 新增：渐进式加载（blur-up）
  placeholder?: boolean
  blurAmount?: number
  // 新增：尺寸和优先级
  width?: number
  height?: number
  fetchpriority?: 'high' | 'low' | 'auto'
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  // 新增：懒加载配置
  rootMargin?: string
  threshold?: number
  preload?: boolean
  preloadDistance?: number
}

const props = withDefaults(defineProps<Props>(), {
  lazy: true,
  async: true,
  webp: true,
  useCache: true,
  responsive: true,
  placeholder: true,
  blurAmount: 10,
  fetchpriority: 'auto',
  objectFit: 'cover',
  widths: () => [320, 640, 960, 1280, 1920],
  rootMargin: '50px',
  threshold: 0.01,
  preload: true,
  preloadDistance: 200,
})

const emit = defineEmits<{
  load: []
  error: [error: Event]
}>()

const imgRef = ref<HTMLImageElement | null>(null)
const cachedSrc = ref<string>(props.src)
const isLoaded = ref(false)
const hasError = ref(false)

// 使用懒加载 composable（仅在启用 lazy 时）
const lazyLoad = props.lazy
  ? useImageLazyLoad({
      rootMargin: props.rootMargin,
      threshold: props.threshold,
      preload: props.preload,
      preloadDistance: props.preloadDistance,
      priority: props.fetchpriority,
    })
  : null

// 如果使用懒加载，同步 elementRef
if (lazyLoad) {
  watch(imgRef, (newRef) => {
    if (newRef && lazyLoad.elementRef) {
      lazyLoad.elementRef.value = newRef
    }
  })

  // 监听懒加载状态
  watch(
    () => lazyLoad.isLoaded.value,
    (loaded) => {
      if (loaded) {
        isLoaded.value = true
      }
    },
  )

  watch(
    () => lazyLoad.error.value,
    (err) => {
      if (err) {
        hasError.value = true
      }
    },
  )
}

// 当前显示的图片源（支持渐进式加载）
const currentSrc = computed(() => {
  // 如果还在加载且启用占位符，显示低质量模糊图片
  if (!isLoaded.value && props.placeholder && !hasError.value) {
    return generatePlaceholder(cachedSrc.value)
  }

  // 加载完成或出错，显示完整图片
  return getOptimizedImageUrl(cachedSrc.value, {
    width: props.width,
    quality: 80,
    format: 'auto',
  })
})

// 生成 WebP srcset
const webpSrcset = computed(() => {
  if (!props.webp || !props.responsive || !props.src) return null

  // 如果已经是 WebP，使用原始 srcset
  if (props.src.endsWith('.webp')) {
    return generateSrcSet(cachedSrc.value, props.widths)
  }

  // 生成 WebP 格式的 srcset
  const webpUrl = cachedSrc.value.replace(/\.(jpg|jpeg|png)$/i, '.webp')
  return generateSrcSet(webpUrl, props.widths)
})

// 生成原始格式 srcset
const originalSrcset = computed(() => {
  if (!props.responsive || !props.src) return null
  return generateSrcSet(cachedSrc.value, props.widths)
})

// 计算 sizes 属性
const computedSizes = computed(() => {
  if (props.sizes) return props.sizes

  return generateSizes({
    '(max-width: 640px)': '100vw',
    '(max-width: 1024px)': '50vw',
  })
})

// 图片类名
const imageClass = computed(() => [
  props.imgClass,
  {
    'img-loading': !isLoaded.value && !hasError.value && props.placeholder,
    'img-loaded': isLoaded.value,
    'img-error': hasError.value,
  },
])

// 图片样式
const imageStyle = computed(() => ({
  objectFit: props.objectFit,
  opacity: isLoaded.value ? 1 : props.placeholder ? 0.3 : 1,
  filter: !isLoaded.value && props.placeholder ? `blur(${props.blurAmount}px)` : 'none',
  transition: 'opacity 0.3s ease-in-out, filter 0.3s ease-in-out',
}))

const onLoad = () => {
  isLoaded.value = true
  emit('load')
}

const onError = (e: Event) => {
  hasError.value = true
  emit('error', e)
}

// 预加载并缓存图片（使用混合缓存）
onMounted(async () => {
  if (props.useCache && props.src) {
    try {
      const cached = await hybridCache.get(props.src)
      cachedSrc.value = cached
    } catch (error) {
      console.warn('Failed to cache image:', props.src, error)
      // 失败时使用原始URL
      cachedSrc.value = props.src
    }
  }

  // 高优先级图片预加载
  if (props.fetchpriority === 'high' && props.src) {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = currentSrc.value
    if (supportsWebP && props.webp) {
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
  width: 100%;
  height: auto;
  max-width: 100%;
}

.img-error {
  opacity: 0.5;
  filter: grayscale(100%);
}
</style>
