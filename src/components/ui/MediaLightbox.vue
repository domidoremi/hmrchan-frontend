<template>
  <Teleport to="body">
    <Transition name="lightbox">
      <div
        v-if="isOpen"
        class="lightbox-backdrop"
        role="dialog"
        aria-modal="true"
        :aria-label="$t('common.imageViewer')"
        @click.self="close"
        @keydown.esc="close"
      >
        <div class="lightbox-container" ref="containerRef">
          <!-- 关闭按钮 -->
          <button
            type="button"
            class="lightbox-close"
            :aria-label="$t('common.close')"
            @click="close"
          >
            <X :size="24" />
          </button>

          <!-- 工具栏 -->
          <div class="lightbox-toolbar">
            <button
              type="button"
              class="toolbar-btn"
              :aria-label="$t('common.zoomIn')"
              @click="zoomIn"
            >
              <ZoomIn :size="20" />
            </button>
            <button
              type="button"
              class="toolbar-btn"
              :aria-label="$t('common.zoomOut')"
              @click="zoomOut"
            >
              <ZoomOut :size="20" />
            </button>
            <button
              type="button"
              class="toolbar-btn"
              :aria-label="$t('common.resetZoom')"
              @click="resetZoom"
            >
              <Maximize2 :size="20" />
            </button>
            <span class="zoom-indicator">{{ Math.round(scale * 100) }}%</span>
          </div>

          <!-- 导航按钮 -->
          <button
            v-if="hasMultiple"
            type="button"
            class="lightbox-nav prev"
            :aria-label="$t('common.previous')"
            @click="prev"
          >
            <ChevronLeft :size="32" />
          </button>

          <!-- 媒体内容 -->
          <div class="lightbox-content" ref="contentRef" @wheel.prevent="handleWheel">
            <Transition :name="transitionName" mode="out-in">
              <div
                v-if="currentMedia"
                :key="currentMedia.id"
                class="media-wrapper"
                :style="mediaStyle"
                @mousedown="startDrag"
                @touchstart="startDrag"
              >
                <!-- 加载占位 -->
                <div v-if="!isLoaded" class="loading-placeholder">
                  <span class="spinner spinner-lg" />
                </div>

                <!-- 图片 -->
                <img
                  v-if="currentMedia.file_type === 'image'"
                  ref="mediaRef"
                  class="lightbox-media"
                  :class="{ 'is-loaded': isLoaded, 'is-dragging': isDragging }"
                  :src="fullSizeUrl"
                  :alt="alt"
                  draggable="false"
                  @load="onMediaLoad"
                />

                <!-- 视频 -->
                <VideoPlayer
                  v-else-if="currentMedia.file_type === 'video'"
                  ref="mediaRef"
                  class="lightbox-media is-loaded"
                  :src="fullSizeUrl"
                  playsinline
                  @ready="onMediaLoad"
                />
              </div>
            </Transition>
          </div>

          <button
            v-if="hasMultiple"
            type="button"
            class="lightbox-nav next"
            :aria-label="$t('common.next')"
            @click="next"
          >
            <ChevronRight :size="32" />
          </button>

          <!-- 计数器 -->
          <div v-if="hasMultiple" class="lightbox-counter">
            {{ currentIndex + 1 }} / {{ mediaList.length }}
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { X, ZoomIn, ZoomOut, Maximize2, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { getMediaStreamUrl } from '@/utils/mediaOptimizer'
import { useFocusTrap } from '@/composables/useFocusTrap'
import VideoPlayer from './VideoPlayer.vue'

export interface MediaItem {
  id: string
  file_type: string
  width?: number | null
  height?: number | null
}

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    mediaList: MediaItem[]
    initialIndex?: number
    alt?: string
  }>(),
  {
    initialIndex: 0,
    alt: '',
  }
)

const emit = defineEmits<{
  close: []
  'update:isOpen': [value: boolean]
}>()

const containerRef = ref<HTMLElement | null>(null)

// Focus Trap
const isLightboxOpen = computed(() => props.isOpen)
useFocusTrap(containerRef, isLightboxOpen, {
  autoFocus: true,
  restoreFocus: true,
  escapeDeactivates: true,
  onEscape: close,
  initialFocus: '.lightbox-close',
})

const currentIndex = ref(props.initialIndex)
const isLoaded = ref(false)
const transitionName = ref('lightbox-slide-left')

// 缩放和拖拽状态
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0, translateX: 0, translateY: 0 })

const MIN_SCALE = 0.5
const MAX_SCALE = 5
const ZOOM_STEP = 0.25

const currentMedia = computed(() => props.mediaList[currentIndex.value] ?? null)
const hasMultiple = computed(() => props.mediaList.length > 1)

const fullSizeUrl = computed(() => {
  if (!currentMedia.value) return ''
  return getMediaStreamUrl(currentMedia.value.id)
})

const mediaStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  cursor: scale.value > 1 ? (isDragging.value ? 'grabbing' : 'grab') : 'default',
}))

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      currentIndex.value = props.initialIndex
      resetZoom()
      isLoaded.value = false
      document.body.style.overflow = 'hidden'
      nextTick(() => containerRef.value?.focus())
    } else {
      document.body.style.overflow = ''
    }
  }
)

watch(
  () => props.initialIndex,
  (idx) => {
    if (props.isOpen) {
      currentIndex.value = idx
    }
  }
)

function close() {
  emit('update:isOpen', false)
  emit('close')
}

function prev() {
  if (!hasMultiple.value) return
  transitionName.value = 'lightbox-slide-right'
  isLoaded.value = false
  resetZoom()
  currentIndex.value = (currentIndex.value - 1 + props.mediaList.length) % props.mediaList.length
}

function next() {
  if (!hasMultiple.value) return
  transitionName.value = 'lightbox-slide-left'
  isLoaded.value = false
  resetZoom()
  currentIndex.value = (currentIndex.value + 1) % props.mediaList.length
}

function onMediaLoad() {
  isLoaded.value = true
}

function zoomIn() {
  scale.value = Math.min(scale.value + ZOOM_STEP, MAX_SCALE)
}

function zoomOut() {
  scale.value = Math.max(scale.value - ZOOM_STEP, MIN_SCALE)
  if (scale.value <= 1) {
    translateX.value = 0
    translateY.value = 0
  }
}

function resetZoom() {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

function handleWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
  const newScale = Math.max(MIN_SCALE, Math.min(scale.value + delta, MAX_SCALE))

  if (newScale !== scale.value) {
    scale.value = newScale
    if (newScale <= 1) {
      translateX.value = 0
      translateY.value = 0
    }
  }
}

function startDrag(e: MouseEvent | TouchEvent) {
  if (scale.value <= 1) return

  isDragging.value = true
  const point = 'touches' in e ? e.touches[0] : e
  if (!point) return

  dragStart.value = {
    x: point.clientX,
    y: point.clientY,
    translateX: translateX.value,
    translateY: translateY.value,
  }

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onDrag)
  document.addEventListener('touchend', stopDrag)
}

function onDrag(e: MouseEvent | TouchEvent) {
  if (!isDragging.value) return

  const point = 'touches' in e ? e.touches[0] : e
  if (!point) return

  const deltaX = point.clientX - dragStart.value.x
  const deltaY = point.clientY - dragStart.value.y

  translateX.value = dragStart.value.translateX + deltaX
  translateY.value = dragStart.value.translateY + deltaY
}

function stopDrag() {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
}

function handleKeydown(e: KeyboardEvent) {
  if (!props.isOpen) return

  switch (e.key) {
    case 'Escape':
      close()
      break
    case 'ArrowLeft':
      prev()
      break
    case 'ArrowRight':
      next()
      break
    case '+':
    case '=':
      zoomIn()
      break
    case '-':
      zoomOut()
      break
    case '0':
      resetZoom()
      break
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.lightbox-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  /* GPU 加速 */
  will-change: opacity;
  transform: translate3d(0, 0, 0);
}

.lightbox-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
}

.lightbox-close {
  position: absolute;
  top: var(--spacing-4);
  right: var(--spacing-4);
  z-index: 10;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: var(--radius-full);
  color: white;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.lightbox-toolbar {
  position: absolute;
  top: var(--spacing-4);
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2);
  background: rgba(0, 0, 0, 0.6);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(8px);
}

.toolbar-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: white;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.zoom-indicator {
  min-width: 48px;
  text-align: center;
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.8);
  font-variant-numeric: tabular-nums;
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: var(--radius-full);
  color: white;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-50%) scale(1.05);
}

.lightbox-nav.prev {
  left: var(--spacing-4);
}

.lightbox-nav.next {
  right: var(--spacing-4);
}

.lightbox-content {
  max-width: 100%;
  max-height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease-out;
  will-change: transform;
}

.loading-placeholder {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.lightbox-media {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  opacity: 0;
  transition: opacity 0.3s ease;
  user-select: none;
  -webkit-user-drag: none;
}

.lightbox-media.is-loaded {
  opacity: 1;
}

.lightbox-media.is-dragging {
  transition: none;
}

.lightbox-counter {
  position: absolute;
  bottom: var(--spacing-4);
  left: 50%;
  transform: translateX(-50%);
  padding: var(--spacing-2) var(--spacing-4);
  background: rgba(0, 0, 0, 0.6);
  border-radius: var(--radius-full);
  color: white;
  font-size: var(--text-sm);
  backdrop-filter: blur(8px);
}

/* 过渡动画 */
.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.25s ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

.lightbox-slide-left-enter-active,
.lightbox-slide-left-leave-active,
.lightbox-slide-right-enter-active,
.lightbox-slide-right-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.lightbox-slide-left-enter-from {
  opacity: 0;
  transform: translateX(50px) scale(0.95);
}

.lightbox-slide-left-leave-to {
  opacity: 0;
  transform: translateX(-50px) scale(0.95);
}

.lightbox-slide-right-enter-from {
  opacity: 0;
  transform: translateX(-50px) scale(0.95);
}

.lightbox-slide-right-leave-to {
  opacity: 0;
  transform: translateX(50px) scale(0.95);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .lightbox-toolbar {
    top: auto;
    bottom: calc(var(--spacing-4) + 40px);
  }

  .lightbox-nav {
    width: 40px;
    height: 40px;
  }

  .lightbox-nav.prev {
    left: var(--spacing-2);
  }

  .lightbox-nav.next {
    right: var(--spacing-2);
  }

  .lightbox-media {
    max-width: 100vw;
    max-height: 85vh;
  }
}
</style>
