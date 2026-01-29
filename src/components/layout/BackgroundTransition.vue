<script setup lang="ts">
import { ref, watch } from 'vue'
import { useContextualBackground } from '@/composables/useContextualBackground'

const { isTransitioning } = useContextualBackground()
const showMask = ref(false)

watch(isTransitioning, (transitioning) => {
  if (transitioning) {
    showMask.value = true
    setTimeout(() => {
      showMask.value = false
    }, 420)
  }
})
</script>

<template>
  <Transition name="mask-fade">
    <div v-if="showMask" class="transition-mask" />
  </Transition>
</template>

<style scoped>
.transition-mask {
  position: fixed;
  inset: 0;
  z-index: 9998;
  pointer-events: none;
  background: radial-gradient(
    circle at center,
    rgba(var(--color-primary-rgb), 0.08) 0%,
    rgba(var(--color-primary-rgb), 0.02) 55%,
    transparent 72%
  );
  opacity: 0;
  transform: translateZ(0);
  will-change: opacity;
}

.mask-fade-enter-active,
.mask-fade-leave-active {
  transition: opacity 0.22s ease-out;
}

.mask-fade-enter-from,
.mask-fade-leave-to {
  opacity: 0;
}

.mask-fade-enter-to,
.mask-fade-leave-from {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .mask-fade-enter-active,
  .mask-fade-leave-active {
    transition: none;
  }
}
</style>
