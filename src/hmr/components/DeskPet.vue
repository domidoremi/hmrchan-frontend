<template>
  <div
    ref="petRef"
    class="hmr-desk-pet"
    :class="{
      'hmr-desk-pet--static': staticMode,
      'is-muted': muted,
    }"
    :style="spriteStyle"
    aria-hidden="true"
  ></div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

export type DeskPetState =
  | 'idle'
  | 'running-right'
  | 'running-left'
  | 'waving'
  | 'jumping'
  | 'failed'
  | 'waiting'
  | 'running'
  | 'review'

interface DeskPetAnimation {
  row: number
  frames: number
  frameMs: number
}

const animations: Record<DeskPetState, DeskPetAnimation> = {
  idle: { row: 0, frames: 6, frameMs: 360 },
  'running-right': { row: 1, frames: 8, frameMs: 120 },
  'running-left': { row: 2, frames: 8, frameMs: 120 },
  waving: { row: 3, frames: 4, frameMs: 160 },
  jumping: { row: 4, frames: 5, frameMs: 130 },
  failed: { row: 5, frames: 8, frameMs: 150 },
  waiting: { row: 6, frames: 6, frameMs: 360 },
  running: { row: 7, frames: 6, frameMs: 140 },
  review: { row: 8, frames: 6, frameMs: 320 },
}

const props = withDefaults(
  defineProps<{
    state?: DeskPetState
    staticMode?: boolean
    muted?: boolean
  }>(),
  {
    state: 'idle',
    staticMode: false,
    muted: false,
  }
)

const frame = ref(0)
const petRef = ref<HTMLElement | null>(null)
let frameTimer: number | undefined

const activeAnimation = computed(() => animations[props.state])
const spriteStyle = computed(() => ({
  '--hmr-desk-pet-frame': String(frame.value),
  '--hmr-desk-pet-row': String(activeAnimation.value.row),
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

<style scoped>
.hmr-desk-pet {
  inline-size: clamp(4.5rem, 8vw, 6.5rem);
  aspect-ratio: 12 / 13;
  background-image: url('/hmrchan/pets/tidyfox/spritesheet.webp');
  background-position: calc(var(--hmr-desk-pet-frame) * 100% / 7)
    calc(var(--hmr-desk-pet-row) * 100% / 8);
  background-repeat: no-repeat;
  background-size: 800% 900%;
  image-rendering: auto;
  opacity: 0.98;
  transform: translateZ(0);
  will-change: background-position, transform, opacity;
}

.hmr-desk-pet--static {
  will-change: auto;
}

.hmr-desk-pet.is-muted {
  opacity: 0.88;
}
</style>
