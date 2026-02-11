<template>
  <div class="ui-slider" :class="{ 'ui-slider--disabled': disabled }">
    <div class="ui-slider__track" ref="trackRef" @click="handleTrackClick">
      <div class="ui-slider__range" :style="rangeStyle" />
      <div
        class="ui-slider__thumb"
        :style="thumbStyle"
        role="slider"
        tabindex="0"
        :aria-valuemin="min"
        :aria-valuemax="max"
        :aria-valuenow="modelValue"
        :aria-disabled="disabled"
        @mousedown="startDrag"
        @touchstart.passive="startDrag"
        @keydown="handleKeydown"
      />
    </div>
    <div v-if="showValue" class="ui-slider__value">{{ displayValue }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

defineOptions({ name: 'UiSlider' })

interface Props {
  modelValue?: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  showValue?: boolean
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
  modelValue: 0,
  min: 0,
  max: 100,
  step: 1,
  disabled: false,
  showValue: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const trackRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
let dragMoveHandler: ((e: MouseEvent | TouchEvent) => void) | null = null
let dragEndHandler: (() => void) | null = null

const percentage = computed(() => {
  return ((props.modelValue - props.min) / (props.max - props.min)) * 100
})

const rangeStyle = computed(() => ({
  width: `${percentage.value}%`,
}))

const thumbStyle = computed(() => ({
  left: `${percentage.value}%`,
}))

const displayValue = computed(() => {
  return props.modelValue.toFixed(
    props.step < 1 ? String(props.step).split('.')[1]?.length || 0 : 0
  )
})

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function roundToStep(value: number): number {
  return Math.round(value / props.step) * props.step
}

function getValueFromPosition(clientX: number): number {
  if (!trackRef.value) return props.modelValue
  const rect = trackRef.value.getBoundingClientRect()
  const percentage = (clientX - rect.left) / rect.width
  const value = props.min + percentage * (props.max - props.min)
  return roundToStep(clamp(value, props.min, props.max))
}

function handleTrackClick(event: MouseEvent) {
  if (props.disabled) return
  const value = getValueFromPosition(event.clientX)
  emit('update:modelValue', value)
}

function startDrag(event: MouseEvent | TouchEvent) {
  if (props.disabled) return
  event.preventDefault()
  isDragging.value = true
  dragMoveHandler = (e: MouseEvent | TouchEvent) => {
  const handleMove = (e: MouseEvent | TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const value = getValueFromPosition(clientX)
    emit('update:modelValue', value)
  }
  dragEndHandler = () => {
  const handleEnd = () => {
    isDragging.value = false
    cleanupDragListeners()
  }

  document.addEventListener('mousemove', dragMoveHandler)
  document.addEventListener('mouseup', dragEndHandler)
  document.addEventListener('touchmove', dragMoveHandler)
  document.addEventListener('touchend', dragEndHandler)
}

function handleKeydown(event: KeyboardEvent) {
  if (props.disabled) return

  let newValue = props.modelValue
  const bigStep = (props.max - props.min) / 10

  switch (event.key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      newValue = props.modelValue - props.step
      break
    case 'ArrowRight':
    case 'ArrowUp':
      newValue = props.modelValue + props.step
      break
    case 'PageDown':
      newValue = props.modelValue - bigStep
      break
    case 'PageUp':
      newValue = props.modelValue + bigStep
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
  emit('update:modelValue', roundToStep(clamp(newValue, props.min, props.max)))
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
  height: 0.5rem;
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
  width: 1.25rem;
  height: 1.25rem;
  margin-left: -0.625rem;
  margin-top: -0.625rem;
  background: var(--color-white);
  border: 2px solid var(--color-primary);
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

.ui-slider__thumb:focus-visible {
  outline: none;
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
