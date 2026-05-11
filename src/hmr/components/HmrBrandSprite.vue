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

type HmrBrandSpriteAnimation = {
  row: number
  frames: number
  frameMs: number
}

const animations: Record<HmrBrandSpriteState, HmrBrandSpriteAnimation> = {
  idle: { row: 0, frames: 6, frameMs: 360 },
  waving: { row: 3, frames: 4, frameMs: 150 },
  jumping: { row: 4, frames: 5, frameMs: 125 },
  review: { row: 8, frames: 6, frameMs: 320 },
}

const props = withDefaults(
  defineProps<{
    state?: HmrBrandSpriteState
    staticMode?: boolean
  }>(),
  {
    state: 'idle',
    staticMode: false,
  }
)

const frame = ref(0)
let frameTimer: number | undefined

const activeAnimation = computed(() => animations[props.state])
const spriteStyle = computed(() => ({
  '--hmr-brand-sprite-frame': String(frame.value),
  '--hmr-brand-sprite-row': String(activeAnimation.value.row),
}))

function stopFrames(): void {
  if (frameTimer === undefined) return
  window.clearInterval(frameTimer)
  frameTimer = undefined
}

function startFrames(): void {
  stopFrames()
  frame.value = 0
  if (props.staticMode) return

  const animation = activeAnimation.value
  frameTimer = window.setInterval(() => {
    frame.value = (frame.value + 1) % animation.frames
  }, animation.frameMs)
}

watch(() => [props.state, props.staticMode] as const, startFrames, { immediate: true })

onBeforeUnmount(() => {
  stopFrames()
})
</script>
