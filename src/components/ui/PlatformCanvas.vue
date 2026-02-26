<script setup lang="ts">
defineOptions({ name: 'PlatformCanvas' })

import { ref, computed, toRef } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlatformAnimation, type PlatformMorphState } from '@/composables/usePlatformAnimation'
import { useThemeStore, useSettingsStore } from '@/stores'

const { platform = 'all' } = defineProps<{
  platform?: PlatformMorphState
}>()

const canvasEl = ref<HTMLCanvasElement | null>(null)
const { isDark } = storeToRefs(useThemeStore())
const { settings } = storeToRefs(useSettingsStore())

const enabled = computed(() => settings.value.enableAnimations)
const intensityMap: Record<string, number> = {
  none: 0,
  reduced: 0.5,
  normal: 1,
  full: 1.2,
}
const intensity = computed(() => intensityMap[settings.value.animationIntensity] ?? 1)

usePlatformAnimation(
  canvasEl,
  toRef(() => platform),
  {
    isDark,
    enabled,
    intensity,
  }
)
</script>

<template>
  <canvas ref="canvasEl" class="platform-canvas" aria-hidden="true" />
</template>

<style scoped>
.platform-canvas {
  position: fixed;
  top: 0;
  right: 0;
  width: 50vw;
  height: 100vh;
  height: 100dvh;
  pointer-events: none;
  z-index: -1;
  opacity: 0.85;
}

@media (max-width: 1024px) {
  .platform-canvas {
    width: 60vw;
    opacity: 0.7;
  }
}

@media (max-width: 768px) {
  .platform-canvas {
    width: 120vw;
    top: 0;
    right: -30vw;
    height: 50dvh;
    opacity: 0.5;
  }
}

[data-theme='dark'] .platform-canvas {
  opacity: 0.7;
}

@media (max-width: 768px) {
  [data-theme='dark'] .platform-canvas {
    opacity: 0.4;
  }
}

@media (prefers-reduced-motion: reduce) {
  .platform-canvas {
    opacity: 0.4;
  }
}
</style>
