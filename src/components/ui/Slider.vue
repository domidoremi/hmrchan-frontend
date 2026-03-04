<template>
  <div :class="sliderContainerClass" :style="sliderContainerStyle">
    <div
      class="ui-slider__track"
      ref="trackRef"
      :id="sliderId"
      role="slider"
      tabindex="0"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuenow="model"
      :aria-label="label || ariaLabel"
      :aria-disabled="disabled"
      v-bind="sliderTrackAttrs"
      @click="handleTrackClick"
      @keydown="handleKeydown"
    >
      <div class="ui-slider__range" :style="rangeStyle" />
      <div
        class="ui-slider__thumb"
        :style="thumbStyle"
        @mousedown="startDrag"
        @touchstart.passive="startDrag"
      />
    </div>
    <div v-if="showValue" class="ui-slider__value">{{ displayValue }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, useAttrs, useId, useTemplateRef } from 'vue'

defineOptions({ inheritAttrs: false, name: 'UiSlider' })

interface Props {
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  showValue?: boolean
  label?: string
}
function cleanupDragListeners() {
  if (dragMoveHandler) {
    document.removeEventListener('mousemove', dragMoveHandler)
    document.removeEventListener('touchmove', dragMoveHandler)
    dragMoveHandler = null
  }
  if (dragEndHandler) {
    document.removeEventListener('mouseup', dragEndHandler)
    document.removeEventListener('touchend', dragEndHandler)
    dragEndHandler = null
  }
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 1,
  disabled: false,
  showValue: false,
})

const model = defineModel<number>({ default: 0 })

const attrs = useAttrs()
const generatedId = useId()
const sliderId = computed(() => (attrs.id as string | undefined) ?? generatedId)
const ariaLabel = computed(() => attrs['aria-label'] as string | undefined)
const sliderContainerClass = computed(() => [
  'ui-slider',
  attrs.class,
  {
    'ui-slider--disabled': props.disabled,
  },
])
const sliderContainerStyle = computed(
  () => (attrs.style as string | Record<string, unknown> | undefined) ?? undefined
)
const sliderTrackAttrs = computed(() => {
  const rest = { ...(attrs as Record<string, unknown>) }
  delete rest.class
  delete rest.style
  delete rest.id
  return rest
})

const trackRef = useTemplateRef<HTMLElement>('trackRef')
const isDragging = ref(false)
let dragMoveHandler: ((e: MouseEvent | TouchEvent) => void) | null = null
let dragEndHandler: (() => void) | null = null

const percentage = computed(() => {
  return ((model.value - props.min) / (props.max - props.min)) * 100
})

const rangeStyle = computed(() => ({
  width: `${percentage.value}%`,
}))

const thumbStyle = computed(() => ({
  left: `${percentage.value}%`,
}))

const displayValue = computed(() => {
  return model.value.toFixed(props.step < 1 ? String(props.step).split('.')[1]?.length || 0 : 0)
})

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function roundToStep(value: number): number {
  return Math.round(value / props.step) * props.step
}

function getValueFromPosition(clientX: number): number {
  if (!trackRef.value) return model.value
  const rect = trackRef.value.getBoundingClientRect()
  const percentage = (clientX - rect.left) / rect.width
  const value = props.min + percentage * (props.max - props.min)
  return roundToStep(clamp(value, props.min, props.max))
}

function handleTrackClick(event: MouseEvent) {
  if (props.disabled) return
  const value = getValueFromPosition(event.clientX)
  model.value = value
}

function startDrag(event: MouseEvent | TouchEvent) {
  if (props.disabled) return
  event.preventDefault()
  isDragging.value = true

  const handleMove = (e: MouseEvent | TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const value = getValueFromPosition(clientX)
    model.value = value
  }

  const handleEnd = () => {
    isDragging.value = false
    cleanupDragListeners()
  }

  dragMoveHandler = handleMove
  dragEndHandler = handleEnd

  document.addEventListener('mousemove', dragMoveHandler)
  document.addEventListener('mouseup', dragEndHandler)
  document.addEventListener('touchmove', dragMoveHandler)
  document.addEventListener('touchend', dragEndHandler)
}

function handleKeydown(event: KeyboardEvent) {
  if (props.disabled) return

  let newValue = model.value
  const bigStep = (props.max - props.min) / 10

  switch (event.key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      newValue = model.value - props.step
      break
    case 'ArrowRight':
    case 'ArrowUp':
      newValue = model.value + props.step
      break
    case 'PageDown':
      newValue = model.value - bigStep
      break
    case 'PageUp':
      newValue = model.value + bigStep
      break
    case 'Home':
      newValue = props.min
      break
    case 'End':
      newValue = props.max
      break
    default:
      return
  }

  event.preventDefault()
  model.value = roundToStep(clamp(newValue, props.min, props.max))
}

onUnmounted(() => {
  isDragging.value = false
  cleanupDragListeners()
})
</script>

<style scoped>
.ui-slider {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  width: 100%;
}

.ui-slider--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.ui-slider__track {
  position: relative;
  flex: 1;
  height: var(--ui-slider-track-height);
  background: var(--glass-bg-light);
  border-radius: var(--radius-full);
  cursor: pointer;
}

.ui-slider__range {
  position: absolute;
  height: 100%;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  pointer-events: none;
}

.ui-slider__thumb {
  position: absolute;
  top: 50%;
  width: var(--ui-slider-thumb-size);
  height: var(--ui-slider-thumb-size);
  margin-left: calc(var(--ui-slider-thumb-size) / -2);
  margin-top: calc(var(--ui-slider-thumb-size) / -2);
  background: var(--color-white);
  border: var(--ui-slider-thumb-border) solid var(--color-primary);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm);
  cursor: grab;
  transition:
    box-shadow 150ms var(--ease-out),
    transform 150ms var(--ease-out);
}

.ui-slider__thumb:hover {
  box-shadow: var(--shadow-md);
}

.ui-slider__thumb:active {
  cursor: grabbing;
  transform: scale(1.1);
}

.ui-slider__track:focus-visible {
  outline: none;
}

.ui-slider__track:focus-visible .ui-slider__thumb {
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.2);
}

.ui-slider__value {
  min-width: 2.5rem;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-foreground);
  text-align: right;
}
</style>
