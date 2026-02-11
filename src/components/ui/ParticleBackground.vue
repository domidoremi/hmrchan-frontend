<template>
  <canvas v-show="isActive" ref="canvasRef" class="particle-bg" aria-hidden="true" />
</template>

<script setup lang="ts">
/**
 * ParticleBackground - 全局粒子背景组件
 *
 * 使用 Canvas + requestAnimationFrame 渲染粒子效果。
 * 自动响应用户设置和系统偏好。
 */

import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@/stores'
import { useParticleEngine } from '@/composables/useParticleEngine'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const canvasRef = ref<HTMLCanvasElement | null>(null)

const effectConfig = computed(() => settings.value.backgroundEffect)
const animationIntensity = computed(() => settings.value.animationIntensity)

const isActive = computed(() => {
  return effectConfig.value.type !== 'none' && animationIntensity.value !== 'none'
})

const engine = useParticleEngine({
  canvas: canvasRef,
  config: effectConfig,
  animationIntensity,
})

onMounted(() => {
  engine.mount()
})

onBeforeUnmount(() => {
  engine.dispose()
})
</script>

<style scoped>
.particle-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  width: 100vw;
  height: 100svh;
  height: 100dvh;
  pointer-events: none;
  contain: strict;
  /* GPU 合成层 */
  will-change: contents;
  transform: translate3d(0, 0, 0);
}

/* 减少动态效果时隐藏 */
@media (prefers-reduced-motion: reduce) {
  .particle-bg {
    display: none;
  }
}
</style>
