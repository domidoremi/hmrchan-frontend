<template>
  <span
    class="hmr-brand-sprite"
    :class="spriteClasses"
    :style="spriteStyle"
    aria-hidden="true"
  ></span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { cancelIdleTask, runWhenIdle, type IdleTaskHandle } from '@/utils/performance'

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
const atlasReady = ref(false)
let animationFrame: number | undefined
let atlasWarmup: IdleTaskHandle | undefined
let lastFrameTime = 0

const activeAnimation = computed(() => animations[props.state])
const shouldAnimateFrames = computed(
  () => !props.staticMode && props.state !== 'idle' && activeAnimation.value.frames > 1
)
const usesAtlas = computed(() => atlasReady.value || shouldAnimateFrames.value)
const frameDuration = computed(() => {
  const playbackScale = props.playback === 'preloader' ? 1.25 : 1
  return 1000 / (activeAnimation.value.fps * playbackScale)
})
const spriteClasses = computed(() => ({
  'hmr-brand-sprite--animated': shouldAnimateFrames.value,
  'hmr-brand-sprite--atlas': usesAtlas.value,
  'hmr-brand-sprite--static': props.staticMode,
}))
const spriteStyle = computed(() => ({
  '--hmr-brand-sprite-frame': String(frame.value),
  '--hmr-brand-sprite-row': String(activeAnimation.value.row),
}))

function clearAtlasWarmup(): void {
  if (!atlasWarmup || typeof window === 'undefined') return
  cancelIdleTask(atlasWarmup)
  atlasWarmup = undefined
}

function stopFrames(): void {
  if (animationFrame === undefined || typeof window === 'undefined') return
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
  if (!shouldAnimateFrames.value || typeof window === 'undefined') return

  atlasReady.value = true
  animationFrame = window.requestAnimationFrame((now) => {
    lastFrameTime = now
    animationFrame = window.requestAnimationFrame(tickFrame)
  })
}

function scheduleAtlasWarmup(): void {
  clearAtlasWarmup()
  if (props.staticMode || props.playback !== 'brand' || atlasReady.value) return
  if (typeof window === 'undefined') return
  if (shouldAnimateFrames.value) {
    atlasReady.value = true
    return
  }

  atlasWarmup = runWhenIdle(
    () => {
      atlasReady.value = true
      atlasWarmup = undefined
    },
    { timeout: 3000, fallbackDelay: 1800 }
  )
}

watch(
  () => [props.state, props.staticMode, props.playback] as const,
  () => {
    scheduleAtlasWarmup()
    startFrames()
  },
  {
    immediate: true,
  }
)

onBeforeUnmount(() => {
  clearAtlasWarmup()
  stopFrames()
})
</script>
