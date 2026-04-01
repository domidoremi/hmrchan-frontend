<template>
  <component :is="tag" class="page-meta-row">
    <slot />
  </component>
</template>

<script setup lang="ts">
interface Props {
  tag?: string
}

withDefaults(defineProps<Props>(), {
  tag: 'div',
})
</script>
