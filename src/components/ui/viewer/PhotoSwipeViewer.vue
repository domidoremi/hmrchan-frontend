<template>
  <div></div>
</template>

<script setup lang="ts">
import { watch, onUnmounted } from 'vue'
import PhotoSwipe from 'photoswipe'
import Plyr from 'plyr'
import 'photoswipe/style.css'
import 'plyr/dist/plyr.css'

interface MediaItem {
  url: string
  type: 'image' | 'video'
  width?: number
  height?: number
  thumbnail?: string
  alt?: string
  mediaId?: string // 用于获取字幕
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
const plyrInstances: Map<string, Plyr> = new Map()

// 转换媒体项为PhotoSwipe数据源
const prepareDataSource = (items: MediaItem[]) => {
  console.log('[PhotoSwipeViewer] prepareDataSource - items:', items)

  return items.map((item, index) => {
    if (item.type === 'image') {
      const imageData: Record<string, string | number> = {
        src: item.url,
        alt: item.alt || '',
      }

      // 只有在有真实尺寸时才提供，否则让PhotoSwipe自动检测
      if (item.width && item.width > 0 && item.height && item.height > 0) {
        imageData.width = item.width
        imageData.height = item.height
        console.log(`[PhotoSwipeViewer] Image ${index}: ${item.width}x${item.height} (from MediaFile)`)
      } else {
        console.log(`[PhotoSwipeViewer] Image ${index}: auto-detect size`)
      }

      return imageData
    } else {
      // 视频：使用Plyr创建高级视频播放器
      // 不传递width/height，让PhotoSwipe使用viewport尺寸创建容器
      console.log(`[PhotoSwipeViewer] Video ${index}:`, item.url)
      const videoElement = createPlyrVideoElement(item.url, index, item.subtitles, item.mediaId)
      return {
        html: videoElement.outerHTML,
      }
    }
  })
}

// 创建Plyr视频元素
const createPlyrVideoElement = (
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
  video.className = 'pswp__plyr-video'
  video.playsInline = true
  video.controls = true
  video.crossOrigin = 'anonymous' // 允许加载跨域字幕

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
      // 构建字幕URL: /api/v1/media/{mediaId}/subtitles/{language}
      // 使用 encodeURIComponent 防止 URL 注入
      track.src = `https://api.momichan.xyz/api/v1/media/${encodeURIComponent(mediaId)}/subtitles/${encodeURIComponent(subtitle.language)}`
      track.default = idx === 0 // 第一个字幕设为默认
      video.appendChild(track)
      console.log(`[PhotoSwipeViewer] Added subtitle track: ${subtitle.label} (${subtitle.language})`)
    })
  }

  container.appendChild(video)

  return container
}

// 初始化Plyr实例
const initPlyrForVideo = (videoElement: HTMLVideoElement, url: string) => {
  if (plyrInstances.has(url)) return plyrInstances.get(url)!

  const player = new Plyr(videoElement, {
    iconUrl: '/plyr.svg',
    blankVideo: '', // 禁用 CDN blank视频，避免证书错误
    controls: [
      'play-large',
      'play',
      'progress',
      'current-time',
      'duration',
      'mute',
      'volume',
      'captions', // ⭐ 启用字幕按钮
      'settings',
      'fullscreen',
    ],
    settings: ['captions', 'quality', 'speed'], // ⭐ 设置中添加字幕选项
    speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
    // 移除固定ratio，让视频自适应实际宽高比
    fullscreen: { enabled: true, fallback: true, iosNative: true },
    autopause: true,
    captions: { active: true, language: 'auto', update: true }, // ⭐ 启用字幕
    i18n: {
      play: '播放',
      pause: '暂停',
      seek: '跳转',
      volume: '音量',
      mute: '静音',
      unmute: '取消静音',
      enterFullscreen: '全屏',
      exitFullscreen: '退出全屏',
      settings: '设置',
      speed: '倍速',
      normal: '正常',
      captions: '字幕',
      enabled: '启用',
      disabled: '禁用',
    },
  })

  plyrInstances.set(url, player)
  console.log('[PhotoSwipeViewer] Plyr initialized for:', url)

  return player
}

// 初始化PhotoSwipe
const initPhotoSwipe = () => {
  console.log('[PhotoSwipeViewer] initPhotoSwipe - show:', props.show, 'items:', props.items.length)

  if (!props.show || props.items.length === 0) {
    console.log('[PhotoSwipeViewer] Skipping init: show=', props.show, 'items.length=', props.items.length)
    return
  }

  const dataSource = prepareDataSource(props.items)
  console.log('[PhotoSwipeViewer] dataSource prepared:', dataSource)

  pswp = new PhotoSwipe({
    dataSource,
    index: props.initialIndex,

    // 基础UI配置
    showHideAnimationType: 'fade',
    bgOpacity: 0.95,
    spacing: 0.12,

    // 缩放配置 - 使用fit模式让图片完整显示
    initialZoomLevel: 'fit',
    secondaryZoomLevel: 1.5,
    maxZoomLevel: 4,

    // 启用PhotoSwipe手势（完整功能）
    allowPanToNext: true,      // 启用左右滑动切换图片
    pinchToClose: true,        // 启用捏合关闭
    closeOnVerticalDrag: true, // 启用垂直拖拽关闭

    // 启用鼠标滚轮缩放
    wheelToZoom: true,

    // 键盘导航
    arrowKeys: true,
    escKey: true,

    // 点击行为 - 修改为toggle-controls以保留按钮
    tapAction: 'toggle-controls',
    doubleTapAction: 'zoom',

    // 按钮标题
    closeTitle: '关闭',
    zoomTitle: '缩放',
    arrowPrevTitle: '上一个',
    arrowNextTitle: '下一个',
  })

  // 内容激活时初始化Plyr
  pswp.on('contentActivate', ({ content }) => {
    if (content.element) {
      const videoWrapper = content.element.querySelector('.pswp__video-wrapper') as HTMLElement
      const videoElement = content.element.querySelector('.pswp__plyr-video') as HTMLVideoElement

      if (videoElement && videoWrapper) {
        const url = videoWrapper.dataset.videoUrl
        if (url) {
          console.log('[PhotoSwipeViewer] Activating video:', url)
          initPlyrForVideo(videoElement, url)
        }
      }
    }
  })

  // 监听内容加载事件
  pswp.on('contentLoad', (e: { content?: { type?: string; data?: unknown } }) => {
    console.log('[PhotoSwipeViewer] contentLoad:', e.content?.type, e.content?.data)
  })

  pswp.on('contentLoadImage', (e: { content?: { data?: { src?: string } } }) => {
    console.log('[PhotoSwipeViewer] contentLoadImage:', e.content?.data?.src)
  })

  pswp.on('loadComplete', () => {
    console.log('[PhotoSwipeViewer] loadComplete - PhotoSwipe finished loading')
  })

  // 监听关闭事件
  pswp.on('close', () => {
    console.log('[PhotoSwipeViewer] Closing PhotoSwipe')
    emit('close')
  })

  // 监听slide切换，管理Plyr视频播放
  pswp.on('change', () => {
    const currentSlide = pswp?.currSlide
    if (currentSlide) {
      // 暂停所有Plyr实例
      plyrInstances.forEach((player) => {
        if (player.playing) {
          player.pause()
        }
      })
    }
  })

  // 监听destroy事件，清理Plyr实例
  pswp.on('destroy', () => {
    console.log('[PhotoSwipeViewer] Destroying all Plyr instances')
    plyrInstances.forEach((player) => {
      player.destroy()
    })
    plyrInstances.clear()
  })


  console.log('[PhotoSwipeViewer] Calling pswp.init()...')
  pswp.init()
  console.log('[PhotoSwipeViewer] pswp.init() completed, PhotoSwipe should be visible')
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

/* 确保内容自适应容器 */
.pswp__item {
  display: flex;
  align-items: center;
  justify-content: center;
}

.pswp__img {
  /* 移除width和height的!important，让PhotoSwipe动态设置尺寸 */
  object-fit: contain;
}

/* 暗色主题适配 */
[data-theme='dark'] .pswp {
  --pswp-bg: rgba(10, 10, 10, 0.98);
}

/* 视频容器样式 - 基础布局 */
.pswp__video-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

/* Plyr播放器基础样式 */
.pswp__video-wrapper :deep(.plyr) {
  width: 100%;
  height: 100%;
  --plyr-color-main: #8b5cf6;
}

/* Video元素基础样式 */
.pswp__video-wrapper :deep(video) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.pswp__video {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  /* 保持宽高比，完整显示 */
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  outline: none;
  cursor: pointer;

  /* 确保视频居中显示 */
  display: block;
  margin: 0 auto;
}

/* 视频控件样式优化 */
.pswp__video::-webkit-media-controls-panel {
  background: linear-gradient(to top,
      rgba(0, 0, 0, 0.85) 0%,
      rgba(0, 0, 0, 0.4) 50%,
      transparent 100%);
  border-radius: 0 0 8px 8px;
}

.pswp__video::-webkit-media-controls {
  filter: brightness(1.1);
}

.pswp__video::-webkit-media-controls-play-button,
.pswp__video::-webkit-media-controls-current-time-display,
.pswp__video::-webkit-media-controls-time-remaining-display,
.pswp__video::-webkit-media-controls-timeline,
.pswp__video::-webkit-media-controls-volume-slider {
  color: #fff;
}

/* Firefox视频控件 */
.pswp__video::-moz-media-controls {
  opacity: 1;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .pswp {
    --pswp-icon-stroke-width: 3px;
  }

  .pswp__video {
    border-radius: 4px;
  }

  .pswp__video-wrapper {
    padding: 0;
    background: transparent;
  }

  /* 移动端视频控件增大触摸区域 */
  .pswp__video::-webkit-media-controls-play-button {
    transform: scale(1.3);
  }
}

/* 全屏模式优化 */
.pswp__video:fullscreen {
  max-width: 100vw;
  max-height: 100vh;
  width: 100%;
  height: 100%;
  border-radius: 0;
}

.pswp__video:-webkit-full-screen {
  max-width: 100vw;
  max-height: 100vh;
  width: 100%;
  height: 100%;
  border-radius: 0;
}

.pswp__video:-moz-full-screen {
  max-width: 100vw;
  max-height: 100vh;
  width: 100%;
  height: 100%;
  border-radius: 0;
}

/* 自定义工具栏按钮样式 */
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

/* 加载动画优化 */
.pswp__preloader {
  width: 44px;
  height: 44px;
}

.pswp__icn {
  color: var(--pswp-icon-color);
}

/* 计数器样式优化 */
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
