<template>
  <span
    class="hmr-brand-sprite"
    :class="spriteClasses"
    :style="spriteStyle"
    :data-hmr-brand-state="activeAnimation.animation"
    :data-hmr-brand-requested-state="props.state"
    :data-hmr-brand-atlas="activeAnimation.atlas.id"
    aria-hidden="true"
  ></span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

export type HmrBrandSpriteState =
  | 'idle'
  | 'runningRight'
  | 'runningLeft'
  | 'running'
  | 'sendingPrompt'
  | 'review'
  | 'waving'
  | 'jumping'
  | 'failed'
  | 'waiting'
  | 'deepThinking'
  | 'retrieving'
  | 'contextCompressing'
  | 'flareScan'
  | 'toolWorking'
  | 'mcpWorking'
  | 'skillRunning'
  | 'attachmentReading'
  | 'webSearching'
  | 'modelTesting'
  | 'syncingModels'
  | 'providerIssue'
  | 'offlineWaiting'
  | 'warningRecover'
type HmrBrandSpriteAtlasId = 'core' | 'rag' | 'provider'

type HmrBrandSpriteAtlas = {
  id: HmrBrandSpriteAtlasId
  available: boolean
  fallbackAtlasId?: HmrBrandSpriteAtlasId
}

type HmrBrandSpriteAnimation = {
  atlasId: HmrBrandSpriteAtlasId
  row: number
  frames: number
  fps: number
  fallbackAnimation?: HmrBrandSpriteState
}

type ResolvedHmrBrandSpriteAnimation = {
  animation: HmrBrandSpriteState
  requestedAnimation: HmrBrandSpriteState
  atlas: HmrBrandSpriteAtlas
  row: HmrBrandSpriteAnimation
  usingFallback: boolean
}

const animations: Record<HmrBrandSpriteState, HmrBrandSpriteAnimation> = {
  idle: { atlasId: 'core', row: 0, frames: 6, fps: 5 },
  runningRight: { atlasId: 'core', row: 1, frames: 8, fps: 10 },
  runningLeft: { atlasId: 'core', row: 2, frames: 8, fps: 10 },
  waving: { atlasId: 'core', row: 3, frames: 4, fps: 6 },
  jumping: { atlasId: 'core', row: 4, frames: 5, fps: 8 },
  failed: { atlasId: 'core', row: 5, frames: 8, fps: 5 },
  waiting: { atlasId: 'core', row: 6, frames: 6, fps: 4 },
  running: { atlasId: 'core', row: 7, frames: 6, fps: 8 },
  sendingPrompt: { atlasId: 'core', row: 8, frames: 6, fps: 6 },
  review: { atlasId: 'core', row: 8, frames: 6, fps: 5 },
  deepThinking: { atlasId: 'rag', row: 0, frames: 6, fps: 5, fallbackAnimation: 'review' },
  retrieving: { atlasId: 'rag', row: 1, frames: 8, fps: 8, fallbackAnimation: 'review' },
  warningRecover: { atlasId: 'rag', row: 2, frames: 8, fps: 5, fallbackAnimation: 'failed' },
  contextCompressing: { atlasId: 'rag', row: 3, frames: 6, fps: 5, fallbackAnimation: 'review' },
  flareScan: { atlasId: 'rag', row: 4, frames: 8, fps: 7, fallbackAnimation: 'runningRight' },
  toolWorking: { atlasId: 'provider', row: 0, frames: 8, fps: 8, fallbackAnimation: 'waving' },
  syncingModels: { atlasId: 'provider', row: 1, frames: 8, fps: 8, fallbackAnimation: 'running' },
  offlineWaiting: { atlasId: 'provider', row: 2, frames: 6, fps: 4, fallbackAnimation: 'waiting' },
  mcpWorking: { atlasId: 'provider', row: 3, frames: 8, fps: 8, fallbackAnimation: 'waving' },
  skillRunning: { atlasId: 'provider', row: 4, frames: 6, fps: 6, fallbackAnimation: 'review' },
  attachmentReading: {
    atlasId: 'provider',
    row: 5,
    frames: 6,
    fps: 5,
    fallbackAnimation: 'review',
  },
  webSearching: {
    atlasId: 'provider',
    row: 6,
    frames: 8,
    fps: 9,
    fallbackAnimation: 'runningRight',
  },
  modelTesting: { atlasId: 'provider', row: 7, frames: 6, fps: 6, fallbackAnimation: 'review' },
  providerIssue: { atlasId: 'provider', row: 8, frames: 8, fps: 5, fallbackAnimation: 'failed' },
}

const atlases: Record<HmrBrandSpriteAtlasId, HmrBrandSpriteAtlas> = {
  core: { id: 'core', available: true },
  rag: { id: 'rag', available: false, fallbackAtlasId: 'core' },
  provider: { id: 'provider', available: false, fallbackAtlasId: 'core' },
}

const props = withDefaults(
  defineProps<{
    state?: HmrBrandSpriteState
    atlasEnabled?: boolean
    staticMode?: boolean
  }>(),
  {
    state: 'idle',
    atlasEnabled: false,
    staticMode: false,
  }
)

const frame = ref(0)
let animationFrame: number | undefined
let lastFrameTime = 0

const activeAnimation = computed(() => resolveAnimation(props.state))
const shouldAnimateFrames = computed(
  () => !props.staticMode && activeAnimation.value.row.frames > 1
)
const shouldUseAtlas = computed(() => shouldAnimateFrames.value && props.atlasEnabled)
const frameDuration = computed(() => 1000 / activeAnimation.value.row.fps)
const spriteClasses = computed(() => ({
  'hmr-brand-sprite--animated': shouldAnimateFrames.value && shouldUseAtlas.value,
  'hmr-brand-sprite--atlas': shouldUseAtlas.value,
  'hmr-brand-sprite--static': props.staticMode,
  'hmr-brand-sprite--fallback': activeAnimation.value.usingFallback,
}))
const spriteStyle = computed(() => ({
  '--hmr-brand-sprite-frame': shouldUseAtlas.value ? String(frame.value) : '0',
  '--hmr-brand-sprite-row': String(activeAnimation.value.row.row),
}))

function stopFrames(): void {
  if (animationFrame === undefined || typeof window === 'undefined') return
  window.cancelAnimationFrame(animationFrame)
  animationFrame = undefined
}

function tickFrame(now: number): void {
  if (!shouldAnimateFrames.value || !shouldUseAtlas.value) {
    stopFrames()
    return
  }
  const animation = activeAnimation.value.row
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
  if (!shouldAnimateFrames.value || !shouldUseAtlas.value || typeof window === 'undefined') return

  animationFrame = window.requestAnimationFrame((now) => {
    lastFrameTime = now
    animationFrame = window.requestAnimationFrame(tickFrame)
  })
}

function resolveAnimation(state: HmrBrandSpriteState): ResolvedHmrBrandSpriteAnimation {
  const requested = animations[state] ?? animations.idle
  const preferredAtlas = atlases[requested.atlasId] ?? atlases.core
  if (preferredAtlas.available) {
    return {
      animation: state,
      requestedAnimation: state,
      atlas: preferredAtlas,
      row: requested,
      usingFallback: false,
    }
  }

  const fallbackAnimation = requested.fallbackAnimation ?? 'idle'
  const fallback = animations[fallbackAnimation] ?? animations.idle
  const fallbackAtlas = atlases[fallback.atlasId] ?? atlases.core
  if (fallbackAtlas.available) {
    return {
      animation: fallbackAnimation,
      requestedAnimation: state,
      atlas: fallbackAtlas,
      row: fallback,
      usingFallback: true,
    }
  }

  return {
    animation: 'idle',
    requestedAnimation: state,
    atlas: atlases.core,
    row: animations.idle,
    usingFallback: true,
  }
}

watch(
  () => [props.state, props.atlasEnabled, props.staticMode] as const,
  () => {
    startFrames()
  },
  {
    immediate: true,
  }
)

onBeforeUnmount(() => {
  stopFrames()
})
</script>
