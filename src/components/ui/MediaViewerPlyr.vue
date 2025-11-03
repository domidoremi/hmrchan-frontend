<template>
  <div v-if="show" class="media-viewer-overlay" @click="close">
    <div class="media-viewer" @click.stop>
      <!-- 工具栏 -->
      <div class="viewer-toolbar">
        <button class="viewer-btn toolbar-btn" @click="toggleFullscreen" :title="$t('common.fullscreen')">
          <Maximize :size="20" />
        </button>
        <button class="viewer-btn toolbar-btn" @click="downloadMedia" :title="$t('common.download')">
          <Download :size="20" />
        </button>
        <button class="viewer-btn toolbar-btn close-btn" @click="close" :aria-label="$t('aria.closeViewer')">
          <X :size="24" />
        </button>
      </div>

      <!-- 上一张按钮 -->
      <button
        v-if="mediaItems.length > 1"
        class="viewer-btn prev-btn"
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

        <!-- 视频 (使用 Plyr) -->
        <div v-else-if="currentMedia.type === 'video'" class="video-wrapper">
          <video
            ref="videoElement"
            class="plyr-video"
            playsinline
            controls
            :key="currentMedia.url"
          >
            <source :src="currentMedia.url" type="video/mp4" />
            <track
              v-if="currentMedia.subtitle"
              kind="captions"
              label="中文"
              srclang="zh"
              :src="currentMedia.subtitle"
              default
            />
          </video>
        </div>

        <div v-if="loading" class="loading-spinner" role="status" :aria-label="$t('aria.loading')">
          <div class="spinner"></div>
          <p>{{ $t('post.loadingMedia') }}</p>
        </div>
      </div>

      <!-- 下一张按钮 -->
      <button
        v-if="mediaItems.length > 1"
        class="viewer-btn next-btn"
        @click="next"
        :disabled="currentIndex === mediaItems.length - 1"
        :aria-label="$t('aria.nextImage')"
      >
        <ChevronRight :size="32" />
      </button>

      <!-- 媒体信息 -->
      <div class="media-info">
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Maximize, Download } from 'lucide-vue-next'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'

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

const { t } = useI18n()
const currentIndex = ref(props.initialIndex)
const loading = ref(true)
const zoom = ref(1)
const videoElement = ref<HTMLVideoElement | null>(null)
let player: Plyr | null = null

const currentMedia = computed(
  () => props.mediaItems[currentIndex.value] || { url: '', type: 'image' as const, subtitle: undefined },
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
      loading.value = currentMedia.value.type === 'video' ? false : true
      document.body.style.overflow = 'hidden'
      
      // 初始化 Plyr（如果是视频）
      if (currentMedia.value.type === 'video') {
        nextTick(() => {
          initPlyr()
        })
      }
    } else {
      document.body.style.overflow = ''
      destroyPlyr()
    }
  },
)

watch(currentIndex, () => {
  loading.value = currentMedia.value.type === 'video' ? false : true
  zoom.value = 1
  
  // 销毁旧的 Plyr 实例
  destroyPlyr()
  
  // 如果切换到视频，初始化新的 Plyr 实例
  if (currentMedia.value.type === 'video') {
    nextTick(() => {
      initPlyr()
    })
  }
})

const initPlyr = () => {
  if (videoElement.value && !player) {
    player = new Plyr(videoElement.value, {
      controls: [
        'play-large',
        'play',
        'progress',
        'current-time',
        'mute',
        'volume',
        'captions',
        'settings',
        'pip',
        'airplay',
        'fullscreen'
      ],
      settings: ['captions', 'quality', 'speed'],
      speed: { 
        selected: 1, 
        options: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] 
      },
      captions: { 
        active: true, 
        language: 'zh',
        update: true 
      },
      i18n: {
        restart: '重新播放',
        rewind: '快退 {seektime}s',
        play: '播放',
        pause: '暂停',
        fastForward: '快进 {seektime}s',
        seek: '跳转',
        seekLabel: '{currentTime} / {duration}',
        played: '已播放',
        buffered: '已缓冲',
        currentTime: '当前时间',
        duration: '总时长',
        volume: '音量',
        mute: '静音',
        unmute: '取消静音',
        enableCaptions: '开启字幕',
        disableCaptions: '关闭字幕',
        download: '下载',
        enterFullscreen: '全屏',
        exitFullscreen: '退出全屏',
        frameTitle: '视频播放器: {title}',
        captions: '字幕',
        settings: '设置',
        pip: '画中画',
        menuBack: '返回上级菜单',
        speed: '速度',
        normal: '正常',
        quality: '质量',
        loop: '循环',
        start: '开始',
        end: '结束',
        all: '全部',
        reset: '重置',
        disabled: '禁用',
        enabled: '启用',
      }
    })
    
    player.on('ready', () => {
      loading.value = false
    })
  }
}

const destroyPlyr = () => {
  if (player) {
    player.destroy()
    player = null
  }
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

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
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
  destroyPlyr()
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
}

.prev-btn:hover:not(:disabled) {
  transform: translateY(-50%) scale(1.1);
}

.next-btn {
  right: 40px;
  top: 50%;
  transform: translateY(-50%);
}

.next-btn:hover:not(:disabled) {
  transform: translateY(-50%) scale(1.1);
}

.media-container {
  position: relative;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-content-img {
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
  cursor: zoom-in;
  animation: scaleIn 0.3s ease;
}

.video-wrapper {
  width: 90vw;
  max-width: 1200px;
  animation: scaleIn 0.3s ease;
}

.plyr-video {
  width: 100%;
  max-height: 85vh;
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
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  padding: 12px 24px;
  border-radius: 30px;
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 24px;
  animation: slideUp 0.3s ease;
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

  .video-wrapper {
    max-width: 95vw;
  }

  .viewer-toolbar {
    top: 10px;
    right: 10px;
    gap: 8px;
  }

  .toolbar-btn {
    padding: 8px;
  }
}

/* Plyr 自定义样式 */
:deep(.plyr) {
  --plyr-color-main: #8b5cf6;
}

:deep(.plyr__control--overlaid) {
  background: rgba(139, 92, 246, 0.9);
}

:deep(.plyr--video .plyr__control.plyr__tab-focus),
:deep(.plyr--video .plyr__control:hover),
:deep(.plyr--video .plyr__control[aria-expanded=true]) {
  background: rgba(139, 92, 246, 0.9);
}

:deep(.plyr__menu__container) {
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(10px);
}
</style>
