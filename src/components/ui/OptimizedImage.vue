<template>
  <picture>
    <source v-if="webpSrc" :srcset="webpSrc" type="image/webp" />
    <img
      :src="src"
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
import { computed } from 'vue'

interface Props {
  src: string
  alt?: string
  lazy?: boolean
  async?: boolean
  webp?: boolean
  imgClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  lazy: true,
  async: true,
  webp: true,
})

const emit = defineEmits<{
  load: []
  error: [error: Event]
}>()

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
</script>

<style scoped>
img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
