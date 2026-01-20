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
    }, 800)
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
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    rgba(255, 255, 255, 0.6) 100%
  );
  animation: ripple-out 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes ripple-out {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

.mask-fade-enter-active,
.mask-fade-leave-active {
  transition: opacity 0.3s ease;
}

.mask-fade-enter-from,
.mask-fade-leave-to {
  opacity: 0;
}
</style>
