<template>
  <span
    class="hmr-brand-sprite"
    :class="{ 'hmr-brand-sprite--static': staticMode }"
    :style="spriteStyle"
    aria-hidden="true"
  ></span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

export type HmrBrandSpriteState = 'idle' | 'waving' | 'jumping' | 'review'
export type HmrBrandSpritePlayback = 'brand' | 'preloader'

type HmrBrandSpriteAnimation = {
  row: number
  frames: number
  fps: number
}

const animations: Record<HmrBrandSpriteState, HmrBrandSpriteAnimation> = {
  idle: { row: 0, frames: 6, fps: 8 },
  waving: { row: 3, frames: 4, fps: 14 },
  jumping: { row: 4, frames: 5, fps: 14 },
  review: { row: 8, frames: 6, fps: 9 },
}

const props = withDefaults(
  defineProps<{
    state?: HmrBrandSpriteState
    staticMode?: boolean
    playback?: HmrBrandSpritePlayback
  }>(),
  {
    state: 'idle',
    staticMode: false,
    playback: 'brand',
  }
)

const frame = ref(0)
let animationFrame: number | undefined
let lastFrameTime = 0

const activeAnimation = computed(() => animations[props.state])
const frameDuration = computed(() => {
  const playbackScale = props.playback === 'preloader' ? 1.25 : 1
  return 1000 / (activeAnimation.value.fps * playbackScale)
})
const spriteStyle = computed(() => ({
  '--hmr-brand-sprite-frame': String(frame.value),
  '--hmr-brand-sprite-row': String(activeAnimation.value.row),
}))

function stopFrames(): void {
  if (animationFrame === undefined) return
  window.cancelAnimationFrame(animationFrame)
  animationFrame = undefined
}

function tickFrame(now: number): void {
  const animation = activeAnimation.value
  if (now - lastFrameTime >= frameDuration.value) {
    frame.value = (frame.value + 1) % animation.frames
    lastFrameTime = now
  }
  animationFrame = window.requestAnimationFrame(tickFrame)
}

function startFrames(): void {
  stopFrames()
  frame.value = 0
  lastFrameTime = 0
  if (props.staticMode) return

  animationFrame = window.requestAnimationFrame((now) => {
    lastFrameTime = now
    animationFrame = window.requestAnimationFrame(tickFrame)
  })
}

watch(() => [props.state, props.staticMode, props.playback] as const, startFrames, {
  immediate: true,
})

onBeforeUnmount(() => {
  stopFrames()
})
</script>
