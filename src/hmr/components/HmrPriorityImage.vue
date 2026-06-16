<template>
  <img
    :src="src"
    :srcset="srcset"
    :sizes="sizes"
    :alt="alt"
    :loading="loading"
    decoding="async"
    :fetchpriority="fetchPriority"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    src: string
    srcset?: string
    sizes?: string
    alt: string
    loading?: 'eager' | 'lazy'
    fetchPriority?: 'high' | 'low' | 'auto'
  }>(),
  {
    loading: 'lazy',
    fetchPriority: 'auto',
  }
)
</script>
