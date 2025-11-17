<template>
    <div class="video-player-wrapper">
        <video ref="videoRef" class="video-player" :poster="poster" playsinline>
            <source :src="src" :type="mimeType" />

            <!-- 字幕轨道 -->
            <track v-for="(subtitle, index) in subtitles" :key="index" :kind="subtitle.kind || 'subtitles'"
                :src="subtitle.src" :srclang="subtitle.language" :label="subtitle.label" :default="index === 0" />

            您的浏览器不支持视频播放。
        </video>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'

interface Subtitle {
    src: string
    language: string
    label: string
    kind?: 'subtitles' | 'captions'
}

interface Props {
    src: string
    poster?: string
    subtitles?: Subtitle[]
    autoplay?: boolean
    muted?: boolean
    controls?: boolean
    quality?: number[]
}

const props = withDefaults(defineProps<Props>(), {
    autoplay: false,
    muted: false,
    controls: true,
    quality: () => [1080, 720, 480, 360],
})

const emit = defineEmits<{
    play: []
    pause: []
    ended: []
    timeupdate: [currentTime: number]
    ready: []
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
let player: Plyr | null = null

// 推断MIME类型
const mimeType = computed(() => {
    const url = props.src.toLowerCase()
    if (url.includes('.mp4') || url.endsWith('/stream')) return 'video/mp4'
    if (url.includes('.webm')) return 'video/webm'
    if (url.includes('.ogg')) return 'video/ogg'
    return 'video/mp4' // 默认
})

// 初始化播放器
onMounted(() => {
    if (!videoRef.value) return

    // Plyr配置
    player = new Plyr(videoRef.value, {
        iconUrl: '/plyr.svg', // 使用本地图标，避免CDN证书问题
        controls: [
            'play-large', // 中央大播放按钮
            'play', // 播放/暂停
            'progress', // 进度条
            'current-time', // 当前时间
            'duration', // 总时长
            'mute', // 静音
            'volume', // 音量
            'captions', // 字幕
            'settings', // 设置
            'pip', // 画中画
            'airplay', // AirPlay
            'fullscreen', // 全屏
        ],
        settings: ['captions', 'quality', 'speed'],
        quality: {
            default: 720,
            options: props.quality,
            forced: true,
            onChange: (quality: number) => {
                console.log(`[VideoPlayer] Quality changed to ${quality}p`)
            },
        },
        speed: {
            selected: 1,
            options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
        },
        i18n: {
            restart: '重新播放',
            rewind: '快退 {seektime}秒',
            play: '播放',
            pause: '暂停',
            fastForward: '快进 {seektime}秒',
            seek: '定位',
            seekLabel: '{currentTime} / {duration}',
            played: '已播放',
            buffered: '已缓冲',
            currentTime: '当前时间',
            duration: '总时长',
            volume: '音量',
            mute: '静音',
            unmute: '取消静音',
            enableCaptions: '显示字幕',
            disableCaptions: '隐藏字幕',
            download: '下载',
            enterFullscreen: '全屏',
            exitFullscreen: '退出全屏',
            frameTitle: '{title}的播放器',
            captions: '字幕',
            settings: '设置',
            pip: '画中画',
            menuBack: '返回上级菜单',
            speed: '播放速度',
            normal: '正常',
            quality: '画质',
            loop: '循环',
        },
        autoplay: props.autoplay,
        muted: props.muted,
        clickToPlay: true,
        hideControls: true,
        resetOnEnd: false,
        keyboard: {
            focused: true,
            global: false,
        },
        tooltips: {
            controls: true,
            seek: true,
        },
        captions: {
            active: true,
            language: 'auto',
            update: true,
        },
    })

    // 事件监听
    player.on('play', () => emit('play'))
    player.on('pause', () => emit('pause'))
    player.on('ended', () => emit('ended'))
    player.on('timeupdate', () => {
        if (player) {
            emit('timeupdate', player.currentTime)
        }
    })
    player.on('ready', () => emit('ready'))

    console.log('[VideoPlayer] Plyr initialized')
})

// 监听src变化
watch(
    () => props.src,
    (newSrc) => {
        if (player && videoRef.value) {
            player.source = {
                type: 'video',
                sources: [
                    {
                        src: newSrc,
                        type: mimeType.value,
                    },
                ],
                tracks: props.subtitles?.map((sub, index) => ({
                    kind: sub.kind || 'subtitles',
                    label: sub.label,
                    srclang: sub.language,
                    src: sub.src,
                    default: index === 0,
                })) || [],
            }
        }
    }
)

// 清理
onBeforeUnmount(() => {
    if (player) {
        player.destroy()
        player = null
        console.log('[VideoPlayer] Plyr destroyed')
    }
})

// 暴露播放器控制方法
defineExpose({
    play: () => player?.play(),
    pause: () => player?.pause(),
    stop: () => player?.stop(),
    getCurrentTime: () => player?.currentTime || 0,
    setCurrentTime: (time: number) => {
        if (player) player.currentTime = time
    },
    getVolume: () => player?.volume || 1,
    setVolume: (volume: number) => {
        if (player) player.volume = volume
    },
    getPlayer: () => player,
})
</script>

<script lang="ts">
import { computed } from 'vue'

export default {
    name: 'VideoPlayer',
}
</script>

<style scoped>
.video-player-wrapper {
    position: relative;
    width: 100%;
    background: #000;
    border-radius: var(--radius-lg);
    overflow: hidden;
}

.video-player {
    width: 100%;
    height: auto;
    display: block;
}
</style>

<style>
/* Plyr自定义样式 */
.plyr {
    --plyr-color-main: var(--color-primary);
    --plyr-video-background: #000;
    --plyr-menu-background: rgba(0, 0, 0, 0.9);
    --plyr-menu-color: #fff;
    border-radius: var(--radius-lg);
}

/* 控制栏样式 */
.plyr--video .plyr__controls {
    background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, transparent 100%);
    padding: var(--spacing-md) var(--spacing-lg);
}

/* 播放按钮 */
.plyr__control--overlaid {
    background: var(--color-primary);
    border-radius: 50%;
    opacity: 0.9;
    transition: all 0.3s ease;
}

.plyr__control--overlaid:hover {
    background: var(--color-primary-dark);
    opacity: 1;
    transform: scale(1.1);
}

/* 进度条 */
.plyr__progress input[type='range'] {
    color: var(--color-primary);
}

.plyr__progress__buffer {
    background: rgba(255, 255, 255, 0.25);
}

/* 字幕样式 */
.plyr__captions {
    font-size: var(--text-base);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}

/* 响应式 */
@media (max-width: 768px) {
    .plyr--video .plyr__controls {
        padding: var(--spacing-sm) var(--spacing-md);
    }

    .plyr__captions {
        font-size: var(--text-sm);
    }
}
</style>
