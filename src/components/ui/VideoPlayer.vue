<template>
  <div
    ref="playerElement"
    class="video-player"
    :class="{ 'is-fullscreen': isFullscreen, 'is-buffering': isBuffering }"
    tabindex="0"
    role="group"
    :aria-label="$t('video.player')"
    @mousemove="handleMouseMove"
  >
    <video
      ref="videoRef"
      class="video-element"
      :src="src"
      :poster="poster"
      :playsinline="playsinline"
      :loop="loop"
      :preload="preload"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
      @volumechange="onVolumeChange"
      @waiting="isBuffering = true"
      @canplay="isBuffering = false"
      @click="togglePlay"
    />

    <!-- 控制栏 -->
    <div
      class="controls"
      :class="{ 'is-visible': showControls || !isPlaying }"
      @mouseenter="showControls = true"
      @mouseleave="showControls = false"
    >
      <!-- 顶部渐变 -->
      <div class="controls-gradient controls-gradient--top" />

      <!-- 底部控制区 -->
      <div class="controls-bottom">
        <!-- 进度条 -->
        <div
          class="progress-container"
          :class="{ 'is-seeking': isSeeking }"
          @click="seek"
          @mousedown.prevent="startSeekDrag"
          @touchstart.prevent="startSeekDrag"
        >
          <div class="progress-bar">
            <div class="progress-buffered" :style="{ width: `${bufferedPercent}%` }" />
            <div class="progress-played" :style="{ width: `${playedPercent}%` }" />
            <div class="progress-thumb" :style="{ left: `${playedPercent}%` }" />
          </div>
        </div>

        <!-- 控制按钮 -->
        <div class="controls-row">
          <!-- 左侧 -->
          <div class="controls-group">
            <button
              type="button"
              class="control-btn"
              :aria-label="isPlaying ? $t('video.pause') : $t('video.play')"
              @click="togglePlay"
            >
              <Play v-if="!isPlaying" :size="20" />
              <Pause v-else :size="20" />
            </button>

            <div class="time-display">
              <span class="time-current">{{ formatTime(currentTime) }}</span>
              <span class="time-separator">/</span>
              <span class="time-duration">{{ formatTime(duration) }}</span>
            </div>
          </div>

          <!-- 右侧 -->
          <div class="controls-group">
            <!-- 音量 -->
            <div class="volume-control">
              <button
                type="button"
                class="control-btn"
                :aria-label="isMuted ? $t('video.unmute') : $t('video.mute')"
                @click="toggleMute"
              >
                <Volume2 v-if="!isMuted && volume > 0.5" :size="20" />
                <Volume1 v-else-if="!isMuted && volume > 0" :size="20" />
                <VolumeX v-else :size="20" />
              </button>
              <div class="volume-slider-container">
                <input
                  type="range"
                  class="volume-slider"
                  min="0"
                  max="100"
                  :value="volume * 100"
                  @input="setVolume"
                />
              </div>
            </div>

            <!-- 设置菜单 -->
            <div ref="settingsMenuRef" class="settings-menu" @click.stop>
              <button
                type="button"
                class="control-btn"
                :aria-label="$t('video.settings')"
                @click="showSettings = !showSettings"
              >
                <Settings :size="20" />
              </button>
              <div v-if="showSettings" class="settings-panel glass-card">
                <!-- 播放速度 -->
                <div class="settings-section">
                  <div class="settings-label">{{ $t('video.playbackSpeed') }}</div>
                  <div class="settings-options">
                    <button
                      v-for="speed in playbackSpeeds"
                      :key="speed"
                      type="button"
                      class="settings-option"
                      :class="{ active: playbackRate === speed }"
                      @click="setPlaybackRate(speed)"
                    >
                      {{ speed }}x
                    </button>
                  </div>
                </div>

                <!-- 画质（如果支持） -->
                <div v-if="qualities.length > 1" class="settings-section">
                  <div class="settings-label">{{ $t('video.quality') }}</div>
                  <div class="settings-options">
                    <button
                      v-for="quality in qualities"
                      :key="quality"
                      type="button"
                      class="settings-option"
                      :class="{ active: currentQuality === quality }"
                      @click="setQuality(quality)"
                    >
                      {{ quality }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 画中画 -->
            <button
              v-if="supportsPiP"
              type="button"
              class="control-btn"
              :aria-label="$t('video.pip')"
              @click="togglePiP"
            >
              <PictureInPicture :size="20" />
            </button>

            <!-- 全屏 -->
            <button
              type="button"
              class="control-btn"
              :aria-label="$t('video.fullscreen')"
              @click="toggleFullscreen"
            >
              <Maximize v-if="!isFullscreen" :size="20" />
              <Minimize v-else :size="20" />
            </button>
          </div>
        </div>
      </div>

      <!-- 底部渐变 -->
      <div class="controls-gradient controls-gradient--bottom" />
    </div>
    <div
      class="controls-hint"
      :class="{ 'is-visible': showControls && !isPlaying && showControlHints }"
      aria-hidden="true"
    >
      {{ $t('video.keyboardHint') }}
    </div>

    <!-- 中央播放按钮 -->
    <button
      v-if="!isPlaying && !isBuffering"
      type="button"
      class="center-play-btn"
      :aria-label="$t('video.play')"
      @click="togglePlay"
    >
      <div class="center-play-icon">
        <Play :size="48" />
      </div>
    </button>

    <!-- 加载指示器 -->
    <div v-if="isBuffering" class="loading-indicator">
      <span class="spinner spinner-lg" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Settings,
  Maximize,
  Minimize,
  PictureInPicture,
} from 'lucide-vue-next'

interface Props {
  src: string
  poster?: string
  playsinline?: boolean
  loop?: boolean
  preload?: 'auto' | 'metadata' | 'none'
}

const { playsinline = true, loop = false, preload = 'metadata' } = defineProps<Props>()

const emit = defineEmits<{
  ready: []
  play: []
  pause: []
  ended: []
  timeupdate: [time: number]
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const playerElement = ref<HTMLElement | null>(null)
const settingsMenuRef = ref<HTMLElement | null>(null)
const isPlaying = ref(false)
const isBuffering = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(1)
const isMuted = ref(false)
const playbackRate = ref(1)
const currentQuality = ref('auto')
const isFullscreen = ref(false)
const showControls = ref(false)
const showControlHints = ref(true)
const showSettings = ref(false)
const bufferedPercent = ref(0)
const isSeeking = ref(false)

const playbackSpeeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
const qualities = ref<string[]>(['auto']) // 可扩展支持多画质

const playedPercent = computed(() => {
  if (duration.value === 0) return 0
  return (currentTime.value / duration.value) * 100
})

const supportsPiP = computed(() => {
  return document.pictureInPictureEnabled
})

// Constants
const CONTROLS_HIDE_DELAY = 3000
const SEEK_STEP = 5
const VOLUME_STEP = 0.1

let controlsTimeout: ReturnType<typeof setTimeout> | null = null

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function togglePlay() {
  if (!videoRef.value) return
  if (isPlaying.value) {
    videoRef.value.pause()
  } else {
    videoRef.value.play()
  }
}

function onPlay() {
  isPlaying.value = true
  emit('play')
  startControlsTimer()
}

function onPause() {
  isPlaying.value = false
  emit('pause')
  stopControlsTimer()
}

function onEnded() {
  isPlaying.value = false
  emit('ended')
}

function onLoadedMetadata() {
  if (!videoRef.value) return
  duration.value = videoRef.value.duration
  emit('ready')
}

function onTimeUpdate() {
  if (!videoRef.value) return
  currentTime.value = videoRef.value.currentTime
  emit('timeupdate', currentTime.value)

  // 更新缓冲进度
  if (videoRef.value.buffered.length > 0) {
    const buffered = videoRef.value.buffered.end(videoRef.value.buffered.length - 1)
    bufferedPercent.value = (buffered / duration.value) * 100
  }
}

function onVolumeChange() {
  if (!videoRef.value) return
  volume.value = videoRef.value.volume
  isMuted.value = videoRef.value.muted
}

function seek(event: MouseEvent) {
  if (!videoRef.value || !event.currentTarget) return
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  videoRef.value.currentTime = percent * duration.value
}

function startSeekDrag(event: MouseEvent | TouchEvent) {
  if (!videoRef.value) return
  isSeeking.value = true
  updateSeek(event)
  document.addEventListener('mousemove', updateSeek)
  document.addEventListener('mouseup', stopSeekDrag)
  document.addEventListener('touchmove', updateSeek, { passive: false })
  document.addEventListener('touchend', stopSeekDrag)
}

function updateSeek(event: MouseEvent | TouchEvent) {
  if (!videoRef.value) return
  const progress = playerElement.value?.querySelector('.progress-container') as HTMLElement | null
  const rect = progress?.getBoundingClientRect()
  if (!rect) return
  const clientX = 'touches' in event ? event.touches[0]?.clientX : (event as MouseEvent).clientX
  if (clientX === undefined) return
  if ('preventDefault' in event && isSeeking.value) event.preventDefault()
  const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  videoRef.value.currentTime = percent * duration.value
}

function stopSeekDrag() {
  isSeeking.value = false
  document.removeEventListener('mousemove', updateSeek)
  document.removeEventListener('mouseup', stopSeekDrag)
  document.removeEventListener('touchmove', updateSeek)
  document.removeEventListener('touchend', stopSeekDrag)
}

function toggleMute() {
  if (!videoRef.value) return
  videoRef.value.muted = !videoRef.value.muted
}

function setVolume(event: Event) {
  if (!videoRef.value || !event.target) return
  const target = event.target as HTMLInputElement
  const value = parseInt(target.value, 10)
  if (isNaN(value)) return

  videoRef.value.volume = Math.max(0, Math.min(1, value / 100))
  if (value > 0) {
    videoRef.value.muted = false
  }
}

function setPlaybackRate(rate: number) {
  if (!videoRef.value) return
  videoRef.value.playbackRate = rate
  playbackRate.value = rate
  showSettings.value = false
}

function setQuality(quality: string) {
  currentQuality.value = quality
  showSettings.value = false
  // 实际画质切换需要根据视频源实现
}

async function togglePiP() {
  if (!videoRef.value || !document.pictureInPictureEnabled) return

  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture()
    } else {
      await videoRef.value.requestPictureInPicture()
    }
  } catch (error) {
    console.error('PiP error:', error)
  }
}

async function toggleFullscreen() {
  if (!videoRef.value) return

  try {
    if (!document.fullscreenElement) {
      await videoRef.value.parentElement?.requestFullscreen()
      isFullscreen.value = true
    } else {
      await document.exitFullscreen()
      isFullscreen.value = false
    }
  } catch (error) {
    console.error('Fullscreen error:', error)
  }
}

function startControlsTimer() {
  stopControlsTimer()
  controlsTimeout = setTimeout(() => {
    if (isPlaying.value) {
      showControls.value = false
    }
  }, CONTROLS_HIDE_DELAY)
}

function stopControlsTimer() {
  if (controlsTimeout) {
    clearTimeout(controlsTimeout)
    controlsTimeout = null
  }
}

function handleMouseMove() {
  showControls.value = true
  if (isPlaying.value) {
    startControlsTimer()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (!videoRef.value) return

  // Only handle keyboard events when video player is focused or contains active element
  const isPlayerFocused = playerElement.value?.contains(document.activeElement)
  if (!isPlayerFocused && document.activeElement?.tagName !== 'BODY') return

  switch (event.key) {
    case ' ':
    case 'k':
      event.preventDefault()
      togglePlay()
      break
    case 'ArrowLeft':
      event.preventDefault()
      videoRef.value.currentTime = Math.max(0, currentTime.value - SEEK_STEP)
      break
    case 'ArrowRight':
      event.preventDefault()
      videoRef.value.currentTime = Math.min(duration.value, currentTime.value + SEEK_STEP)
      break
    case 'ArrowUp':
      event.preventDefault()
      videoRef.value.volume = Math.min(1, volume.value + VOLUME_STEP)
      break
    case 'ArrowDown':
      event.preventDefault()
      videoRef.value.volume = Math.max(0, volume.value - VOLUME_STEP)
      break
    case 'm':
      event.preventDefault()
      toggleMute()
      break
    case 'f':
      event.preventDefault()
      toggleFullscreen()
      break
  }
}

const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
}

const handleClickOutside = (event: MouseEvent) => {
  if (
    showSettings.value &&
    settingsMenuRef.value &&
    !settingsMenuRef.value.contains(event.target as Node)
  ) {
    showSettings.value = false
  }
}

onMounted(() => {
  startHintTimer()
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('click', handleClickOutside)
  stopControlsTimer()
  stopSeekDrag()
})

function startHintTimer() {
  showControlHints.value = true
  window.setTimeout(() => {
    showControlHints.value = false
  }, 2600)
}
</script>

<style scoped>
.video-player {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 200px;
  background: #000;
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: default;
}

.video-player:focus-visible {
  outline: 2px solid var(--color-ring);
  outline-offset: 4px;
}

.video-player.is-fullscreen {
  border-radius: 0;
}

.video-player.is-buffering .video-element {
  filter: brightness(0.75);
}

.video-element {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  background: #000;
}

/* 控制栏 */
.controls {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.controls.is-visible {
  opacity: 1;
  pointer-events: auto;
}

.video-player:hover .controls {
  opacity: 1;
  pointer-events: auto;
}

/* 渐变遮罩 */
.controls-gradient {
  position: absolute;
  left: 0;
  right: 0;
  height: 120px;
  pointer-events: none;
}

.controls-gradient--top {
  top: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.6) 0%, transparent 100%);
}

.controls-gradient--bottom {
  bottom: 0;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.8) 0%, transparent 100%);
}

.controls-hint {
  position: absolute;
  bottom: 16px;
  left: 16px;
  padding: 0.4rem 0.75rem;
  border-radius: var(--radius-full);
  background: rgba(0, 0, 0, 0.55);
  color: rgba(255, 255, 255, 0.7);
  font-size: var(--text-xs);
  opacity: 0;
  transform: translateY(6px);
  transition: opacity var(--transition-fast), transform var(--transition-fast);
  pointer-events: none;
}

.controls-hint.is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* 底部控制区 */
.controls-bottom {
  position: relative;
  z-index: 2;
  padding: var(--spacing-3);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

/* 进度条 */
.progress-container {
  width: 100%;
  height: 20px;
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: var(--spacing-1) 0;
}

.progress-bar {
  position: relative;
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-full);
  overflow: visible;
}

.progress-container:hover .progress-bar {
  height: 6px;
}

.progress-buffered {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: rgba(255, 255, 255, 0.5);
  border-radius: var(--radius-full);
  transition: width 0.2s ease;
}

.progress-played {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  transition: width 0.1s linear;
}

.progress-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.progress-container:hover .progress-thumb,
.progress-container.is-seeking .progress-thumb {
  opacity: 1;
}

/* 控制按钮行 */
.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
}

.controls-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.control-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: scale(1.05);
}

.control-btn:active {
  transform: scale(0.95);
}

/* 时间显示 */
.time-display {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--text-sm);
  color: white;
  font-variant-numeric: tabular-nums;
  user-select: none;
}

.time-separator {
  opacity: 0.6;
}

/* 音量控制 */
.volume-control {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.volume-slider-container {
  width: 0;
  opacity: 0;
  overflow: hidden;
  transition: all 0.2s ease;
}

.volume-control:hover .volume-slider-container {
  width: 80px;
  opacity: 1;
}

.volume-slider {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-full);
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

/* 设置菜单 */
.settings-menu {
  position: relative;
}

.settings-panel {
  position: absolute;
  bottom: calc(100% + var(--spacing-2));
  right: 0;
  min-width: 200px;
  padding: var(--spacing-3);
  background: rgba(28, 28, 30, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.settings-section + .settings-section {
  margin-top: var(--spacing-3);
  padding-top: var(--spacing-3);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.settings-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: rgba(255, 255, 255, 0.8);
}

.settings-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1);
}

.settings-option {
  padding: var(--spacing-1) var(--spacing-3);
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-md);
  color: white;
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.settings-option:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

.settings-option.active {
  background: rgba(var(--color-primary-rgb), 0.3);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* 中央播放按钮 */
.center-play-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
  background: transparent;
  border: none;
  cursor: pointer;
}

.center-play-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--color-primary-rgb), 0.9);
  border-radius: 50%;
  color: white;
  transition: all 0.2s ease;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.center-play-icon:hover {
  transform: scale(1.1);
  background: var(--color-primary);
}

.center-play-icon:active {
  transform: scale(0.95);
}

/* 加载指示器 */
.loading-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
  color: white;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .controls-bottom {
    padding: var(--spacing-2);
  }

  .control-btn {
    width: 36px;
    height: 36px;
  }

  .volume-control {
    display: none;
  }

  .time-display {
    font-size: var(--text-xs);
  }

  .center-play-icon {
    width: 64px;
    height: 64px;
  }

  .center-play-icon svg {
    width: 32px;
    height: 32px;
  }
}

/* 减少动画 */
@media (prefers-reduced-motion: reduce) {
  .controls,
  .progress-thumb,
  .volume-slider-container,
  .control-btn {
    transition: none;
  }
}
</style>
