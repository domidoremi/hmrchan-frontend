<template>
  <div class="image-cropper-overlay" @click.self="cancel">
    <div class="image-cropper glass-card">
      <header class="cropper-header">
        <h3>{{ $t('profile.cropAvatar') }}</h3>
        <button type="button" class="close-btn glass-button" :aria-label="$t('common.close')" @click="cancel">
          <X :size="20" />
        </button>
      </header>

      <div class="cropper-body">
        <div class="crop-container" ref="containerRef">
          <img
            ref="imageRef"
            :src="imageSrc"
            alt="Crop preview"
            class="crop-image"
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
        </div>

        <div class="shape-selector">
          <button
            type="button"
            class="shape-btn"
            :class="{ active: shape === 'circle' }"
            @click="shape = 'circle'"
          >
            <Circle :size="20" />
            {{ $t('profile.circleShape') }}
          </button>
          <button
            type="button"
            class="shape-btn"
            :class="{ active: shape === 'square' }"
            @click="shape = 'square'"
          >
            <Square :size="20" />
            {{ $t('profile.squareShape') }}
          </button>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { X, Circle, Square } from 'lucide-vue-next'
import Button from './Button.vue'

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

const containerRef = ref<HTMLDivElement>()
const imageRef = ref<HTMLImageElement>()
const shape = ref<'circle' | 'square'>('circle')

const imageSize = ref({ width: 0, height: 0 })
const imageOffset = ref({ x: 0, y: 0 })
const cropBox = ref({ x: 0, y: 0, size: 150 })

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
  const scaleX = img.naturalWidth / imageSize.value.width
  const scaleY = img.naturalHeight / imageSize.value.height

  // 使用统一的缩放比例（因为图片保持宽高比）
  const scale = Math.max(scaleX, scaleY)
  const sourceX = cropBox.value.x * scale
  const sourceY = cropBox.value.y * scale
  const sourceSize = cropBox.value.size * scale

  if (shape.value === 'circle') {
    ctx.beginPath()
    ctx.arc(props.outputSize / 2, props.outputSize / 2, props.outputSize / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
  }

  ctx.drawImage(
    img,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    props.outputSize,
    props.outputSize
  )

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
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

.close-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cropper-body {
  flex: 1;
  padding: var(--spacing-4);
  overflow: hidden;
}

.crop-container {
  position: relative;
  width: 100%;
  height: 300px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.crop-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
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
  width: 16px;
  height: 16px;
  background: var(--color-white);
  border: 2px solid var(--color-primary);
  border-radius: 50%;
}

.resize-handle.nw {
  top: -8px;
  left: -8px;
  cursor: nw-resize;
}

.resize-handle.ne {
  top: -8px;
  right: -8px;
  cursor: ne-resize;
}

.resize-handle.sw {
  bottom: -8px;
  left: -8px;
  cursor: sw-resize;
}

.resize-handle.se {
  bottom: -8px;
  right: -8px;
  cursor: se-resize;
}

.shape-selector {
  display: flex;
  gap: var(--spacing-2);
  margin-top: var(--spacing-4);
  justify-content: center;
}

.shape-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.shape-btn:hover {
  background: var(--glass-bg-light);
  color: var(--color-text);
}

.shape-btn.active {
  background: var(--color-primary);
  color: var(--color-white);
}

.cropper-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  border-top: 1px solid var(--glass-border);
}
</style>
