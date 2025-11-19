<template>
  <div></div>
</template>

<script setup lang="ts">
import { watch, onUnmounted } from 'vue'
import PhotoSwipe from 'photoswipe'
import 'photoswipe/style.css'

interface MediaItem {
  url: string
  type: 'image' | 'video'
  width?: number
  height?: number
  thumbnail?: string
  alt?: string
  mediaId?: string
  subtitles?: Array<{
    language: string
    format: string
    label: string
  }> | null
}

interface Props {
  items: MediaItem[]
  initialIndex?: number
  show: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initialIndex: 0,
})

const emit = defineEmits<{
  close: []
}>()

let pswp: PhotoSwipe | null = null
const videoInstances: Map<string, HTMLVideoElement> = new Map()

// 图标常量
const ICONS = {
  play: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
  pause: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>',
  volume: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>',
  mute: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>',
  fullscreen: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>',
  exitFullscreen: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>',
}

// 格式化时间
const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// 转换媒体项为PhotoSwipe数据源
const prepareDataSource = (items: MediaItem[]) => {
  console.log('[PhotoSwipeViewer] prepareDataSource - items:', items)

  return items.map((item, index) => {
    if (item.type === 'image') {
      const imageData: Record<string, string | number> = {
        src: item.url,
        alt: item.alt || '',
      }

      if (item.width && item.width > 0 && item.height && item.height > 0) {
        imageData.width = item.width
        imageData.height = item.height
        console.log(`[PhotoSwipeViewer] Image ${index}: ${item.width}x${item.height}`)
      } else {
        console.log(`[PhotoSwipeViewer] Image ${index}: auto-detect size`)
      }

      return imageData
    } else {
      console.log(`[PhotoSwipeViewer] Video ${index}:`, item.url)
      const videoElement = createNativeVideoElement(item.url, index, item.subtitles, item.mediaId)
      return {
        html: videoElement.outerHTML,
      }
    }
  })
}

// 创建自定义视频播放器（完整UI控件）
const createNativeVideoElement = (
  url: string,
  index: number,
  subtitles?: Array<{ language: string; format: string; label: string }> | null,
  mediaId?: string,
): HTMLElement => {
  const container = document.createElement('div')
  container.className = 'pswp__video-wrapper'
  container.dataset.videoUrl = url
  container.dataset.videoIndex = String(index)

  // 1. 视频元素
  const video = document.createElement('video')
  video.className = 'pswp__native-video'
  video.playsInline = true
  video.controls = false // 禁用原生控件，使用自定义UI
  video.crossOrigin = 'anonymous'
  video.preload = 'metadata'

  const source = document.createElement('source')
  source.src = url
  source.type = 'video/mp4'
  video.appendChild(source)

  // 添加字幕轨道
  if (subtitles && subtitles.length > 0 && mediaId) {
    subtitles.forEach((subtitle, idx) => {
      const track = document.createElement('track')
      track.kind = 'subtitles'
      track.label = subtitle.label
      track.srclang = subtitle.language
      track.src = `https://api.momichan.xyz/api/v1/media/${encodeURIComponent(mediaId)}/subtitles/${encodeURIComponent(subtitle.language)}`
      track.default = idx === 0
      video.appendChild(track)
    })
  }

  container.appendChild(video)

  // 2. 自定义控制层 HTML
  const controlsHTML = `
    <div class="pswp__custom-controls">
      <div class="pswp__loading-spinner"></div>

      <button class="pswp__center-play-btn" aria-label="Play">
        ${ICONS.play}
      </button>

      <div class="pswp__controls-bar">
        <div class="pswp__progress-container">
          <div class="pswp__progress-track"></div>
          <div class="pswp__progress-fill"></div>
          <input type="range" class="pswp__progress-input" min="0" max="100" value="0" step="0.1">
        </div>

        <div class="pswp__controls-row">
          <div class="pswp__controls-left">
            <button class="pswp__control-btn pswp__play-pause-btn" aria-label="Play">
              ${ICONS.play}
            </button>

            <div class="pswp__volume-container">
              <button class="pswp__control-btn pswp__volume-btn" aria-label="Mute">
                ${ICONS.volume}
              </button>
              <div class="pswp__volume-slider-wrapper">
                <input type="range" class="pswp__volume-input" min="0" max="1" step="0.05" value="1">
              </div>
            </div>

            <div class="pswp__time-display">
              <span class="pswp__time-current">0:00</span>
              <span class="pswp__time-separator">/</span>
              <span class="pswp__time-duration">0:00</span>
            </div>
          </div>

          <div class="pswp__controls-right">
            <button class="pswp__control-btn pswp__fullscreen-btn" aria-label="Fullscreen">
              ${ICONS.fullscreen}
            </button>
          </div>
        </div>
      </div>
    </div>
  `

  const temp = document.createElement('div')
  temp.innerHTML = controlsHTML
  while (temp.firstChild) {
    container.appendChild(temp.firstChild)
  }

  return container
}

// 初始化自定义视频播放器逻辑
const initNativeVideoPlayer = (videoElement: HTMLVideoElement, container: HTMLElement, url: string) => {
  if (videoInstances.has(url)) return videoInstances.get(url)!

  console.log('[PhotoSwipeViewer] Initializing custom video player:', url)

  // 获取UI元素
  const controls = container.querySelector('.pswp__custom-controls') as HTMLElement
  const playPauseBtn = container.querySelector('.pswp__play-pause-btn') as HTMLElement
  const centerPlayBtn = container.querySelector('.pswp__center-play-btn') as HTMLElement
  const progressInput = container.querySelector('.pswp__progress-input') as HTMLInputElement
  const progressFill = container.querySelector('.pswp__progress-fill') as HTMLElement
  const timeCurrent = container.querySelector('.pswp__time-current') as HTMLElement
  const timeDuration = container.querySelector('.pswp__time-duration') as HTMLElement
  const volumeBtn = container.querySelector('.pswp__volume-btn') as HTMLElement
  const volumeInput = container.querySelector('.pswp__volume-input') as HTMLInputElement
  const fullscreenBtn = container.querySelector('.pswp__fullscreen-btn') as HTMLElement
  const loadingSpinner = container.querySelector('.pswp__loading-spinner') as HTMLElement

  let hideControlsTimeout: ReturnType<typeof setTimeout>
  let isDragging = false

  // 核心功能函数
  const togglePlay = () => {
    if (videoElement.paused || videoElement.ended) {
      videoElement.play().catch(err => console.error('Play failed:', err))
    } else {
      videoElement.pause()
    }
  }

  const updatePlayState = () => {
    const isPaused = videoElement.paused
    playPauseBtn.innerHTML = isPaused ? ICONS.play : ICONS.pause
    centerPlayBtn.style.opacity = isPaused ? '1' : '0'
    centerPlayBtn.style.pointerEvents = isPaused ? 'auto' : 'none'
  }

  const updateProgress = () => {
    if (isDragging) return
    const percent = (videoElement.currentTime / videoElement.duration) * 100 || 0
    progressInput.value = percent.toString()
    progressFill.style.width = `${percent}%`
    timeCurrent.textContent = formatTime(videoElement.currentTime)
  }

  const seek = (e: Event) => {
    const percent = parseFloat((e.target as HTMLInputElement).value)
    const time = (percent / 100) * videoElement.duration
    videoElement.currentTime = time
    progressFill.style.width = `${percent}%`
  }

  const updateVolumeUI = () => {
    const isMuted = videoElement.muted || videoElement.volume === 0
    volumeBtn.innerHTML = isMuted ? ICONS.mute : ICONS.volume
    volumeInput.value = isMuted ? '0' : videoElement.volume.toString()
  }

  const toggleMute = () => {
    videoElement.muted = !videoElement.muted
    updateVolumeUI()
  }

  const setVolume = (e: Event) => {
    const vol = parseFloat((e.target as HTMLInputElement).value)
    videoElement.volume = vol
    videoElement.muted = vol === 0
    updateVolumeUI()
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(console.error)
    } else {
      document.exitFullscreen().catch(console.error)
    }
  }

  const showControls = () => {
    controls.classList.remove('pswp__controls-hidden')
    container.style.cursor = 'auto'
    clearTimeout(hideControlsTimeout)

    if (!videoElement.paused) {
      hideControlsTimeout = setTimeout(() => {
        if (!isDragging) {
          controls.classList.add('pswp__controls-hidden')
          container.style.cursor = 'none'
        }
      }, 3000)
    }
  }

  // 事件监听
  playPauseBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePlay() })
  centerPlayBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePlay() })
  videoElement.addEventListener('click', togglePlay)

  videoElement.addEventListener('play', () => { updatePlayState(); showControls(); loadingSpinner.style.display = 'none' })
  videoElement.addEventListener('pause', () => { updatePlayState(); showControls() })
  videoElement.addEventListener('ended', () => { updatePlayState(); showControls() })
  videoElement.addEventListener('timeupdate', updateProgress)
  videoElement.addEventListener('loadedmetadata', () => {
    timeDuration.textContent = formatTime(videoElement.duration)
    loadingSpinner.style.display = 'none'
    if (videoElement.textTracks[0]) videoElement.textTracks[0].mode = 'showing'
  })
  videoElement.addEventListener('waiting', () => { loadingSpinner.style.display = 'block' })
  videoElement.addEventListener('playing', () => { loadingSpinner.style.display = 'none' })

  progressInput.addEventListener('input', (e) => {
    isDragging = true
    const percent = parseFloat((e.target as HTMLInputElement).value)
    progressFill.style.width = `${percent}%`
    const time = (percent / 100) * videoElement.duration
    timeCurrent.textContent = formatTime(time)
  })
  progressInput.addEventListener('change', (e) => { seek(e); isDragging = false })
  progressInput.addEventListener('click', (e) => e.stopPropagation())

  volumeBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMute() })
  volumeInput.addEventListener('input', setVolume)
  volumeInput.addEventListener('click', (e) => e.stopPropagation())

  fullscreenBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleFullscreen() })
  container.addEventListener('dblclick', toggleFullscreen)
  document.addEventListener('fullscreenchange', () => {
    const isFullscreen = !!document.fullscreenElement
    fullscreenBtn.innerHTML = isFullscreen ? ICONS.exitFullscreen : ICONS.fullscreen
    container.classList.toggle('is-fullscreen', isFullscreen)
  })

  container.addEventListener('mousemove', showControls)
  container.addEventListener('click', showControls)
  container.addEventListener('touchstart', showControls)

  updatePlayState()
  updateVolumeUI()

  videoInstances.set(url, videoElement)
  return videoElement
}

// 初始化PhotoSwipe
const initPhotoSwipe = () => {
  console.log('[PhotoSwipeViewer] initPhotoSwipe - show:', props.show, 'items:', props.items.length)

  if (!props.show || props.items.length === 0) {
    console.log('[PhotoSwipeViewer] Skipping init')
    return
  }

  const dataSource = prepareDataSource(props.items)

  pswp = new PhotoSwipe({
    dataSource,
    index: props.initialIndex,
    showHideAnimationType: 'fade',
    bgOpacity: 0.95,
    spacing: 0.12,
    initialZoomLevel: 'fit',
    secondaryZoomLevel: 1.5,
    maxZoomLevel: 4,
    allowPanToNext: true,
    pinchToClose: true,
    closeOnVerticalDrag: true,
    wheelToZoom: true,
    arrowKeys: true,
    escKey: true,
    tapAction: 'toggle-controls',
    doubleTapAction: 'zoom',
    closeTitle: '关闭',
    zoomTitle: '缩放',
    arrowPrevTitle: '上一个',
    arrowNextTitle: '下一个',
  })

  // 内容激活时初始化视频
  pswp.on('contentActivate', ({ content }) => {
    if (content.element) {
      const videoWrapper = content.element.querySelector('.pswp__video-wrapper') as HTMLElement
      const videoElement = content.element.querySelector('.pswp__native-video') as HTMLVideoElement

      if (videoElement && videoWrapper) {
        const url = videoWrapper.dataset.videoUrl
        if (url) {
          console.log('[PhotoSwipeViewer] Activating video:', url)
          initNativeVideoPlayer(videoElement, videoWrapper, url)
        }
      }
    }
  })

  pswp.on('close', () => {
    console.log('[PhotoSwipeViewer] Closing PhotoSwipe')
    emit('close')
  })

  // 监听slide切换，暂停所有视频
  pswp.on('change', () => {
    videoInstances.forEach((video) => {
      if (!video.paused) {
        video.pause()
      }
    })
  })

  // 监听destroy事件，清理视频实例
  pswp.on('destroy', () => {
    console.log('[PhotoSwipeViewer] Destroying all video instances')
    videoInstances.forEach((video) => {
      video.pause()
      video.src = ''
      video.load()
    })
    videoInstances.clear()
  })

  pswp.init()
  console.log('[PhotoSwipeViewer] PhotoSwipe initialized')
}

// 关闭PhotoSwipe
const closePhotoSwipe = () => {
  if (pswp) {
    pswp.close()
    pswp = null
  }
}

// 监听show属性变化
watch(
  () => props.show,
  (newValue) => {
    if (newValue) {
      initPhotoSwipe()
    } else {
      closePhotoSwipe()
    }
  },
  { immediate: true }
)

// 组件卸载时清理
onUnmounted(() => {
  closePhotoSwipe()
})
</script>

<style>
/* PhotoSwipe自定义样式 */
.pswp {
  --pswp-bg: rgba(0, 0, 0, 0.95);
  --pswp-icon-color: #fff;
  --pswp-icon-color-secondary: rgba(255, 255, 255, 0.7);
  --pswp-placeholder-bg: rgba(30, 30, 30, 0.5);
}

.pswp__item {
  display: flex;
  align-items: center;
  justify-content: center;
}

.pswp__img {
  object-fit: contain;
}

[data-theme='dark'] .pswp {
  --pswp-bg: rgba(10, 10, 10, 0.98);
}

/* ========================================
   自定义视频播放器样式
   现代化UI设计 | 深色/浅色模式 | 磨砂玻璃效果
   ======================================== */

/* 视频容器 */
.pswp__video-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  overflow: hidden;
}

/* 视频元素 */
.pswp__native-video {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  object-fit: contain !important;
  background: #000;
}

/* 字幕样式 */
.pswp__native-video::cue {
  background-color: rgba(0, 0, 0, 0.85);
  color: #fff;
  font-size: 1.1rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9);
  padding: 0.4em 0.8em;
  border-radius: 6px;
  line-height: 1.4;
}

/* 自定义控件UI */
.pswp__custom-controls {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
}

.pswp__custom-controls>* {
  pointer-events: auto;
}

/* 控件隐藏状态 */
.pswp__controls-hidden {
  opacity: 0;
}

.pswp__controls-hidden .pswp__controls-bar {
  transform: translateY(100%);
}

.pswp__controls-hidden .pswp__center-play-btn {
  opacity: 0 !important;
}

/* 加载动画 */
.pswp__loading-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: rgba(139, 92, 246, 0.9);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: none;
  z-index: 20;
}

@keyframes spin {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

/* 中央播放按钮 */
.pswp__center-play-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(12px);
  border: 3px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #fff;
  z-index: 15;
}

.pswp__center-play-btn:hover {
  background: rgba(139, 92, 246, 0.9);
  border-color: rgba(139, 92, 246, 1);
  transform: translate(-50%, -50%) scale(1.1);
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
}

.pswp__center-play-btn:active {
  transform: translate(-50%, -50%) scale(0.95);
}

.pswp__center-play-btn svg {
  width: 36px;
  height: 36px;
  margin-left: 4px;
}

/* 底部控制栏 */
.pswp__controls-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.7) 60%, transparent 100%);
  backdrop-filter: blur(16px);
  padding: 16px 20px 20px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 进度条容器 */
.pswp__progress-container {
  position: relative;
  width: 100%;
  height: 24px;
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  cursor: pointer;
}

.pswp__progress-track {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 2px;
  overflow: hidden;
}

.pswp__progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, rgba(139, 92, 246, 0.9), rgba(167, 139, 250, 1));
  border-radius: 2px;
  transition: width 0.1s linear;
}

.pswp__progress-input {
  position: absolute;
  width: 100%;
  height: 24px;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
}

.pswp__progress-input::-webkit-slider-thumb {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.pswp__progress-container:hover .pswp__progress-track {
  height: 6px;
}

.pswp__progress-container:hover .pswp__progress-fill::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* 控制按钮行 */
.pswp__controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pswp__controls-left,
.pswp__controls-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 控制按钮 */
.pswp__control-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.pswp__control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.pswp__control-btn:active {
  transform: scale(0.95);
}

.pswp__control-btn svg {
  width: 20px;
  height: 20px;
}

/* 音量控制 */
.pswp__volume-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pswp__volume-slider-wrapper {
  width: 0;
  overflow: hidden;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.pswp__volume-container:hover .pswp__volume-slider-wrapper {
  width: 80px;
}

.pswp__volume-input {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.pswp__volume-input::-webkit-slider-thumb {
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.pswp__volume-input::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: #fff;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

/* 时间显示 */
.pswp__time-display {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  font-variant-numeric: tabular-nums;
  user-select: none;
}

.pswp__time-separator {
  opacity: 0.6;
}

/* 全屏模式 */
.pswp__video-wrapper.is-fullscreen .pswp__controls-bar {
  padding: 20px 32px 24px;
}

.pswp__video-wrapper.is-fullscreen .pswp__control-btn {
  width: 48px;
  height: 48px;
}

.pswp__video-wrapper.is-fullscreen .pswp__center-play-btn {
  width: 100px;
  height: 100px;
}

.pswp__video-wrapper.is-fullscreen .pswp__center-play-btn svg {
  width: 48px;
  height: 48px;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .pswp {
    --pswp-icon-stroke-width: 3px;
  }

  .pswp__controls-bar {
    padding: 12px 16px 16px;
  }

  .pswp__control-btn {
    width: 44px;
    height: 44px;
  }

  .pswp__center-play-btn {
    width: 72px;
    height: 72px;
  }

  .pswp__center-play-btn svg {
    width: 32px;
    height: 32px;
  }

  .pswp__progress-track {
    height: 5px;
  }

  .pswp__volume-slider-wrapper {
    display: none;
  }

  .pswp__time-display {
    font-size: 13px;
  }

  .pswp__native-video::cue {
    font-size: 1rem;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .pswp__progress-container:active .pswp__progress-track {
    height: 8px;
  }

  .pswp__control-btn:active {
    background: rgba(255, 255, 255, 0.25);
  }
}

/* 浅色模式适配 */
@media (prefers-color-scheme: light) {
  .pswp__controls-bar {
    background: linear-gradient(to top, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.8) 60%, transparent 100%);
  }

  .pswp__center-play-btn {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(0, 0, 0, 0.1);
    color: #000;
  }

  .pswp__center-play-btn:hover {
    background: rgba(139, 92, 246, 0.95);
    color: #fff;
  }

  .pswp__control-btn {
    background: rgba(0, 0, 0, 0.08);
    color: #000;
  }

  .pswp__control-btn:hover {
    background: rgba(0, 0, 0, 0.15);
  }

  .pswp__time-display {
    color: #000;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
  }

  .pswp__progress-track {
    background: rgba(0, 0, 0, 0.15);
  }

  .pswp__volume-input {
    background: rgba(0, 0, 0, 0.15);
  }
}

/* 深色主题强制样式 */
[data-theme='dark'] .pswp__controls-bar {
  background: linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.75) 60%, transparent 100%);
}

/* 工具栏按钮样式 */
.pswp__button {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.pswp__button:hover {
  background: rgba(0, 0, 0, 0.5);
  transform: scale(1.1);
}

.pswp__button--close {
  background: rgba(239, 68, 68, 0.3);
}

.pswp__button--close:hover {
  background: rgba(239, 68, 68, 0.6);
}

.pswp__counter {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  margin: 12px;
}
</style>
