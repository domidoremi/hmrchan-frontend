<template>
  <div v-if="isActive && assetAvailable" class="mascot-flight-bg" aria-hidden="true">
    <span
      v-for="lane in activeLanes"
      :key="lane.id"
      class="mascot-flight-bg__lane"
      :style="laneStyle(lane)"
    >
      <span class="mascot-flight-bg__wobble" :style="wobbleStyle(lane)">
        <img
          class="mascot-flight-bg__sprite"
          :src="mascotSrc"
          alt=""
          loading="lazy"
          decoding="async"
          fetchpriority="low"
          draggable="false"
          @error="handleAssetError"
        />
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@/stores'
import type { AnimationIntensity } from '@/stores/settings'

interface FlightLane {
  id: number
  sizeIndex: number
  originBottom: number
  duration: number
  delay: number
  opacity: number
  drift: number
  travel: number
  rotate: number
  flapDuration: number
  flapDelay: number
  swayAmp: number
  swayDuration: number
  swayDelay: number
}

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const defaultMascotSettings = {
  enabled: false,
  density: 1,
  speed: 1,
  opacity: 0.85,
}
const mascotSettings = computed(() => settings.value.mascotBackground ?? defaultMascotSettings)

const mascotSrc = '/images/expressions/fly-sm-transparent.webp'
const MAX_LANES = 12
const sizePresets = [
  'clamp(2.5rem, 4.6vw, 3.9rem)',
  'clamp(2.7rem, 5vw, 4.2rem)',
  'clamp(2.9rem, 5.4vw, 4.5rem)',
  'clamp(3rem, 5.8vw, 4.8rem)',
  'clamp(3.1rem, 6vw, 5rem)',
]

const laneCountByIntensity: Record<AnimationIntensity, number> = {
  none: 0,
  reduced: 3,
  normal: 5,
  full: 7,
}

const speedScaleByIntensity: Record<AnimationIntensity, number> = {
  none: 1,
  reduced: 1.25,
  normal: 1,
  full: 0.85,
}

const randomFloat = (min: number, max: number, decimals = 2) => {
  const value = min + Math.random() * (max - min)
  return Number(value.toFixed(decimals))
}

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

const laneSignature = (lane: FlightLane) =>
  [
    lane.sizeIndex,
    Math.round(lane.originBottom * 10),
    Math.round(lane.duration * 10),
    Math.round(lane.opacity * 100),
    Math.round(lane.drift * 100),
    Math.round(lane.travel * 10),
    Math.round(lane.rotate),
  ].join(':')

const animationIntensity = computed<AnimationIntensity>(() => {
  if (!settings.value.enableAnimations) return 'none'
  return settings.value.animationIntensity
})

const activeLaneCount = computed(() => {
  if (!mascotSettings.value.enabled) return 0
  const base = laneCountByIntensity[animationIntensity.value]
  if (base <= 0) return 0
  return Math.min(MAX_LANES, Math.max(1, Math.round(base * mascotSettings.value.density)))
})
const isActive = computed(() => mascotSettings.value.enabled && activeLaneCount.value > 0)
const assetAvailable = ref(true)

const createLane = (id: number, index: number, total: number): FlightLane => {
  const sizeIndex = randomInt(0, sizePresets.length - 1)
  const duration = randomFloat(21, 32, 2)
  const bandStart = -20
  const bandEnd = 96
  const bandSpan = bandEnd - bandStart
  const step = bandSpan / Math.max(total, 1)
  const center = bandStart + step * (index + 0.5)
  const jitter = randomFloat(-Math.max(1.2, step * 0.22), Math.max(1.2, step * 0.22), 2)
  const originBottom = Math.max(bandStart + 1.5, Math.min(bandEnd - 1.5, center + jitter))
  const rawDelay = -(duration / Math.max(total, 1)) * index + randomFloat(-0.35, 0.35, 2)
  const delay = Math.max(-duration, rawDelay > 0 ? -rawDelay : rawDelay)

  return {
    id,
    sizeIndex,
    originBottom,
    duration,
    delay,
    opacity: randomFloat(0.11, 0.19, 3),
    drift: randomFloat(0.45, 1.15, 2),
    travel: randomFloat(142, 172, 2),
    rotate: randomFloat(-11, -2, 2),
    flapDuration: randomFloat(1.35, 2.1, 2),
    flapDelay: randomFloat(-1.8, 0, 2),
    swayAmp: randomFloat(0.08, 0.34, 3),
    swayDuration: randomFloat(7.4, 15.3, 2),
    swayDelay: randomFloat(-6.4, 0, 2),
  }
}

const buildLanes = (count: number) => {
  if (count <= 0) return [] as FlightLane[]
  const lanes: FlightLane[] = []
  const used = new Set<string>()
  for (let i = 0; i < count; i++) {
    let lane = createLane(i + 1, i, count)
    let attempts = 0
    while (used.has(laneSignature(lane)) && attempts < 16) {
      lane = createLane(i + 1, i, count)
      attempts += 1
    }
    used.add(laneSignature(lane))
    lanes.push(lane)
  }
  return lanes
}

const activeLanes = ref<FlightLane[]>(buildLanes(activeLaneCount.value))

watch(
  activeLaneCount,
  (count) => {
    activeLanes.value = buildLanes(count)
  },
  { immediate: true }
)

watch(
  () => mascotSettings.value.enabled,
  (enabled) => {
    if (enabled) {
      assetAvailable.value = true
    }
  }
)

function handleAssetError() {
  assetAvailable.value = false
}

const laneStyle = (lane: FlightLane): Record<string, string> => {
  const speedScale = speedScaleByIntensity[animationIntensity.value] / mascotSettings.value.speed
  const opacity = Math.max(0.05, Math.min(1, lane.opacity * mascotSettings.value.opacity))
  return {
    '--lane-origin-bottom': `${lane.originBottom}dvh`,
    '--lane-size': sizePresets[lane.sizeIndex],
    '--lane-duration': `${(lane.duration * speedScale).toFixed(2)}s`,
    '--lane-delay': `${lane.delay}s`,
    '--lane-opacity': `${opacity}`,
    '--lane-drift': `${lane.drift}rem`,
    '--lane-travel': `${lane.travel}vw`,
    '--lane-rotate': `${lane.rotate}deg`,
    '--lane-flap-duration': `${(lane.flapDuration * speedScale).toFixed(2)}s`,
    '--lane-flap-delay': `${lane.flapDelay}s`,
  }
}

const wobbleStyle = (lane: FlightLane): Record<string, string> => ({
  '--lane-sway-amp': `${lane.swayAmp}rem`,
  '--lane-sway-duration': `${(lane.swayDuration / mascotSettings.value.speed).toFixed(2)}s`,
  '--lane-sway-delay': `${lane.swayDelay}s`,
})
</script>

<style scoped>
.mascot-flight-bg {
  position: fixed;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  pointer-events: none;
  contain: layout paint;
  will-change: transform;
}

.mascot-flight-bg__lane {
  position: absolute;
  bottom: var(--lane-origin-bottom);
  inset-inline-start: -20vw;
  width: var(--lane-size);
  aspect-ratio: 1;
  opacity: var(--lane-opacity);
  will-change: transform;
  animation: mascot-fly-diagonal var(--lane-duration) linear infinite;
  animation-delay: var(--lane-delay);
}

.mascot-flight-bg__wobble {
  width: 100%;
  height: 100%;
  display: block;
  will-change: transform;
  animation: mascot-wobble var(--lane-sway-duration) ease-in-out infinite;
  animation-delay: var(--lane-sway-delay);
}

.mascot-flight-bg__sprite {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: transparent;
  filter: drop-shadow(0 0.2rem 0.45rem rgba(15, 23, 42, 0.14));
  animation: mascot-flap var(--lane-flap-duration) ease-in-out infinite;
  animation-delay: var(--lane-flap-delay);
  transform-origin: 50% 70%;
}

@keyframes mascot-fly-diagonal {
  0% {
    transform: translate3d(0, 0, 0) rotate(var(--lane-rotate));
  }
  33% {
    transform: translate3d(
        calc(var(--lane-travel) * 0.33),
        calc((var(--lane-travel) * -0.33) + var(--lane-drift)),
        0
      )
      rotate(calc(var(--lane-rotate) * -0.55));
  }
  66% {
    transform: translate3d(
        calc(var(--lane-travel) * 0.66),
        calc((var(--lane-travel) * -0.66) + calc(var(--lane-drift) * -0.45)),
        0
      )
      rotate(calc(var(--lane-rotate) * -0.15));
  }
  100% {
    transform: translate3d(var(--lane-travel), calc(var(--lane-travel) * -1), 0)
      rotate(calc(var(--lane-rotate) * -0.2));
  }
}

@keyframes mascot-wobble {
  0%,
  100% {
    transform: translate3d(0, 0, 0) rotate(0deg);
  }
  50% {
    transform: translate3d(calc(var(--lane-sway-amp) * 0.55), calc(var(--lane-sway-amp) * -1), 0)
      rotate(2deg);
  }
}

@keyframes mascot-flap {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-0.2rem) scale(1.03);
  }
}

@media (max-width: 48rem) {
  .mascot-flight-bg__lane {
    opacity: calc(var(--lane-opacity) * 0.8);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mascot-flight-bg {
    display: none;
  }
}
</style>
