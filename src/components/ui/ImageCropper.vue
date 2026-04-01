<template>
  <div class="image-cropper-overlay" @click.self="cancel">
    <div class="image-cropper empty-surface" role="dialog" aria-modal="true">
      <header class="cropper-header">
        <h3>{{ $t('profile.cropAvatar') }}</h3>
        <ControlButton
          class="close-btn"
          size="square"
          icon-only
          :aria-label="$t('common.close')"
          @click="cancel"
        >
          <template #start>
            <AnimatedIcon name="sparkle" :fallback-icon="X" size="md" />
          </template>
        </ControlButton>
      </header>

      <div class="cropper-body">
        <div class="crop-container" ref="containerRef">
          <img
            ref="imageRef"
            :src="imageSrc"
            :alt="$t('common.cropPreview')"
            class="crop-image"
            :style="{ '--image-transform': imageTransform }"
            @load="onImageLoad"
          />
          <div
            class="crop-overlay"
            :class="{ circular: shape === 'circle' }"
            :style="cropBoxStyle"
            @mousedown="startDrag"
            @touchstart.prevent="startDrag"
          >
            <div class="crop-border" />
            <div
              v-for="handle in resizeHandles"
              :key="handle"
              :class="['resize-handle', handle]"
              @mousedown.stop="startResize($event, handle)"
              @touchstart.prevent.stop="startResize($event, handle)"
            />
          </div>
          <div class="crop-grid" aria-hidden="true">
            <span v-for="line in 2" :key="`v-${line}`" class="grid-line vertical" />
            <span v-for="line in 2" :key="`h-${line}`" class="grid-line horizontal" />
          </div>
        </div>

        <div class="cropper-controls">
          <label class="control-label">
            {{ $t('profile.zoom') }}
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              :aria-label="$t('profile.zoom')"
              :value="zoom"
              @input="updateZoom"
            />
          </label>
          <label class="control-label">
            {{ $t('profile.rotate') }}
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              :aria-label="$t('profile.rotate')"
              :value="rotation"
              @input="updateRotation"
            />
          </label>
          <div class="control-actions">
            <ControlButton class="ghost-btn" size="compact" @click="resetAdjustments">
              {{ $t('common.reset') }}
            </ControlButton>
          </div>
        </div>

        <div class="shape-selector">
          <ControlButton
            class="shape-btn"
            size="compact"
            :pressed="shape === 'circle'"
            @click="shape = 'circle'"
          >
            <template #start>
              <AnimatedIcon name="explore" :fallback-icon="Circle" size="md" />
            </template>
            {{ $t('profile.circleShape') }}
          </ControlButton>
          <ControlButton
            class="shape-btn"
            size="compact"
            :pressed="shape === 'square'"
            @click="shape = 'square'"
          >
            <template #start>
              <AnimatedIcon name="explore" :fallback-icon="Square" size="md" />
            </template>
            {{ $t('profile.squareShape') }}
          </ControlButton>
        </div>
      </div>

      <footer class="cropper-footer">
        <Button variant="secondary" @click="cancel">
          {{ $t('common.cancel') }}
        </Button>
        <Button @click="crop">
          {{ $t('common.confirm') }}
        </Button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { X, Circle, Square } from '@lucide/vue'
import ControlButton from '@/components/appearance/ControlButton.vue'
import Button from './Button.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

interface Props {
  imageSrc: string
  outputSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  outputSize: 256,
})

const emit = defineEmits<{
  crop: [blob: Blob]
  cancel: []
}>()

const containerRef = useTemplateRef<HTMLDivElement>('containerRef')
const imageRef = useTemplateRef<HTMLImageElement>('imageRef')
const shape = ref<'circle' | 'square'>('circle')

const imageSize = ref({ width: 0, height: 0 })
const imageOffset = ref({ x: 0, y: 0 })
const cropBox = ref({ x: 0, y: 0, size: 150 })
const zoom = ref(1)
const rotation = ref(0)

const isDragging = ref(false)
const isResizing = ref(false)
const resizeHandle = ref('')
const dragStart = ref({ x: 0, y: 0, boxX: 0, boxY: 0, boxSize: 0 })

const resizeHandles = ['nw', 'ne', 'sw', 'se']

const cropBoxStyle = computed(() => ({
  left: `${imageOffset.value.x + cropBox.value.x}px`,
  top: `${imageOffset.value.y + cropBox.value.y}px`,
  width: `${cropBox.value.size}px`,
  height: `${cropBox.value.size}px`,
}))

const imageTransform = computed(
  () => `translate(-50%, -50%) scale(${zoom.value}) rotate(${rotation.value}deg)`
)

function onImageLoad() {
  if (!imageRef.value || !containerRef.value) return

  const img = imageRef.value
  const container = containerRef.value

  const containerRect = container.getBoundingClientRect()
  const scale = Math.min(
    containerRect.width / img.naturalWidth,
    containerRect.height / img.naturalHeight,
    1
  )

  const displayWidth = img.naturalWidth * scale
  const displayHeight = img.naturalHeight * scale

  imageSize.value = {
    width: displayWidth,
    height: displayHeight,
  }

  // 计算图片在容器中的居中偏移
  imageOffset.value = {
    x: (containerRect.width - displayWidth) / 2,
    y: (containerRect.height - displayHeight) / 2,
  }

  const minDim = Math.min(displayWidth, displayHeight)
  const initialSize = Math.min(minDim * 0.8, 200)

  cropBox.value = {
    x: (displayWidth - initialSize) / 2,
    y: (displayHeight - initialSize) / 2,
    size: initialSize,
  }
}

function getEventPosition(e: MouseEvent | TouchEvent) {
  if ('touches' in e && e.touches.length > 0) {
    return { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY }
  }
  return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY }
}

function startDrag(e: MouseEvent | TouchEvent) {
  if (isResizing.value) return
  isDragging.value = true
  const pos = getEventPosition(e)
  dragStart.value = {
    x: pos.x,
    y: pos.y,
    boxX: cropBox.value.x,
    boxY: cropBox.value.y,
    boxSize: cropBox.value.size,
  }
}

function startResize(e: MouseEvent | TouchEvent, handle: string) {
  isResizing.value = true
  resizeHandle.value = handle
  const pos = getEventPosition(e)
  dragStart.value = {
    x: pos.x,
    y: pos.y,
    boxX: cropBox.value.x,
    boxY: cropBox.value.y,
    boxSize: cropBox.value.size,
  }
}

function onMouseMove(e: MouseEvent | TouchEvent) {
  if (!isDragging.value && !isResizing.value) return

  const pos = getEventPosition(e)
  const deltaX = pos.x - dragStart.value.x
  const deltaY = pos.y - dragStart.value.y

  if (isDragging.value) {
    let newX = dragStart.value.boxX + deltaX
    let newY = dragStart.value.boxY + deltaY

    newX = Math.max(0, Math.min(newX, imageSize.value.width - cropBox.value.size))
    newY = Math.max(0, Math.min(newY, imageSize.value.height - cropBox.value.size))

    cropBox.value.x = newX
    cropBox.value.y = newY
  } else if (isResizing.value) {
    const handle = resizeHandle.value
    let newSize = dragStart.value.boxSize
    let newX = dragStart.value.boxX
    let newY = dragStart.value.boxY

    const delta = Math.max(Math.abs(deltaX), Math.abs(deltaY))
    const sign =
      (handle.includes('e') ? deltaX : -deltaX) > 0 || (handle.includes('s') ? deltaY : -deltaY) > 0
        ? 1
        : -1

    newSize = dragStart.value.boxSize + delta * sign

    newSize = Math.max(
      50,
      Math.min(newSize, Math.min(imageSize.value.width, imageSize.value.height))
    )

    if (handle.includes('w')) {
      newX = dragStart.value.boxX + dragStart.value.boxSize - newSize
    }
    if (handle.includes('n')) {
      newY = dragStart.value.boxY + dragStart.value.boxSize - newSize
    }

    newX = Math.max(0, Math.min(newX, imageSize.value.width - newSize))
    newY = Math.max(0, Math.min(newY, imageSize.value.height - newSize))

    cropBox.value = { x: newX, y: newY, size: newSize }
  }
}

function onMouseUp() {
  isDragging.value = false
  isResizing.value = false
}

function crop() {
  if (!imageRef.value) return

  const canvas = document.createElement('canvas')
  canvas.width = props.outputSize
  canvas.height = props.outputSize
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const img = imageRef.value
  const cropLeft = imageOffset.value.x + cropBox.value.x
  const cropTop = imageOffset.value.y + cropBox.value.y
  const scaleToOutput = props.outputSize / cropBox.value.size

  if (shape.value === 'circle') {
    ctx.beginPath()
    ctx.arc(props.outputSize / 2, props.outputSize / 2, props.outputSize / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
  }

  ctx.save()
  ctx.scale(scaleToOutput, scaleToOutput)
  ctx.translate(-cropLeft, -cropTop)
  const centerX = imageOffset.value.x + imageSize.value.width / 2
  const centerY = imageOffset.value.y + imageSize.value.height / 2
  ctx.translate(centerX, centerY)
  ctx.rotate((rotation.value * Math.PI) / 180)
  ctx.scale(zoom.value, zoom.value)
  ctx.drawImage(
    img,
    -imageSize.value.width / 2,
    -imageSize.value.height / 2,
    imageSize.value.width,
    imageSize.value.height
  )
  ctx.restore()

  canvas.toBlob(
    (blob) => {
      if (blob) {
        emit('crop', blob)
      }
    },
    'image/png',
    0.95
  )
}

function cancel() {
  emit('cancel')
}

function updateZoom(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isNaN(value)) {
    zoom.value = value
  }
}

function updateRotation(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isNaN(value)) {
    rotation.value = value
  }
}

function resetAdjustments() {
  zoom.value = 1
  rotation.value = 0
}

onMounted(() => {
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  document.addEventListener('touchmove', onMouseMove)
  document.addEventListener('touchend', onMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  document.removeEventListener('touchmove', onMouseMove)
  document.removeEventListener('touchend', onMouseUp)
})
</script>

<style scoped>
.image-cropper-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--spacing-4);
}

.image-cropper {
  width: 100%;
  max-width: 500px;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.image-cropper.empty-surface {
  animation: none;
}

.cropper-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4);
  border-bottom: 1px solid var(--glass-border);
}

.cropper-header h3 {
  margin: 0;
  font-size: var(--text-lg);
}

.close-btn.page-control {
  min-inline-size: var(--ui-action-size);
  block-size: var(--ui-action-size);
  padding: 0;
  box-shadow: none;
}

.cropper-body {
  flex: 1;
  padding: var(--spacing-4);
  overflow: hidden;
}

.crop-container {
  position: relative;
  width: 100%;
  height: 18.75rem;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.crop-image {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: var(--image-transform, translate(-50%, -50%));
  transition: transform 0.2s ease;
  will-change: transform;
}

.crop-overlay {
  position: absolute;
  cursor: move;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
}

.crop-overlay.circular {
  border-radius: 50%;
}

.crop-border {
  position: absolute;
  inset: 0;
  border: 2px dashed var(--color-white);
  border-radius: inherit;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  width: 1rem;
  height: 1rem;
  background: var(--color-white);
  border: 2px solid var(--color-primary);
  border-radius: 50%;
}

.resize-handle.nw {
  top: -0.5rem;
  left: -0.5rem;
  cursor: nw-resize;
}

.resize-handle.ne {
  top: -0.5rem;
  right: -0.5rem;
  cursor: ne-resize;
}

.resize-handle.sw {
  bottom: -0.5rem;
  left: -0.5rem;
  cursor: sw-resize;
}

.resize-handle.se {
  bottom: -0.5rem;
  right: -0.5rem;
  cursor: se-resize;
}

.crop-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.grid-line {
  position: absolute;
  background: rgba(255, 255, 255, 0.25);
}

.grid-line.vertical {
  top: 0;
  bottom: 0;
  width: 0.0625rem;
}

.grid-line.horizontal {
  left: 0;
  right: 0;
  height: 0.0625rem;
}

.grid-line.vertical:nth-child(1) {
  left: 33.333%;
}

.grid-line.vertical:nth-child(2) {
  left: 66.666%;
}

.grid-line.horizontal:nth-child(1) {
  top: 33.333%;
}

.grid-line.horizontal:nth-child(2) {
  top: 66.666%;
}

.cropper-controls {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  margin-top: var(--spacing-4);
  padding: var(--spacing-3);
  border-radius: var(--radius-lg);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
}

.control-label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.control-label input[type='range'] {
  accent-color: var(--color-primary);
}

.control-actions {
  display: flex;
  justify-content: flex-end;
}

.ghost-btn.page-control {
  border: 1px solid var(--color-border);
  background: transparent;
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  box-shadow: none;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.ghost-btn.page-control:hover,
.ghost-btn.page-control:focus-visible {
  background: var(--color-muted);
  color: var(--color-text-primary);
}

.shape-selector {
  display: flex;
  gap: var(--spacing-2);
  margin-top: var(--spacing-4);
  justify-content: center;
}

.shape-btn.page-control {
  min-inline-size: var(--ui-control-compact-min-inline-size);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  box-shadow: none;
}

.shape-btn.page-control:hover,
.shape-btn.page-control:focus-visible {
  background: var(--glass-bg-light);
  color: var(--color-text);
}

.shape-btn.page-control.page-control--active,
.shape-btn.page-control[aria-pressed='true'] {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-color: transparent;
}

.cropper-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  border-top: 1px solid var(--glass-border);
}
</style>
