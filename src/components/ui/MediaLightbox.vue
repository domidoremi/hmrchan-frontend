<template>
  <Teleport to="body">
    <Transition name="lightbox-fade">
      <div
        v-if="isOpen"
        class="lightbox-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="$t('common.imageViewer')"
        @click.self="close"
      >
        <div
          ref="containerRef"
          class="lightbox-shell"
          tabindex="-1"
          @mousemove="handleMouseMove"
          @touchstart="handleTouchStart"
        >
          <header class="lightbox-header">
            <div class="lightbox-title">
              <span class="lightbox-label">{{ $t('common.imageViewer') }}</span>
              <span v-if="hasMultiple" class="lightbox-count">
                {{ currentIndex + 1 }} / {{ mediaList.length }}
              </span>
            </div>
            <div class="lightbox-header-actions">
              <button
                v-if="allowDownload && currentMedia?.file_type === 'image'"
                type="button"
                class="icon-btn"
                :aria-label="$t('common.download')"
                @click="downloadCurrent"
              >
                <AnimatedIcon name="explore" :fallback-icon="Download" size="sm" />
              </button>
              <button
                type="button"
                class="icon-btn"
                :aria-label="$t('common.close')"
                @click="close"
              >
                <AnimatedIcon name="sparkle" :fallback-icon="X" size="md" />
              </button>
            </div>
          </header>

          <Transition :name="transitionName" mode="out-in">
            <div
              v-if="currentMedia"
              :key="currentMediaKey"
              class="lightbox-content"
              ref="contentRef"
              @wheel.prevent="handleWheel"
            >
              <div
                class="media-stage"
                :style="mediaStyle"
                @mousedown="startDrag"
                @touchstart="handleStageTouchStart"
                @touchmove="handleStageTouchMove"
                @touchend="handleStageTouchEnd"
                @dblclick="toggleZoom"
              >
                <div v-if="!isLoaded && !hasError" class="media-loading">
                  <span class="spinner spinner-lg" />
                  <span class="media-loading-text">{{ $t('common.loading') }}</span>
                </div>
                <div class="media-hint" :class="{ 'is-visible': showHints }" aria-hidden="true">
                  <span>{{ $t('media.zoomHint') }}</span>
                  <span class="media-dot" />
                  <span>{{ $t('media.dragHint') }}</span>
                </div>

                <div v-if="hasError" class="media-error glass-card">
                  <AnimatedIcon name="sparkle" :fallback-icon="AlertTriangle" size="lg" />
                  <p>{{ $t('error.mediaLoadFailed') || $t('common.loadingFailed') }}</p>
                  <div class="media-error-actions">
                    <Button size="sm" variant="secondary" @click="retryLoad">
                      <AnimatedIcon name="loading" :fallback-icon="RefreshCw" size="sm" />
                      {{ $t('common.retry') }}
                    </Button>
                    <Button size="sm" variant="ghost" @click="close">
                      {{ $t('common.close') }}
                    </Button>
                  </div>
                </div>

                <img
                  v-if="currentMedia.file_type === 'image'"
                  :key="imageKey"
                  class="lightbox-media"
                  :class="{ 'is-loaded': isLoaded, 'is-dragging': isDragging }"
                  :src="fullSizeUrl"
                  :alt="alt"
                  draggable="false"
                  @load="onMediaLoad"
                  @error="onMediaError"
                />

                <VideoPlayer
                  v-else-if="currentMedia.file_type === 'video'"
                  class="lightbox-media is-loaded"
                  :src="fullSizeUrl"
                  :subtitles="currentMedia?.subtitles ?? null"
                  playsinline
                  @ready="onMediaLoad"
                />
              </div>
            </div>
          </Transition>

          <button
            v-if="hasMultiple"
            type="button"
            class="lightbox-nav prev"
            :aria-label="$t('common.previous')"
            @click="prev"
          >
            <AnimatedIcon name="explore" :fallback-icon="ChevronLeft" size="xl" />
          </button>
          <button
            v-if="hasMultiple"
            type="button"
            class="lightbox-nav next"
            :aria-label="$t('common.next')"
            @click="next"
          >
            <AnimatedIcon name="explore" :fallback-icon="ChevronRight" size="xl" />
          </button>

          <div v-if="showToolbar" class="lightbox-toolbar" :class="{ hidden: !controlsVisible }">
            <button
              type="button"
              class="icon-btn"
              :aria-label="$t('common.zoomOut')"
              @click="zoomOut"
            >
              <AnimatedIcon name="explore" :fallback-icon="ZoomOut" size="sm" />
            </button>
            <div class="zoom-slider">
              <input
                type="range"
                min="0.5"
                max="4"
                step="0.25"
                :value="scale"
                aria-label="Zoom"
                @input="onZoomInput"
              />
            </div>
            <button
              type="button"
              class="icon-btn"
              :aria-label="$t('common.zoomIn')"
              @click="zoomIn"
            >
              <AnimatedIcon name="explore" :fallback-icon="ZoomIn" size="sm" />
            </button>
            <button
              type="button"
              class="icon-btn"
              :aria-label="$t('common.resetZoom')"
              @click="resetZoom"
            >
              <AnimatedIcon name="loading" :fallback-icon="RotateCcw" size="sm" />
            </button>
            <span class="zoom-indicator">{{ Math.round(scale * 100) }}%</span>
          </div>
          <div class="lightbox-footer" :class="{ hidden: !controlsVisible }" aria-hidden="true">
            <span>{{ $t('media.shortcutHint') }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertTriangle,
  RefreshCw,
} from 'lucide-vue-next'
import { getMediaStreamUrl } from '@/utils/mediaOptimizer'
import { useFocusTrap } from '@/composables/useFocusTrap'
import VideoPlayer from './VideoPlayer.vue'
import Button from './Button.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import { lockBodyScroll, unlockBodyScroll } from '@/utils/bodyScrollLock'

export interface MediaItem {
  id: string
  file_type: string
  width?: number | null
  height?: number | null
  duration?: number | null
  subtitles?:
    | Array<{
        language: string
        format?: string | null
        label?: string | null
        url?: string | null
        file_path?: string | null
        path?: string | null
      }>
    | null
    | undefined
}

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    mediaList: MediaItem[]
    initialIndex?: number
    alt?: string
    allowDownload?: boolean
    showToolbar?: boolean
  }>(),
  {
    initialIndex: 0,
    alt: '',
    allowDownload: false,
    showToolbar: true,
  }
)

const emit = defineEmits<{
  close: []
  'update:isOpen': [value: boolean]
}>()

const containerRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)

const isLightboxOpen = computed(() => props.isOpen)
useFocusTrap(containerRef, isLightboxOpen, {
  autoFocus: true,
  restoreFocus: true,
  escapeDeactivates: true,
  onEscape: close,
  initialFocus: '.lightbox-shell',
})

const currentIndex = ref(props.initialIndex)
const isLoaded = ref(false)
const hasError = ref(false)
const imageReloadToken = ref(0)
const controlsVisible = ref(true)
const showHints = ref(true)
const transitionName = ref('lightbox-slide-left')

const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0, translateX: 0, translateY: 0 })

const swipeStart = ref<{ x: number; y: number } | null>(null)
const swipeOffsetX = ref(0)
const swipeOffsetY = ref(0)
const isSwiping = ref(false)

const MIN_SCALE = 0.5
const MAX_SCALE = 4
const ZOOM_STEP = 0.25
const CONTROLS_HIDE_DELAY = 2500
let controlsTimer: ReturnType<typeof setTimeout> | null = null
let hintsTimer: ReturnType<typeof setTimeout> | null = null

const currentMedia = computed(() => props.mediaList[currentIndex.value] ?? null)
const hasMultiple = computed(() => props.mediaList.length > 1)
const fullSizeUrl = computed(() => {
  if (!currentMedia.value) return ''
  return getMediaStreamUrl(currentMedia.value.id)
})

const currentMediaKey = computed(
  () => `${currentMedia.value?.id ?? 'unknown'}-${imageReloadToken.value}`
)
const imageKey = computed(() => `${currentMedia.value?.id ?? 'unknown'}-${imageReloadToken.value}`)

const mediaStyle = computed(() => {
  const x = translateX.value + (scale.value <= 1 ? swipeOffsetX.value : 0)
  const y = translateY.value + (scale.value <= 1 ? swipeOffsetY.value : 0)

  return {
    transform: `translate(${x}px, ${y}px) scale(${scale.value})`,
    cursor: scale.value > 1 ? (isDragging.value ? 'grabbing' : 'grab') : 'default',
    transition: isDragging.value || isSwiping.value ? 'none' : 'transform 180ms var(--ease-out)',
  }
})

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      currentIndex.value = props.initialIndex
      resetZoom()
      swipeOffsetX.value = 0
      swipeOffsetY.value = 0
      swipeStart.value = null
      isSwiping.value = false
      isLoaded.value = false
      hasError.value = false
      imageReloadToken.value += 1
      lockBodyScroll()
      nextTick(() => {
        containerRef.value?.focus()
        showControlsTemporarily()
        startHintsTimer()
      })
      prefetchAround(currentIndex.value)
    } else {
      unlockBodyScroll()
      clearControlsTimer()
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

watch(currentIndex, (idx) => {
  isLoaded.value = false
  hasError.value = false
  imageReloadToken.value += 1
  resetZoom()
  swipeOffsetX.value = 0
  swipeOffsetY.value = 0
  swipeStart.value = null
  isSwiping.value = false
  prefetchAround(idx)
  startHintsTimer()
})

function close() {
  emit('update:isOpen', false)
  emit('close')
}

function prev() {
  if (!hasMultiple.value) return
  transitionName.value = 'lightbox-slide-right'
  currentIndex.value = (currentIndex.value - 1 + props.mediaList.length) % props.mediaList.length
}

function next() {
  if (!hasMultiple.value) return
  transitionName.value = 'lightbox-slide-left'
  currentIndex.value = (currentIndex.value + 1) % props.mediaList.length
}

function onMediaLoad() {
  isLoaded.value = true
  hasError.value = false
}

function onMediaError() {
  hasError.value = true
}

function retryLoad() {
  hasError.value = false
  isLoaded.value = false
  imageReloadToken.value += 1
}

function zoomIn() {
  setScale(scale.value + ZOOM_STEP)
}

function zoomOut() {
  setScale(scale.value - ZOOM_STEP)
}

function resetZoom() {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

function setScale(value: number, anchor?: { x: number; y: number }) {
  const nextScale = Math.max(MIN_SCALE, Math.min(value, MAX_SCALE))
  if (nextScale === scale.value) return

  if (anchor && contentRef.value) {
    const rect = contentRef.value.getBoundingClientRect()
    const offsetX = anchor.x - (rect.left + rect.width / 2)
    const offsetY = anchor.y - (rect.top + rect.height / 2)
    const ratio = nextScale / scale.value
    translateX.value = (translateX.value - offsetX) * ratio + offsetX
    translateY.value = (translateY.value - offsetY) * ratio + offsetY
  }

  scale.value = nextScale
  if (scale.value <= 1) {
    translateX.value = 0
    translateY.value = 0
  }
}

function onZoomInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isNaN(value)) {
    setScale(value)
  }
}

function handleWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
  setScale(scale.value + delta, { x: e.clientX, y: e.clientY })
}

function toggleZoom(event: MouseEvent) {
  if (scale.value > 1) {
    resetZoom()
    return
  }
  setScale(2, { x: event.clientX, y: event.clientY })
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
  document.addEventListener('touchmove', onDrag, { passive: false })
  document.addEventListener('touchend', stopDrag)
}

function handleStageTouchStart(e: TouchEvent) {
  if (!props.isOpen) return

  // When zoomed, drag to pan.
  if (scale.value > 1) {
    startDrag(e)
    return
  }

  const point = e.touches[0]
  if (!point) return

  swipeStart.value = { x: point.clientX, y: point.clientY }
  swipeOffsetX.value = 0
  swipeOffsetY.value = 0
  isSwiping.value = false
}

function handleStageTouchMove(e: TouchEvent) {
  if (!props.isOpen) return
  if (!swipeStart.value) return
  if (scale.value > 1) return

  const point = e.touches[0]
  if (!point) return

  const dx = point.clientX - swipeStart.value.x
  const dy = point.clientY - swipeStart.value.y

  // Lock direction by intent.
  if (Math.abs(dx) > Math.abs(dy) && hasMultiple.value) {
    isSwiping.value = true
    swipeOffsetX.value = dx
    swipeOffsetY.value = 0
    e.preventDefault()
    return
  }

  // Swipe down to close (when not zoomed)
  if (Math.abs(dy) > Math.abs(dx)) {
    isSwiping.value = true
    swipeOffsetY.value = dy
    swipeOffsetX.value = 0
    e.preventDefault()
  }
}

function handleStageTouchEnd() {
  if (!props.isOpen) return
  if (scale.value > 1) return

  const dx = swipeOffsetX.value
  const dy = swipeOffsetY.value

  swipeStart.value = null
  isSwiping.value = false

  // Horizontal swipe => prev/next
  if (hasMultiple.value && Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy)) {
    if (dx < 0) {
      next()
    } else {
      prev()
    }
  }

  // Vertical swipe down => close
  if (dy > 120 && Math.abs(dy) > Math.abs(dx)) {
    close()
  }

  swipeOffsetX.value = 0
  swipeOffsetY.value = 0
}

function onDrag(e: MouseEvent | TouchEvent) {
  if (!isDragging.value) return
  if ('preventDefault' in e) {
    e.preventDefault()
  }
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

function showControlsTemporarily() {
  controlsVisible.value = true
  clearControlsTimer()
  controlsTimer = setTimeout(() => {
    controlsVisible.value = false
  }, CONTROLS_HIDE_DELAY)
}

function clearControlsTimer() {
  if (controlsTimer) {
    clearTimeout(controlsTimer)
    controlsTimer = null
  }
}

function handleMouseMove() {
  if (!props.isOpen) return
  showControlsTemporarily()
}

function handleTouchStart() {
  if (!props.isOpen) return
  showControlsTemporarily()
}

function startHintsTimer() {
  showHints.value = true
  if (hintsTimer) {
    window.clearTimeout(hintsTimer)
  }
  hintsTimer = window.setTimeout(() => {
    showHints.value = false
  }, 2200)
}

function downloadCurrent() {
  if (!currentMedia.value) return
  const link = document.createElement('a')
  link.href = fullSizeUrl.value
  link.download = `media-${currentMedia.value.id}`
  link.rel = 'noopener'
  link.click()
}

function prefetchImage(url: string) {
  const img = new Image()
  img.src = url
}

function prefetchAround(index: number) {
  if (!props.mediaList.length) return
  const nextIndex = (index + 1) % props.mediaList.length
  const prevIndex = (index - 1 + props.mediaList.length) % props.mediaList.length
  const nextItem = props.mediaList[nextIndex]
  const prevItem = props.mediaList[prevIndex]
  if (nextItem?.file_type === 'image') {
    prefetchImage(getMediaStreamUrl(nextItem.id))
  }
  if (prevItem?.file_type === 'image') {
    prefetchImage(getMediaStreamUrl(prevItem.id))
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  // 确保拖拽中的事件监听器被移除，防止内存泄漏
  stopDrag()
  unlockBodyScroll()
  clearControlsTimer()
  if (hintsTimer) {
    window.clearTimeout(hintsTimer)
    hintsTimer = null
  }
})
</script>

<style scoped>
.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(9, 9, 11, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.lightbox-shell {
  position: relative;
  width: min(96vw, 1400px);
  height: min(92vh, 900px);
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-2xl);
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: var(--shadow-2xl);
  overflow: hidden;
  outline: none;
}

.lightbox-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4) var(--spacing-5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.35);
}

.lightbox-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  color: rgba(255, 255, 255, 0.8);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.lightbox-label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.lightbox-count {
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.12);
  font-variant-numeric: tabular-nums;
}

.lightbox-header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.08);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast);
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.16);
  transform: translateY(-1px);
}

.lightbox-content {
  position: relative;
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  will-change: transform;
  transition: transform 0.12s ease-out;
}

.media-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-3);
  color: rgba(255, 255, 255, 0.75);
}

.media-loading-text {
  font-size: var(--text-sm);
}

.media-hint {
  position: absolute;
  bottom: var(--spacing-4);
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: 0.4rem 0.9rem;
  border-radius: var(--radius-full);
  background: rgba(0, 0, 0, 0.6);
  color: rgba(255, 255, 255, 0.8);
  font-size: var(--text-xs);
  border: 1px solid rgba(255, 255, 255, 0.12);
  opacity: 0;
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast);
  pointer-events: none;
}

.media-hint.is-visible {
  opacity: 1;
  transform: translateX(-50%) translateY(-4px);
}

.media-dot {
  width: 4px;
  height: 4px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.6);
}
.lightbox-media {
  max-width: 90vw;
  max-height: 78vh;
  object-fit: contain;
  opacity: 0;
  transition: opacity 0.35s ease;
  user-select: none;
  -webkit-user-drag: none;
}

.lightbox-media.is-loaded {
  opacity: 1;
}

.lightbox-media.is-dragging {
  transition: none;
}

.media-error {
  position: absolute;
  inset: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-6);
  color: var(--color-text-primary);
}

.media-error p {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.media-error-actions {
  display: flex;
  gap: var(--spacing-2);
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.4);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast);
}

.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-50%) scale(1.05);
}

.lightbox-nav.prev {
  left: var(--spacing-4);
}

.lightbox-nav.next {
  right: var(--spacing-4);
}

.lightbox-toolbar {
  position: absolute;
  bottom: var(--spacing-4);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-full);
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(12px);
  color: white;
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast);
}

.lightbox-toolbar.hidden {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
  pointer-events: none;
}

.lightbox-footer {
  position: absolute;
  bottom: var(--spacing-2);
  right: var(--spacing-4);
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.6);
  opacity: 1;
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast);
}

.lightbox-footer.hidden {
  opacity: 0;
  transform: translateY(6px);
  pointer-events: none;
}
.zoom-slider input[type='range'] {
  width: 120px;
  accent-color: var(--color-primary);
}

.zoom-indicator {
  min-width: 48px;
  text-align: center;
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.7);
  font-variant-numeric: tabular-nums;
}

.lightbox-fade-enter-active,
.lightbox-fade-leave-active {
  transition: opacity 0.25s ease;
}

.lightbox-fade-enter-from,
.lightbox-fade-leave-to {
  opacity: 0;
}

.lightbox-slide-left-enter-active,
.lightbox-slide-left-leave-active,
.lightbox-slide-right-enter-active,
.lightbox-slide-right-leave-active {
  transition: all 0.3s var(--ease-out);
}

.lightbox-slide-left-enter-from {
  opacity: 0;
  transform: translateX(24px) scale(0.98);
}

.lightbox-slide-left-leave-to {
  opacity: 0;
  transform: translateX(-24px) scale(0.98);
}

.lightbox-slide-right-enter-from {
  opacity: 0;
  transform: translateX(-24px) scale(0.98);
}

.lightbox-slide-right-leave-to {
  opacity: 0;
  transform: translateX(24px) scale(0.98);
}

@media (max-width: 768px) {
  .lightbox-shell {
    width: 100%;
    height: 100%;
    border-radius: 0;
  }

  .lightbox-toolbar {
    bottom: var(--spacing-3);
  }

  .lightbox-media {
    max-width: 100vw;
    max-height: 80vh;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lightbox-toolbar,
  .lightbox-nav,
  .media-stage {
    transition: none;
  }
}
</style>
