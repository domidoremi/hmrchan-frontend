<template>
  <component
    :is="tag"
    class="page-toolbar-shell"
    :class="{ 'page-toolbar-shell--balanced': balanced }"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
interface Props {
  tag?: string
  balanced?: boolean
}

withDefaults(defineProps<Props>(), {
  tag: 'div',
  balanced: true,
})
</script>
