<template>
  <div class="async-loader">
    <LoadingSpinner size="md" :text="text" />
  </div>
</template>

<script setup lang="ts">
import LoadingSpinner from './LoadingSpinner.vue'

interface Props {
  text?: string
}

withDefaults(defineProps<Props>(), {
  text: 'Loading...',
})
</script>

<style scoped>
.async-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
  width: 100%;
  height: 100%;
  min-height: 200px;
}
</style>
