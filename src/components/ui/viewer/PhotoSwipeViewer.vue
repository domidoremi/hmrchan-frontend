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

// 转换媒体项为PhotoSwipe数据源
const prepareDataSource = (items: MediaItem[]) => {
  console.log('[PhotoSwipeViewer] prepareDataSource - items:', items)

  return items.map((item, index) => {
    if (item.type === 'image') {
      // PhotoSwipe需要明确的尺寸来正确显示图片
      // 如果有尺寸信息就使用，否则提供默认值
      const imageData: Record<string, string | number> = {
        src: item.url,
        alt: item.alt || '',
        // 提供默认尺寸，PhotoSwipe会根据实际图片调整
        width: item.width && item.width > 0 ? item.width : 1920,
        height: item.height && item.height > 0 ? item.height : 1080,
      }

      console.log(`[PhotoSwipeViewer] Image ${index}: width=${imageData.width}, height=${imageData.height}`,
        item.width && item.height ? '(from MediaFile)' : '(using defaults)')
      console.log(`[PhotoSwipeViewer] Image ${index} data:`, imageData)

      return imageData
    } else {
      // 视频：使用element属性代替html
      console.log(`[PhotoSwipeViewer] Video ${index}:`, item.url)
      return {
        element: createVideoElement(item.url),
        width: item.width || 1920,
        height: item.height || 1080,
      }
    }
  })
}

// 创建视频元素
const createVideoElement = (url: string): HTMLElement => {
  const container = document.createElement('div')
  container.className = 'pswp__video-wrapper'

  const video = document.createElement('video')
  video.className = 'pswp__video'
  video.controls = true
  video.playsInline = true
  video.preload = 'metadata'

  const source = document.createElement('source')
  source.src = url
  source.type = 'video/mp4'

  video.appendChild(source)
  container.appendChild(video)

  return container
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

    // 禁用可能导致路由跳转的手势
    allowPanToNext: false,  // 禁用左右滑动切换图片
    pinchToClose: false,    // 禁用捏合关闭
    closeOnVerticalDrag: false, // 禁用垂直拖拽关闭

    // 启用鼠标滚轮缩放
    wheelToZoom: true,

    // 键盘导航
    arrowKeys: true,
    escKey: true,

    // 点击行为
    tapAction: 'close',
    doubleTapAction: 'zoom',

    // 按钮标题
    closeTitle: '关闭',
    zoomTitle: '缩放',
    arrowPrevTitle: '上一个',
    arrowNextTitle: '下一个',
  })

  // 监听内容加载事件
  pswp.on('contentLoad', (e: any) => {
    console.log('[PhotoSwipeViewer] contentLoad:', e.content?.type, e.content?.data)
  })

  pswp.on('contentLoadImage', (e: any) => {
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

  // 监听slide切换，管理视频播放
  pswp.on('change', () => {
    const currentSlide = pswp?.currSlide
    if (currentSlide) {
      // 暂停所有视频
      const allVideos = document.querySelectorAll('.pswp__video')
      allVideos.forEach((video) => {
        (video as HTMLVideoElement).pause()
      })

      // 为当前视频添加交互
      const currentVideo = currentSlide.container?.querySelector('.pswp__video') as HTMLVideoElement
      if (currentVideo) {
        // 移除之前的事件监听器
        currentVideo.onclick = null

        // 添加点击切换播放/暂停
        currentVideo.onclick = (e) => {
          e.stopPropagation()
          if (currentVideo.paused) {
            currentVideo.play()
          } else {
            currentVideo.pause()
          }
        }

        // 可选：自动播放（根据需要启用）
        // currentVideo.play().catch(() => {
        //   // 自动播放失败时静默处理
        // })
      }
    }
  })

  // 关闭时暂停所有视频
  pswp.on('close', () => {
    const allVideos = document.querySelectorAll('.pswp__video')
    allVideos.forEach((video) => {
      (video as HTMLVideoElement).pause()
    })
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

/* 视频容器样式 */
.pswp__video-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  position: relative;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}

.pswp__video {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  outline: none;
  cursor: pointer;
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
