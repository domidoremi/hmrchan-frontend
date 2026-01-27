<template>
  <canvas ref="canvasRef" class="rive-player" :class="{ 'rive-loaded': isLoaded }" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRive, type RiveOptions } from '@/composables/useRive'

interface Props {
  /** Rive 文件 URL */
  src: string
  /** State Machine 名称 */
  stateMachine?: string
  /** Artboard 名称 */
  artboard?: string
  /** 是否自动播放 */
  autoplay?: boolean
  /** 初始输入值 */
  inputs?: Record<string, boolean | number>
  /** 宽度 */
  width?: string | number
  /** 高度 */
  height?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  autoplay: true,
  inputs: () => ({}),
  width: '100%',
  height: '100%',
})

const emit = defineEmits<{
  load: []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

const options: RiveOptions = {
  src: props.src,
  stateMachine: props.stateMachine,
  artboard: props.artboard,
  autoplay: props.autoplay,
  inputs: props.inputs,
}

const { rive, isLoaded, isPlaying, setInput, fire, play, pause, reset, destroy } = useRive(
  canvasRef,
  options
)

// 监听加载完成
watch(isLoaded, (loaded) => {
  if (loaded) {
    emit('load')
  }
})

// 暴露方法给父组件
defineExpose({
  rive,
  isLoaded,
  isPlaying,
  setInput,
  fire,
  play,
  pause,
  reset,
  destroy,
})
</script>

<style scoped>
.rive-player {
  width: v-bind('typeof props.width === "number" ? props.width + "px" : props.width');
  height: v-bind('typeof props.height === "number" ? props.height + "px" : props.height');
  opacity: 0;
  transition: opacity 0.3s ease;
}

.rive-player.rive-loaded {
  opacity: 1;
}
</style>
