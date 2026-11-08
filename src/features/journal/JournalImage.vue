<template>
  <span class="journal-image" :class="{ 'image-failed': failed }" :style="{ '--image-fit': fit }">
    <img
      v-if="!failed"
      :key="src"
      :src="src"
      :alt="alt"
      :width="width"
      :height="height"
      :loading="loading"
      :fetchpriority="fetchpriority"
      @error="failed = true"
    />
    <span v-else class="image-fallback" role="img" :aria-label="alt"
      ><JournalIcon name="image" /><span>图片暂不可用</span></span
    >
  </span>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import JournalIcon from './JournalIcon.vue'
const props = withDefaults(
  defineProps<{
    src: string
    alt: string
    width?: string | number
    height?: string | number
    loading?: 'eager' | 'lazy'
    fetchpriority?: 'high' | 'low' | 'auto'
    fit?: 'cover' | 'contain'
  }>(),
  { loading: 'lazy', fetchpriority: 'auto', fit: 'cover' }
)
const failed = ref(false)
watch(
  () => props.src,
  () => {
    failed.value = false
  }
)
</script>
