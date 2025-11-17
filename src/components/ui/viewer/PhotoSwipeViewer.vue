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
    return items.map((item) => {
        if (item.type === 'image') {
            return {
                src: item.url,
                width: item.width || 1920,
                height: item.height || 1080,
                alt: item.alt || '',
            }
        } else {
            // 视频项：使用自定义HTML内容
            return {
                html: `
          <div class="pswp__video-container">
            <video
              controls
              playsinline
              class="pswp__video"
              style="max-width: 100%; max-height: 100%; width: auto; height: auto;"
            >
              <source src="${item.url}" type="video/mp4">
              Your browser does not support the video tag.
            </video>
          </div>
        `,
                width: item.width || 1920,
                height: item.height || 1080,
            }
        }
    })
}

// 初始化PhotoSwipe
const initPhotoSwipe = () => {
    if (!props.show || props.items.length === 0) return

    const dataSource = prepareDataSource(props.items)

    pswp = new PhotoSwipe({
        dataSource,
        index: props.initialIndex,

        // UI配置
        showHideAnimationType: 'zoom',
        bgOpacity: 0.95,
        spacing: 0.1,
        allowPanToNext: true,
        loop: false,

        // 缩放配置
        initialZoomLevel: 'fit',
        secondaryZoomLevel: 2,
        maxZoomLevel: 4,

        // 触摸手势
        pinchToClose: true,
        closeOnVerticalDrag: true,

        // 键盘导航
        escKey: true,
        arrowKeys: true,

        // 工具栏按钮
        closeTitle: '关闭',
        zoomTitle: '缩放',
        arrowPrevTitle: '上一个',
        arrowNextTitle: '下一个',

        // 鼠标滚轮缩放
        wheelToZoom: true,

        // 点击背景关闭
        tapAction: 'close',
        doubleTapAction: 'zoom',

        // Padding
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
    })

    // 监听关闭事件
    pswp.on('close', () => {
        emit('close')
    })

    // 监听视频元素，自动播放当前视频
    pswp.on('change', () => {
        const currentSlide = pswp?.currSlide
        if (currentSlide) {
            // 暂停所有视频
            const allVideos = document.querySelectorAll('.pswp__video')
            allVideos.forEach((video) => {
                ; (video as HTMLVideoElement).pause()
            })

            // 播放当前视频（如果是视频）
            const currentVideo = currentSlide.container?.querySelector('.pswp__video') as HTMLVideoElement
            if (currentVideo) {
                currentVideo.play()
            }
        }
    })

    pswp.init()
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

/* 暗色主题适配 */
[data-theme='dark'] .pswp {
    --pswp-bg: rgba(10, 10, 10, 0.98);
}

/* 视频容器样式 */
.pswp__video-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 20px;
}

.pswp__video {
    max-width: 100%;
    max-height: 100%;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

/* 移动端优化 */
@media (max-width: 768px) {
    .pswp {
        --pswp-icon-stroke-width: 3px;
    }

    .pswp__video-container {
        padding: 10px;
    }
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
