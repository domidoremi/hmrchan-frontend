<template>
  <Teleport to="body">
    <motion.div
      v-if="pageWashSequence > 0"
      :key="pageWashSequence"
      class="theme-mode-switch__page-wash"
      :class="`theme-mode-switch__page-wash--${pageWashMode}`"
      :initial="pageWashInitial"
      :animate="pageWashAnimate"
      :transition="pageWashTransition"
      aria-hidden="true"
    />
  </Teleport>

  <div
    class="theme-mode-switch"
    :data-mode="visualResolvedTheme"
    :data-auto="displayedTheme === 'auto'"
    :data-dragging="isDragging"
  >
    <div
      ref="trackElement"
      class="theme-mode-switch__track"
      role="radiogroup"
      :aria-label="label"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerCancel"
    >
      <span class="theme-mode-switch__sky" aria-hidden="true">
        <span class="theme-mode-switch__stars">
          <motion.span
            v-for="(star, index) in stars"
            :key="index"
            class="theme-mode-switch__star"
            :style="star"
            :animate="getStarAnimate(index)"
            :transition="getStarTransition(index)"
          />
        </span>

        <motion.span
          class="theme-mode-switch__cloud theme-mode-switch__cloud--back"
          :animate="backCloudAnimate"
          :transition="cloudTransition"
        />
        <motion.span
          class="theme-mode-switch__cloud theme-mode-switch__cloud--front"
          :animate="frontCloudAnimate"
          :transition="cloudTransition"
        />

        <motion.span
          class="theme-mode-switch__orb"
          :animate="orbAnimate"
          :transition="orbTransition"
        >
          <motion.span
            class="theme-mode-switch__sun"
            :animate="sunAnimate"
            :transition="celestialTransition"
          />
          <motion.span
            class="theme-mode-switch__moon"
            :animate="moonAnimate"
            :transition="celestialTransition"
          >
            <span class="theme-mode-switch__crater theme-mode-switch__crater--one" />
            <span class="theme-mode-switch__crater theme-mode-switch__crater--two" />
            <span class="theme-mode-switch__crater theme-mode-switch__crater--three" />
          </motion.span>
        </motion.span>
      </span>

      <div class="theme-mode-switch__choices">
        <button
          v-for="option in themeOptions"
          :key="option.value"
          type="button"
          class="theme-mode-switch__choice"
          :class="{
            'theme-mode-switch__choice--active': displayedTheme === option.value,
          }"
          :data-theme-value="option.value"
          role="radio"
          :aria-checked="modelValue === option.value"
          :aria-label="option.label"
          @click="handleChoiceClick(option.value)"
        >
          <span>{{ option.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type CSSProperties } from 'vue'
import { motion, useReducedMotion } from 'motion-v'
import type { Theme } from '@/types'

const props = defineProps<{
  modelValue: Theme
  resolvedTheme: 'light' | 'dark'
  label: string
  lightLabel: string
  darkLabel: string
  autoLabel: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Theme]
}>()

const reducedMotion = useReducedMotion()
const pageWashSequence = ref(0)
const pageWashMode = ref<'light' | 'dark'>(props.resolvedTheme)
const trackElement = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const dragLeft = ref<number | null>(null)
const dragTheme = ref<Theme | null>(null)
const pointerStartX = ref(0)
const hasDragged = ref(false)
const suppressNextClick = ref(false)
const ORB_CENTER_INSET_REM = 1.85

const themeOptions = computed<{ value: Theme; label: string }[]>(() => [
  { value: 'light', label: props.lightLabel },
  { value: 'auto', label: props.autoLabel },
  { value: 'dark', label: props.darkLabel },
])

const stars: CSSProperties[] = [
  { left: '16%', top: '20%', width: '0.24rem', height: '0.24rem' },
  { left: '31%', top: '38%', width: '0.34rem', height: '0.34rem' },
  { left: '46%', top: '18%', width: '0.2rem', height: '0.2rem' },
  { left: '57%', top: '42%', width: '0.28rem', height: '0.28rem' },
  { left: '72%', top: '17%', width: '0.32rem', height: '0.32rem' },
  { left: '84%', top: '35%', width: '0.22rem', height: '0.22rem' },
]

const displayedTheme = computed(() => dragTheme.value ?? props.modelValue)
const visualResolvedTheme = computed<'light' | 'dark'>(() => {
  if (displayedTheme.value === 'auto') return props.resolvedTheme
  return displayedTheme.value
})
const isDark = computed(() => visualResolvedTheme.value === 'dark')
const instantTransition = { duration: 0 }

const orbAnimate = computed(() => ({
  left:
    dragLeft.value === null
      ? displayedTheme.value === 'light'
        ? `${ORB_CENTER_INSET_REM}rem`
        : displayedTheme.value === 'auto'
          ? '50%'
          : `calc(100% - ${ORB_CENTER_INSET_REM}rem)`
      : `${dragLeft.value}px`,
  rotate: isDark.value ? -8 : 8,
  y: isDark.value ? 1 : -1,
}))

const orbTransition = computed(() =>
  reducedMotion.value || isDragging.value
    ? instantTransition
    : { type: 'spring' as const, stiffness: 230, damping: 24, mass: 0.72 }
)

const celestialTransition = computed(() =>
  reducedMotion.value ? instantTransition : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
)

const sunAnimate = computed(() => ({
  opacity: isDark.value ? 0 : 1,
  scale: isDark.value ? 0.64 : 1,
  rotate: isDark.value ? -28 : 0,
}))

const moonAnimate = computed(() => ({
  opacity: isDark.value ? 1 : 0,
  scale: isDark.value ? 1 : 0.64,
  rotate: isDark.value ? 0 : 26,
}))

const backCloudAnimate = computed(() => ({
  opacity: isDark.value ? 0 : 0.58,
  x: reducedMotion.value || isDark.value ? (isDark.value ? -12 : 0) : [0, 7, 0],
  y: isDark.value ? 5 : 0,
}))

const frontCloudAnimate = computed(() => ({
  opacity: isDark.value ? 0 : 0.9,
  x: reducedMotion.value || isDark.value ? (isDark.value ? 14 : 0) : [0, -9, 0],
  y: isDark.value ? 6 : 0,
}))

const cloudTransition = computed(() =>
  reducedMotion.value
    ? instantTransition
    : isDark.value
      ? { duration: 0.32, ease: 'easeOut' as const }
      : { duration: 5.2, repeat: Infinity, ease: 'easeInOut' as const }
)

const pageWashInitial = computed(() =>
  reducedMotion.value ? { opacity: 0, scale: 1 } : { opacity: 0, scale: 0.28 }
)

const pageWashAnimate = computed(() =>
  reducedMotion.value
    ? { opacity: 0, scale: 1 }
    : { opacity: [0, 0.2, 0], scale: [0.28, 1.18, 1.34] }
)

const pageWashTransition = computed(() =>
  reducedMotion.value ? instantTransition : { duration: 0.72, ease: [0.22, 1, 0.36, 1] }
)

function getStarAnimate(index: number) {
  if (!isDark.value) return { opacity: 0, scale: 0.65 }
  if (reducedMotion.value) return { opacity: 0.86, scale: 1 }

  const peakScale = 1.05 + (index % 3) * 0.08
  return {
    opacity: [0.36, 1, 0.52],
    scale: [0.82, peakScale, 0.9],
  }
}

function getStarTransition(index: number) {
  if (reducedMotion.value) return instantTransition
  if (!isDark.value) return { duration: 0.24, ease: 'easeOut' as const }
  return {
    duration: 1.7 + (index % 3) * 0.45,
    delay: index * 0.13,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  }
}

function selectTheme(value: Theme) {
  if (value === props.modelValue) return

  pageWashMode.value = value === 'auto' ? props.resolvedTheme : value
  pageWashSequence.value += 1
  emit('update:modelValue', value)
}

function resolveThemeFromPointer(event: PointerEvent): Theme {
  const track = trackElement.value
  if (!track) return displayedTheme.value

  const bounds = track.getBoundingClientRect()
  const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const edgeCenter = Math.min(rootFontSize * ORB_CENTER_INSET_REM, bounds.width / 2)
  const maxCenter = Math.max(edgeCenter, bounds.width - edgeCenter)
  const nextLeft = Math.min(maxCenter, Math.max(edgeCenter, event.clientX - bounds.left))
  const usableWidth = Math.max(1, maxCenter - edgeCenter)
  const ratio = (nextLeft - edgeCenter) / usableWidth

  dragLeft.value = nextLeft
  if (ratio < 0.25) return 'light'
  if (ratio > 0.75) return 'dark'
  return 'auto'
}

function handlePointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  isDragging.value = true
  pointerStartX.value = event.clientX
  hasDragged.value = false
  trackElement.value?.setPointerCapture?.(event.pointerId)
}

function handlePointerMove(event: PointerEvent) {
  if (!isDragging.value) return
  if (Math.abs(event.clientX - pointerStartX.value) > 4) hasDragged.value = true
  if (!hasDragged.value) return
  dragTheme.value = resolveThemeFromPointer(event)
}

function finishPointerInteraction(event: PointerEvent, commit: boolean) {
  if (!isDragging.value) return

  const nextTheme = resolveThemeFromPointer(event)
  trackElement.value?.releasePointerCapture?.(event.pointerId)
  isDragging.value = false
  dragLeft.value = null
  dragTheme.value = null
  hasDragged.value = false

  if (commit) {
    suppressNextClick.value = true
    selectTheme(nextTheme)
    window.setTimeout(() => {
      suppressNextClick.value = false
    }, 0)
  }
}

function handleChoiceClick(value: Theme) {
  if (suppressNextClick.value) {
    suppressNextClick.value = false
    return
  }
  selectTheme(value)
}

function handlePointerUp(event: PointerEvent) {
  finishPointerInteraction(event, true)
}

function handlePointerCancel(event: PointerEvent) {
  finishPointerInteraction(event, false)
}
</script>

<style scoped src="../../styles/components/theme-mode-switch.css"></style>
