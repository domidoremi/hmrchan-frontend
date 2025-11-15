<template>
  <div :class="['spinner-container', sizeClass]">
    <div class="spinner"></div>
    <p v-if="text" class="spinner-text">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
})

const sizeClass = computed(() => `spinner-${props.size}`)
</script>

<style scoped>
.spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
}

.spinner {
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-sm .spinner {
  width: 24px;
  height: 24px;
  border-width: 2px;
}

.spinner-md .spinner {
  width: 40px;
  height: 40px;
  border-width: 3px;
}

.spinner-lg .spinner {
  width: 60px;
  height: 60px;
  border-width: 4px;
}

.spinner-text {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
