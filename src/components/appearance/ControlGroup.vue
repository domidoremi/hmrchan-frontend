<template>
  <component
    :is="tag"
    class="page-control-group-shell"
    :class="{ 'page-control-group-shell--justify-end': justify === 'end' }"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
interface Props {
  tag?: string
  justify?: 'start' | 'end'
}

withDefaults(defineProps<Props>(), {
  tag: 'div',
  justify: 'start',
})
</script>
