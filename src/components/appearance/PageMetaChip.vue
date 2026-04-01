<template>
  <component :is="tag" class="page-meta-chip" :class="{ 'page-meta-chip--accent': accent }">
    <slot />
  </component>
</template>

<script setup lang="ts">
interface Props {
  tag?: string
  accent?: boolean
}

withDefaults(defineProps<Props>(), {
  tag: 'span',
  accent: false,
})
</script>
