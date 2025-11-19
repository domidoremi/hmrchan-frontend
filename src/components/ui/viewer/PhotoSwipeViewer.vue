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

// 创建原生视频元素
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

  const video = document.createElement('video')
  video.className = 'pswp__native-video'
  video.playsInline = true
  video.controls = true
  video.crossOrigin = 'anonymous'
  video.style.width = '100%'
  video.style.height = '100%'
  video.style.objectFit = 'contain'

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
      console.log(`[PhotoSwipeViewer] Added subtitle track: ${subtitle.label} (${subtitle.language})`)
    })
  }

  container.appendChild(video)

  return container
}

// 初始化原生视频播放器
const initNativeVideoPlayer = (videoElement: HTMLVideoElement, url: string) => {
  if (videoInstances.has(url)) return videoInstances.get(url)!

  console.log('[PhotoSwipeViewer] Native video player initialized for:', url)
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
          initNativeVideoPlayer(videoElement, url)
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

/* 视频容器样式 */
.pswp__video-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

/* 原生视频元素 - 完全自适应 */
.pswp__native-video {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  object-fit: contain !important;
  background: #000;
}

/* 视频控件样式优化 */
.pswp__native-video::-webkit-media-controls-panel {
  background: linear-gradient(to top,
      rgba(0, 0, 0, 0.85) 0%,
      rgba(0, 0, 0, 0.4) 50%,
      transparent 100%);
}

/* 移动端优化 */
@media (max-width: 768px) {
  .pswp {
    --pswp-icon-stroke-width: 3px;
  }

  .pswp__native-video::-webkit-media-controls-play-button {
    transform: scale(1.3);
  }
}

/* 全屏模式 */
.pswp__native-video:fullscreen {
  max-width: 100vw;
  max-height: 100vh;
  width: 100%;
  height: 100%;
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
