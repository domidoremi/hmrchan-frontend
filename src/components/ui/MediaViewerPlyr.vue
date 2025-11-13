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

        <!-- 视频 (使用 Plyr) -->
        <div v-else-if="currentMedia.type === 'video'" class="video-wrapper">
          <video ref="videoElement" class="plyr-video" playsinline controls>
            <source :src="currentMedia.url" type="video/mp4" />

            <!-- 多语言字幕支持 -->
            <template v-if="currentMedia.subtitles && currentMedia.subtitles.length > 0">
              <track
                v-for="(sub, index) in currentMedia.subtitles"
                :key="`${currentMedia.url}-${sub.language}`"
                kind="captions"
                :label="sub.label"
                :srclang="sub.language"
                :src="`/api/media/${currentMedia.mediaId}/subtitle?language=${sub.language}`"
                :default="index === 0"
              />
            </template>

            <!-- 向后兼容：单字幕模式 -->
            <track
              v-else-if="currentMedia.subtitle"
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
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
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'

interface MediaItem {
  url: string
  type: 'image' | 'video'
  subtitle?: string // 向后兼容：单个字幕URL
  subtitles?: Array<{
    // 新增：多语言字幕
    language: string
    format: string
    label: string
  }>
  mediaId?: number // 媒体ID，用于生成字幕URL
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

let player: Plyr | null = null
const controlsVisible = ref(true)
let hideControlsTimer: ReturnType<typeof setTimeout> | null = null

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
      loading.value = currentMedia.value.type === 'video' ? false : true
      document.body.style.overflow = 'hidden'
      controlsVisible.value = true
      resetHideControlsTimer()

      // 初始化 Plyr（如果是视频）
      if (currentMedia.value.type === 'video') {
        nextTick(() => {
          initPlyr()
        })
      }
    } else {
      document.body.style.overflow = ''
      destroyPlyr()
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
  controlsVisible.value = true
  resetHideControlsTimer()

  // 销毁旧的 Plyr 实例
  destroyPlyr()

  // 如果切换到视频，重新加载视频源并初始化Plyr
  if (currentMedia.value.type === 'video') {
    nextTick(() => {
      if (videoElement.value) {
        // 更新video source而不是完全remount
        const source = videoElement.value.querySelector('source')
        if (source) {
          source.src = currentMedia.value.url
          videoElement.value.load()
        }
      }
      initPlyr()
    })
  }
  // 图片类型，等待onMediaLoad自动设置loading=false
})

const detectVideoOrientation = () => {
  if (!videoElement.value) return 'landscape'
  
  // 检测视频方向
  const checkOrientation = () => {
    if (videoElement.value) {
      const videoEl = videoElement.value
      const isVertical = videoEl.videoHeight > videoEl.videoWidth
      
      // 根据视频方向添加类名
      const wrapper = document.querySelector('.video-wrapper')
      if (wrapper) {
        if (isVertical) {
          wrapper.classList.add('vertical-video')
        } else {
          wrapper.classList.remove('vertical-video')
        }
      }
      
      return isVertical ? 'vertical' : 'landscape'
    }
    return 'landscape'
  }
  
  // 视频元数据加载完毕后检查方向
  videoElement.value.addEventListener('loadedmetadata', checkOrientation)
  
  return checkOrientation()
}

const initPlyr = () => {
  if (videoElement.value && !player) {
    // 调试日志：检查字幕
    const subtitleInfo = currentMedia.value.subtitles
      ? currentMedia.value.subtitles.map((s) => `${s.label} (${s.language})`).join(', ')
      : currentMedia.value.subtitle
        ? '单语言模式'
        : '无字幕'
    
    // 检测视频方向
    const videoOrientation = detectVideoOrientation()
    
    console.log('[Plyr] 初始化视频:', {
      url: currentMedia.value.url,
      orientation: videoOrientation,
      hasSubtitle: !!(currentMedia.value.subtitle || currentMedia.value.subtitles),
      subtitleUrl: currentMedia.value.subtitle,
      availableSubtitles: subtitleInfo,
      subtitleCount: currentMedia.value.subtitles?.length || (currentMedia.value.subtitle ? 1 : 0),
    })

    player = new Plyr(videoElement.value, {
      controls: [
        'play-large',
        'restart',
        'rewind',
        'play',
        'fast-forward',
        'progress',
        'current-time',
        'duration',
        'mute',
        'volume',
        'captions',
        'settings',
        'pip',
        'airplay',
        'fullscreen', // 全屏按钮放在最后，移动端更易访问
      ],
      settings: ['captions', 'quality', 'speed'],
      speed: {
        selected: 1,
        options: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
      },
      captions: {
        active: true,
        language: 'auto', // 自动检测字幕语言
        update: true,
      },
      // 移动端响应式配置
      ratio: '16:9',
      fullscreen: {
        enabled: true, // 明确启用全屏
        fallback: true, // 使用fallback确保所有浏览器支持
        iosNative: true, // iOS使用原生全屏
        container: undefined, // 使用默认容器（整个视频播放器）
      },
      clickToPlay: true, // 点击视频播放/暂停
      disableContextMenu: false, // 允许右键菜单
      debug: false, // 生产环境关闭调试
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
        speed: '倍速',
        normal: '正常',
        quality: '质量',
        loop: '循环',
        start: '开始',
        end: '结束',
        all: '全部',
        reset: '重置',
        disabled: '禁用',
        enabled: '启用',
      },
    })

    // 监听Plyr事件，调试字幕
    player.on('ready', () => {
      console.log('[Plyr] 播放器就绪')
      loading.value = false
      
      // 检查视频是否可播放
      if (videoElement.value) {
        videoElement.value.addEventListener('error', () => {
          console.error('[Plyr] 视频加载错误:', {
            error: videoElement.value?.error,
            src: currentMedia.value.url,
          })
          // ORB错误通常是CORS或路径问题
          if (videoElement.value?.error?.code === 4) {
            console.error('[Plyr] 网络错误 - 可能是CORS或URL路径问题')
          }
        })
      }

      // 检查字幕轨道
      if (player) {
        const videoEl = player.elements?.container?.querySelector('video')
        const tracks = videoEl?.textTracks
        if (tracks && tracks.length > 0) {
          console.log(`[Plyr] 字幕轨道数量: ${tracks.length}`)
          for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i]
            if (track) {
              console.log(`[Plyr] 字幕 ${i}:`, {
                kind: track.kind,
                label: track.label,
                language: track.language,
                mode: track.mode,
              })
            }
          }
        } else {
          console.log('[Plyr] 无字幕轨道')
        }
      }
    })

    player.on('captionsenabled', () => {
      console.log('[Plyr] 字幕已开启')
    })

    player.on('captionsdisabled', () => {
      console.log('[Plyr] 字幕已关闭')
    })
  }
}

const destroyPlyr = () => {
  if (player) {
    player.destroy()
    player = null
  }
}

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
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
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
  z-index: 100;
  flex-wrap: wrap;
  max-width: 200px;
  justify-content: flex-end;
  opacity: 1;
  transition: opacity 0.3s ease;
}

.viewer-toolbar.controls-hidden {
  opacity: 0;
  pointer-events: none;
}

.toolbar-btn {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.prev-btn {
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 50;
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
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 50;
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
  position: relative;
  width: min(92vw, 1200px);
  height: auto;
  max-height: 88vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(6px, 1.2vw, 16px);
  border-radius: 20px;
  background: rgba(12, 12, 16, 0.6);
  backdrop-filter: blur(16px);
  animation: scaleIn 0.3s ease;
  box-shadow:
    0 18px 48px -16px rgba(15, 23, 42, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.video-wrapper.vertical-video {
  width: min(70vw, 560px);
}

.plyr-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 16px;
  background: #000;
  max-height: calc(88vh - 80px);
  aspect-ratio: auto;
}

:deep(.plyr) {
  width: 100%;
  height: auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  --plyr-color-main: #1ea7fd;
  color: #fff;
}

:deep(.plyr__video-wrapper) {
  flex: 1 1 auto;
  height: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  overflow: hidden;
}

:deep(.plyr__controls) {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: clamp(8px, 1.4vw, 14px) clamp(12px, 2.4vw, 20px);
  background: rgba(10, 12, 20, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  margin: clamp(8px, 1.1vw, 14px);
  box-shadow:
    0 16px 30px -18px rgba(8, 12, 24, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  gap: clamp(6px, 1vw, 12px);
}

:deep(.plyr__controls .plyr__controls__item) {
  display: flex;
  align-items: center;
  margin: 0;
  flex: 0 0 auto;
  gap: clamp(2px, 0.6vw, 6px);
}

:deep(.plyr__controls .plyr__control) {
  border-radius: 12px;
  padding: 6px;
  margin: 0;
  flex: 0 0 auto;
  color: #fff;
  background: transparent;
  transition: background 0.2s ease, color 0.2s ease;
  min-width: 32px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
}

:deep(.plyr__controls .plyr__control svg) {
  fill: currentColor;
}

:deep(.plyr__controls .plyr__control:hover),
:deep(.plyr__controls .plyr__control:focus-visible) {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

:deep(.plyr__progress__container) {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0 clamp(4px, 1vw, 10px);
}

:deep(.plyr__volume) {
  flex: 0 0 clamp(64px, 10vw, 120px);
}

:deep(.plyr__progress input[type='range']) {
  accent-color: #1ea7fd;
}

:deep(.plyr__progress__buffer) {
  background: rgba(255, 255, 255, 0.2);
}

:deep(.plyr__time) {
  color: rgba(255, 255, 255, 0.82);
}

:deep(.plyr__tooltip) {
  background: rgba(10, 12, 20, 0.85);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

:deep(.plyr__control--overlaid) {
  background: rgba(30, 167, 253, 0.9);
  color: #fff;
  backdrop-filter: blur(10px);
  box-shadow: 0 18px 36px -18px rgba(30, 167, 253, 0.6);
}

/* 移动端适配 */
@media (max-width: 640px) {
  :deep(.plyr__controls) {
    padding: 6px 10px;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  :deep(.plyr__controls .plyr__control) {
    padding: 4px;
    min-width: 30px;
  }

  :deep(.plyr__time) {
    font-size: 11px;
  }
}

/* 竖屏视频的控制条适配 */
.vertical-video :deep(.plyr__controls) {
  flex-wrap: wrap;
  justify-content: center;
}

.vertical-video :deep(.plyr__progress__container) {
  order: -1;
  flex-basis: 100%;
  margin-bottom: 8px;
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
  z-index: 60;
  max-width: 90%;
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
  justify-content: center;
  transition: all 0.3s ease;
  min-width: 32px;
  min-height: 32px;
}

.zoom-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.1);
}

@media (max-width: 768px) {
  .prev-btn {
    left: 5px;
    padding: 8px;
  }

  .prev-btn svg {
    width: 24px;
    height: 24px;
  }

  .next-btn {
    right: 5px;
    padding: 8px;
  }

  .next-btn svg {
    width: 24px;
    height: 24px;
  }

  .viewer-btn {
    padding: 8px;
  }

  .media-info {
    bottom: 100px;
    padding: 8px 12px;
    font-size: 11px;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
    max-width: calc(100vw - 20px);
    left: 10px;
    right: 10px;
    transform: none;
    z-index: 60;
  }

  .media-type-badge {
    font-size: 10px;
    padding: 2px 6px;
  }

  .zoom-controls {
    gap: 8px;
    font-size: 11px;
  }

  .zoom-btn svg {
    width: 16px;
    height: 16px;
  }

  .video-wrapper {
    max-width: 100vw;
    width: 100vw;
  }

  .media-container {
    max-width: 100vw;
    max-height: 80vh;
  }

  .viewer-toolbar {
    top: safe-area-inset-top, 10px;
    right: 5px;
    gap: 6px;
    flex-direction: row;
    z-index: 100;
    max-width: calc(100vw - 20px);
  }

  .toolbar-btn {
    padding: 8px;
  }

  .toolbar-btn svg {
    width: 18px;
    height: 18px;
  }

  .close-btn {
    order: 3;
  }

  /* 移动端 Plyr 进度条修复 */
  :deep(.plyr__controls) {
    padding: 10px !important;
  }

  :deep(.plyr__progress) {
    margin-bottom: 8px !important;
  }

  :deep(.plyr__progress input[type='range']) {
    height: 8px !important;
  }

  :deep(.plyr__volume) {
    max-width: 60px !important;
    min-width: 60px !important;
  }
}

/* 极小屏幕优化 */
@media (max-width: 480px) {
  .viewer-toolbar {
    top: 5px;
    right: 5px;
    gap: 4px;
  }

  .toolbar-btn {
    padding: 6px;
  }

  .media-info {
    bottom: 90px;
    padding: 6px 10px;
    font-size: 10px;
  }

  .prev-btn,
  .next-btn {
    padding: 6px;
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
:deep(.plyr--video .plyr__control[aria-expanded='true']) {
  background: rgba(139, 92, 246, 0.9);
}

:deep(.plyr__menu__container) {
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(10px);
}

/* Plyr 控件响应式布局 - 防止按钮重叠和挤压 */
:deep(.plyr__controls) {
  display: flex !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 12px 10px !important;
  min-height: 54px !important;
  background: rgba(0, 0, 0, 0.85) !important; /* 更深的背景提高可读性 */
}

:deep(.plyr__controls__item) {
  margin: 0 !important;
  flex-shrink: 0 !important;
}

/* 播放/暂停按钮 */
:deep(.plyr__control--overlaid) {
  min-width: 80px !important;
  min-height: 80px !important;
}

/* 进度条 - 占据剩余空间 */
:deep(.plyr__progress) {
  flex: 1 1 auto !important;
  min-width: 100px !important;
}

/* 时间显示 - 固定宽度防止布局跳动 */
:deep(.plyr__time) {
  font-size: 13px !important;
  flex-shrink: 0 !important;
  min-width: 40px !important;
}

/* 音量控件 - 限制最大宽度 */
:deep(.plyr__volume) {
  flex: 0 1 auto !important;
  max-width: 100px !important;
  min-width: 60px !important;
}

/* 设置和字幕按钮 */
:deep(.plyr__menu) {
  margin-left: auto !important;
  flex-shrink: 0 !important;
}

/* 中等屏幕优化 (平板) */
@media (max-width: 1024px) {
  :deep(.plyr__controls) {
    gap: 3px !important;
    padding: 8px !important;
  }

  :deep(.plyr__volume) {
    max-width: 80px !important;
    min-width: 50px !important;
  }

  :deep(.plyr__time) {
    font-size: 12px !important;
  }
}

/* 小屏幕优化 (手机横屏) */
@media (max-width: 768px) {
  :deep(.plyr__controls) {
    gap: 4px !important;
    padding: 10px 8px !important;
    min-height: 48px !important;
  }

  :deep(.plyr__control--overlaid) {
    min-width: 70px !important;
    min-height: 70px !important;
  }

  /* 音量控件 - 移动端缩小但保持可用 */
  :deep(.plyr__volume) {
    max-width: 70px !important;
    min-width: 50px !important;
  }

  /* 时间显示 */
  :deep(.plyr__time) {
    font-size: 12px !important;
    min-width: 38px !important;
  }

  /* 进度条 */
  :deep(.plyr__progress) {
    min-width: 100px !important;
    flex: 1 1 auto !important;
  }

  /* 全屏按钮 - 确保在移动端可见且易于点击 */
  :deep([data-plyr='fullscreen']) {
    min-width: 44px !important;
    min-height: 44px !important;
    padding: 8px !important;
  }
}

/* 极小屏幕 (手机竖屏) - 简化控件但保留关键功能 */
@media (max-width: 480px) {
  :deep(.plyr__controls) {
    flex-wrap: wrap !important;
    gap: 6px !important;
    padding: 10px 6px !important;
  }

  /* 第一行：进度条占满宽度 */
  :deep(.plyr__progress) {
    order: 1;
    flex: 1 1 100% !important;
    margin-bottom: 6px !important;
  }

  /* 第二行：播放、音量、时间、全屏 */
  :deep(.plyr__controls__item:not(.plyr__progress)) {
    order: 2;
    flex-shrink: 0;
  }

  /* 大播放按钮 */
  :deep(.plyr__control--overlaid) {
    min-width: 64px !important;
    min-height: 64px !important;
  }

  /* 控制按钮统一大小 */
  :deep(.plyr__controls button) {
    min-width: 40px !important;
    min-height: 40px !important;
    padding: 6px !important;
  }

  /* 音量控件 */
  :deep(.plyr__volume) {
    max-width: 60px !important;
    min-width: 50px !important;
  }

  /* 时间显示 */
  :deep(.plyr__time) {
    font-size: 11px !important;
    min-width: 35px !important;
  }

  /* 全屏按钮 - 移动端最重要的按钮之一 */
  :deep([data-plyr='fullscreen']) {
    order: 3;
    min-width: 44px !important;
    min-height: 44px !important;
    padding: 8px !important;
    margin-left: auto !important; /* 推到最右边 */
  }

  /* 隐藏次要功能 (PiP, Airplay) 释放空间 */
  :deep([data-plyr='pip']),
  :deep([data-plyr='airplay']) {
    display: none !important;
  }
}
</style>
