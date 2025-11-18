<template>
  <div v-if="show" class="media-viewer-overlay" @click="close" @mousemove="onMouseMove">
    <div class="media-viewer" @click.stop>
      <!-- 工具栏 -->
      <div class="viewer-toolbar" :class="{ 'controls-hidden': !controlsVisible }">
        <button
          class="viewer-btn toolbar-btn"
          @click="toggleFullscreen"
          :title="$t('common.fullscreen')"
        >
          <Maximize :size="20" />
        </button>
        <button
          class="viewer-btn toolbar-btn"
          @click="downloadMedia"
          :title="$t('common.download')"
        >
          <Download :size="20" />
        </button>
        <button
          class="viewer-btn toolbar-btn close-btn"
          @click="close"
          :aria-label="$t('aria.closeViewer')"
        >
          <X :size="24" />
        </button>
      </div>

      <!-- 上一张按钮 -->
      <button
        v-if="mediaItems.length > 1"
        class="viewer-btn prev-btn"
        :class="{ 'controls-hidden': !controlsVisible }"
        @click="prev"
        :disabled="currentIndex === 0"
        :aria-label="$t('aria.previousImage')"
      >
        <ChevronLeft :size="32" />
      </button>

      <!-- 媒体内容 -->
      <div class="media-container">
        <!-- 图片 -->
        <img
          v-if="currentMedia.type === 'image'"
          :src="currentMedia.url"
          :alt="`${$t('post.image')} ${currentIndex + 1}`"
          @load="onMediaLoad"
          :style="imageStyle"
          class="media-content-img"
        />

        <!-- 视频 -->
        <video
          v-else-if="currentMedia.type === 'video'"
          controls
          preload="none"
          playsinline
          controlsList="nodownload"
          class="media-content-video"
          @loadedmetadata="onMediaLoad"
          @canplay="onMediaLoad"
          @error="onVideoError"
          ref="videoElement"
        >
          <source :src="currentMedia.url" type="video/mp4" />
          <track
            v-if="currentMedia.subtitle"
            kind="subtitles"
            :src="currentMedia.subtitle"
            srclang="zh"
            label="中文"
            default
          />
          {{ $t('post.videoNotSupported') }}
        </video>

        <div v-if="loading" class="loading-spinner" role="status" :aria-label="$t('aria.loading')">
          <div class="spinner"></div>
          <p>{{ $t('post.loadingMedia') }}</p>
        </div>
      </div>

      <!-- 下一张按钮 -->
      <button
        v-if="mediaItems.length > 1"
        class="viewer-btn next-btn"
        :class="{ 'controls-hidden': !controlsVisible }"
        @click="next"
        :disabled="currentIndex === mediaItems.length - 1"
        :aria-label="$t('aria.nextImage')"
      >
        <ChevronRight :size="32" />
      </button>

      <!-- 媒体信息 -->
      <div class="media-info" :class="{ 'controls-hidden': !controlsVisible }">
        <span>
          {{ currentIndex + 1 }} / {{ mediaItems.length }}
          <span class="media-type-badge">
            {{ currentMedia.type === 'video' ? $t('post.video') : $t('post.image') }}
          </span>
        </span>
        <!-- 图片缩放控制 -->
        <div v-if="currentMedia.type === 'image'" class="zoom-controls">
          <button @click="zoomOut" class="zoom-btn" :title="$t('common.zoomOut')">
            <ZoomOut :size="20" />
          </button>
          <span>{{ Math.round(zoom * 100) }}%</span>
          <button @click="zoomIn" class="zoom-btn" :title="$t('common.zoomIn')">
            <ZoomIn :size="20" />
          </button>
          <button @click="resetZoom" class="zoom-btn" :title="$t('common.reset')">
            <Maximize2 :size="20" />
          </button>
        </div>

        <!-- 视频倍速控制 -->
        <div v-if="currentMedia.type === 'video'" class="playback-controls">
          <button @click="showPlaybackMenu = !showPlaybackMenu" class="playback-btn">
            {{ playbackRate }}x
          </button>
          <div v-if="showPlaybackMenu" class="playback-menu">
            <button
              v-for="rate in playbackRates"
              :key="rate"
              @click="changePlaybackRate(rate)"
              :class="{ active: playbackRate === rate }"
              class="playback-option"
            >
              {{ rate }}x
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Maximize,
  Download,
} from 'lucide-vue-next'

interface MediaItem {
  url: string
  type: 'image' | 'video'
  subtitle?: string
}

interface Props {
  show: boolean
  mediaItems: MediaItem[]
  initialIndex?: number
}

const props = withDefaults(defineProps<Props>(), {
  initialIndex: 0,
})

const emit = defineEmits<{
  close: []
}>()

const currentIndex = ref(props.initialIndex)
const loading = ref(true)
const zoom = ref(1)
const videoElement = ref<HTMLVideoElement | null>(null)
const playbackRate = ref(1)
const showPlaybackMenu = ref(false)
const isFullscreen = ref(false)
const controlsVisible = ref(true)
let hideControlsTimer: ReturnType<typeof setTimeout> | null = null

const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

const currentMedia = computed(
  () =>
    props.mediaItems[currentIndex.value] || {
      url: '',
      type: 'image' as const,
      subtitle: undefined,
    },
)

const imageStyle = computed(() => ({
  transform: `scale(${zoom.value})`,
  transition: 'transform 0.3s ease',
}))

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      currentIndex.value = props.initialIndex
      zoom.value = 1
      // 对于视频且 preload="none"，不需要等待加载
      loading.value = currentMedia.value.type === 'video' ? false : true
      document.body.style.overflow = 'hidden'
      controlsVisible.value = true
      resetHideControlsTimer()
    } else {
      document.body.style.overflow = ''
      if (hideControlsTimer) {
        clearTimeout(hideControlsTimer)
      }
    }
  },
)

watch(currentIndex, () => {
  // 先显示loading
  loading.value = true
  zoom.value = 1
  showPlaybackMenu.value = false
  controlsVisible.value = true
  resetHideControlsTimer()

  // 视频：立即隐藏loading（因为preload="none"）
  // 图片：等待onMediaLoad事件
  if (currentMedia.value.type === 'video') {
    loading.value = false
    if (videoElement.value) {
      videoElement.value.load()
      videoElement.value.playbackRate = playbackRate.value
    }
  }
  // 图片会在@load事件中设置loading=false
})

// 当显示媒体查看器且当前是视频时，触发加载
watch(
  () => [props.show, currentMedia.value.type],
  ([show, type]) => {
    if (show && type === 'video' && videoElement.value) {
      // 延迟一帧以确保DOM已更新
      setTimeout(() => {
        if (videoElement.value) {
          videoElement.value.load()
        }
      }, 0)
    }
  },
)

// 鼠标移动时显示控件
const onMouseMove = () => {
  controlsVisible.value = true
  resetHideControlsTimer()
}

// 重置自动隐藏计时器
const resetHideControlsTimer = () => {
  if (hideControlsTimer) {
    clearTimeout(hideControlsTimer)
  }
  hideControlsTimer = setTimeout(() => {
    controlsVisible.value = false
  }, 3000) // 3秒后自动隐藏
}

const close = () => {
  emit('close')
}

const prev = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

const next = () => {
  if (currentIndex.value < props.mediaItems.length - 1) {
    currentIndex.value++
  }
}

const zoomIn = () => {
  zoom.value = Math.min(zoom.value + 0.25, 3)
}

const zoomOut = () => {
  zoom.value = Math.max(zoom.value - 0.25, 0.5)
}

const resetZoom = () => {
  zoom.value = 1
}

const changePlaybackRate = (rate: number) => {
  playbackRate.value = rate
  if (videoElement.value) {
    videoElement.value.playbackRate = rate
  }
  showPlaybackMenu.value = false
}

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

const downloadMedia = () => {
  const link = document.createElement('a')
  link.href = currentMedia.value.url
  link.download = `media-${currentIndex.value + 1}`
  link.click()
}

const onMediaLoad = () => {
  loading.value = false
}

const onVideoError = (event: Event) => {
  loading.value = false
  const video = event.target as HTMLVideoElement
  console.error('Video playback error:', {
    error: video.error,
    networkState: video.networkState,
    readyState: video.readyState,
    src: video.src,
  })

  // Show error message to user
  if (import.meta.env.DEV) {
    alert(
      `Video playback failed. Error code: ${video.error?.code}\nMessage: ${video.error?.message || 'Unknown error'}`,
    )
  }
}

// 键盘快捷键
const handleKeydown = (e: KeyboardEvent) => {
  if (!props.show) return

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
      if (currentMedia.value.type === 'image') zoomIn()
      break
    case '-':
      if (currentMedia.value.type === 'image') zoomOut()
      break
    case 'f':
    case 'F':
      toggleFullscreen()
      break
    case ' ':
      if (currentMedia.value.type === 'video' && videoElement.value) {
        e.preventDefault()
        if (videoElement.value.paused) {
          videoElement.value.play()
        } else {
          videoElement.value.pause()
        }
      }
      break
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', handleKeydown)
}

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown)
  }
  document.body.style.overflow = ''
})
</script>

<style scoped>
.media-viewer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.media-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewer-btn {
  position: absolute;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 12px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
}

.viewer-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.viewer-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* 工具栏 */
.viewer-toolbar {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 12px;
  z-index: 10;
  opacity: 1;
  transition: opacity 0.3s ease;
}

.viewer-toolbar.controls-hidden {
  opacity: 0;
  pointer-events: none;
}

.toolbar-btn {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.prev-btn {
  left: 40px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 1;
  transition:
    opacity 0.3s ease,
    transform 0.2s ease;
}

.prev-btn.controls-hidden {
  opacity: 0;
  pointer-events: none;
}

.prev-btn:hover:not(:disabled) {
  transform: translateY(-50%) scale(1.1);
}

.next-btn {
  right: 40px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 1;
  transition:
    opacity 0.3s ease,
    transform 0.2s ease;
}

.next-btn.controls-hidden {
  opacity: 0;
  pointer-events: none;
}

.next-btn:hover:not(:disabled) {
  transform: translateY(-50%) scale(1.1);
}

.media-container {
  position: relative;
  max-width: 100vw;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-content-img {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  cursor: zoom-in;
  animation: scaleIn 0.3s ease;
}

.media-content-video {
  width: 100%;
  height: auto;
  max-width: 100vw;
  max-height: 90vh;
  animation: scaleIn 0.3s ease;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

.loading-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-spinner p {
  color: white;
  font-size: 14px;
}

.media-info {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  padding: 12px 24px;
  border-radius: 12px;
  color: white;
  display: flex;
  align-items: center;
  gap: 20px;
  z-index: 10;
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 14px;
  opacity: 1;
  transition: opacity 0.3s ease;
}

.media-info.controls-hidden {
  opacity: 0;
  pointer-events: none;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }

  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.media-type-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  background: rgba(139, 92, 246, 0.8);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.zoom-btn {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
}

.zoom-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.1);
}

/* 视频倍速控制 */
.playback-controls {
  position: relative;
  display: flex;
  align-items: center;
}

.playback-btn {
  background: rgba(139, 92, 246, 0.9);
  border: none;
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
  min-width: 50px;
}

.playback-btn:hover {
  background: rgba(139, 92, 246, 1);
  transform: scale(1.05);
}

.playback-menu {
  position: absolute;
  bottom: calc(100% + 10px);
  right: 0;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 100px;
  animation: slideUp 0.2s ease;
}

.playback-option {
  background: transparent;
  border: none;
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  text-align: center;
  transition: all 0.2s ease;
}

.playback-option:hover {
  background: rgba(255, 255, 255, 0.1);
}

.playback-option.active {
  background: rgba(139, 92, 246, 0.8);
  font-weight: 600;
}

@media (max-width: 768px) {
  .prev-btn {
    left: 10px;
  }

  .next-btn {
    right: 10px;
  }

  .viewer-btn {
    padding: 8px;
  }

  .media-info {
    bottom: 10px;
    padding: 8px 16px;
    font-size: 12px;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .media-container {
    max-width: 100vw;
    max-height: 100vh;
  }

  .media-content-img,
  .media-content-video {
    max-width: 100vw;
    max-height: 100vh;
  }

  .viewer-toolbar {
    top: 10px;
    right: 10px;
    gap: 8px;
  }

  .toolbar-btn {
    padding: 8px;
  }

  .playback-menu {
    right: -8px;
  }
}
</style>
