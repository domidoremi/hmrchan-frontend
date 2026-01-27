<template>
  <div ref="containerRef" class="lottie-player" :class="{ 'lottie-loaded': isLoaded }" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useLottie, type LottieOptions } from '@/composables/useLottie'

interface Props {
  /** Lottie JSON 动画数据 */
  animationData?: object
  /** 远程动画 URL */
  path?: string
  /** 是否循环 */
  loop?: boolean
  /** 是否自动播放 */
  autoplay?: boolean
  /** 播放速度 */
  speed?: number
  /** 渲染器 */
  renderer?: 'svg' | 'canvas' | 'html'
  /** 播放方向 */
  direction?: 1 | -1
  /** 宽度 */
  width?: string | number
  /** 高度 */
  height?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  loop: true,
  autoplay: true,
  speed: 1,
  renderer: 'svg',
  direction: 1,
  width: '100%',
  height: '100%',
})

const emit = defineEmits<{
  load: []
  complete: []
  loopComplete: []
  enterFrame: [frame: number]
}>()

const containerRef = ref<HTMLElement | null>(null)

const options: LottieOptions = {
  animationData: props.animationData,
  path: props.path,
  loop: props.loop,
  autoplay: props.autoplay,
  speed: props.speed,
  renderer: props.renderer,
  direction: props.direction,
}

const {
  play,
  pause,
  stop,
  goToAndPlay,
  goToAndStop,
  setDirection,
  setSpeed,
  isLoaded,
  isPlaying,
  currentFrame,
  totalFrames,
} = useLottie(containerRef, options)

// 监听加载完成
watch(isLoaded, (loaded) => {
  if (loaded) {
    emit('load')
  }
})

// 暴露方法给父组件
defineExpose({
  play,
  pause,
  stop,
  goToAndPlay,
  goToAndStop,
  setDirection,
  setSpeed,
  isLoaded,
  isPlaying,
  currentFrame,
  totalFrames,
})
</script>

<style scoped>
.lottie-player {
  display: flex;
  align-items: center;
  justify-content: center;
  width: v-bind('typeof props.width === "number" ? props.width + "px" : props.width');
  height: v-bind('typeof props.height === "number" ? props.height + "px" : props.height');
  opacity: 0;
  transition: opacity 0.3s ease;
}

.lottie-player.lottie-loaded {
  opacity: 1;
}

.lottie-player :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
