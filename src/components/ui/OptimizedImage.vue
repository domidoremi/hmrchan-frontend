<template>
  <picture>
    <source v-if="webpSrc" :srcset="webpSrc" type="image/webp" />
    <img
      :src="cachedSrc"
      :alt="alt"
      :loading="lazy ? 'lazy' : 'eager'"
      :decoding="async ? 'async' : 'auto'"
      :class="imgClass"
      @load="onLoad"
      @error="onError"
    />
  </picture>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { mediaCache } from '@/utils/mediaCache'

interface Props {
  src: string
  alt?: string
  lazy?: boolean
  async?: boolean
  webp?: boolean
  imgClass?: string
  useCache?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  lazy: true,
  async: true,
  webp: true,
  useCache: true,
})

const emit = defineEmits<{
  load: []
  error: [error: Event]
}>()

const cachedSrc = ref<string>(props.src)

// 自动生成 WebP 路径
const webpSrc = computed(() => {
  if (!props.webp || !props.src) return null

  // 如果已经是 WebP，直接返回
  if (props.src.endsWith('.webp')) return null

  // 替换扩展名为 .webp
  return props.src.replace(/\.(jpg|jpeg|png)$/i, '.webp')
})

const onLoad = () => {
  emit('load')
}

const onError = (e: Event) => {
  emit('error', e)
}

// 预加载并缓存图片
onMounted(async () => {
  if (props.useCache && props.src) {
    try {
      const cached = await mediaCache.preload(props.src)
      cachedSrc.value = cached
    } catch (error) {
      console.warn('Failed to cache image:', props.src, error)
      // 失败时使用原始URL
      cachedSrc.value = props.src
    }
  }
})
</script>

<style scoped>
img {
  display: block;
  width: 100%;
  height: auto;
  max-width: 100%;
}
</style>
