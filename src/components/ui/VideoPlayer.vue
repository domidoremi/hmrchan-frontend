<template>
  <div
    ref="playerElement"
    class="video-player"
    :class="{ 'is-fullscreen': isFullscreen, 'is-buffering': isBuffering || isSeekPending }"
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
      :loop="loopEnabled"
      :preload="preload"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
      @volumechange="onVolumeChange"
      @waiting="onWaiting"
      @canplay="onCanPlay"
      @progress="onProgress"
      @seeking="onSeeking"
      @seeked="onSeeked"
      @click="togglePlay"
    >
      <track
        v-for="track in normalizedSubtitles"
        :key="`${track.language}-${track.src}`"
        kind="subtitles"
        :label="track.label"
        :srclang="track.language"
        :src="track.src"
        :default="track.language === selectedSubtitleLanguage"
      />
    </video>

    <!-- 手势指示器 -->
    <Transition name="fade">
      <div v-if="showVolumeIndicator" class="gesture-indicator">
        <AnimatedIcon name="explore" :fallback-icon="Volume2" size="xl" />
        <div class="indicator-value">{{ indicatorValue }}%</div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="showBrightnessIndicator" class="gesture-indicator">
        <AnimatedIcon name="sparkle" :fallback-icon="Sun" size="xl" />
        <div class="indicator-value">{{ indicatorValue }}%</div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="showSeekIndicator" class="gesture-indicator">
        <AnimatedIcon
          v-if="seekDirection === 'forward'"
          name="explore"
          :fallback-icon="FastForward"
          size="xl"
        />
        <AnimatedIcon v-else name="explore" :fallback-icon="Rewind" size="xl" />
        <div class="indicator-value">{{ indicatorValue }}s</div>
      </div>
    </Transition>

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
          :class="{
            'is-seeking': isSeeking || isSeekPending,
            'is-buffering': isBuffering || isSeekPending,
          }"
          @click="seek"
          @mousedown.prevent="startSeekDrag"
          @touchstart.prevent="startSeekDrag"
        >
          <div class="progress-bar">
            <div class="progress-buffered" :style="{ width: `${bufferedPercent}%` }" />
            <div class="progress-played" :style="{ width: `${displayPercent}%` }" />
            <div class="progress-thumb" :style="{ left: `${displayPercent}%` }" />
            <div
              v-if="isBuffering || isSeekPending"
              class="progress-loading"
              :style="{ left: `${displayPercent}%` }"
            >
              <span class="spinner spinner-sm" />
            </div>
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
              <AnimatedIcon v-if="!isPlaying" name="explore" :fallback-icon="Play" size="md" />
              <AnimatedIcon v-else name="explore" :fallback-icon="Pause" size="md" />
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
                <AnimatedIcon
                  v-if="!isMuted && volume > 0.5"
                  name="explore"
                  :fallback-icon="Volume2"
                  size="md"
                />
                <AnimatedIcon
                  v-else-if="!isMuted && volume > 0"
                  name="explore"
                  :fallback-icon="Volume1"
                  size="md"
                />
                <AnimatedIcon v-else name="explore" :fallback-icon="VolumeX" size="md" />
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

            <!-- 字幕快捷开关 -->
            <button
              v-if="normalizedSubtitles.length"
              type="button"
              class="control-btn control-btn--text"
              :class="{ 'is-active': !!selectedSubtitleLanguage }"
              :aria-label="$t('video.subtitles')"
              :title="
                activeSubtitleLabel
                  ? `${$t('video.subtitles')}: ${activeSubtitleLabel}`
                  : $t('video.subtitlesOff')
              "
              @click="toggleSubtitles"
            >
              CC
              <span v-if="activeSubtitleLabel" class="control-btn__badge">
                {{ activeSubtitleLabel }}
              </span>
            </button>

            <!-- 设置菜单 -->
            <div ref="settingsMenuRef" class="settings-menu" @click.stop>
              <button
                ref="settingsBtnRef"
                type="button"
                class="control-btn"
                :aria-label="$t('video.settings')"
                @click="toggleSettingsPanel"
              >
                <AnimatedIcon name="sparkle" :fallback-icon="Settings" size="md" />
              </button>
            </div>

            <Teleport to="body" :disabled="isFullscreen">
              <div
                v-if="showSettings"
                class="settings-panel glass-card"
                :class="{
                  'settings-panel--fullscreen': isFullscreen,
                  'settings-panel--teleported': !isFullscreen,
                }"
                :style="settingsPanelPosition"
                @click.stop
              >
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

                <!-- 循环播放 -->
                <div class="settings-section">
                  <div class="settings-label">{{ $t('video.loop') }}</div>
                  <div class="settings-options">
                    <button
                      type="button"
                      class="settings-option"
                      :class="{ active: loopEnabled }"
                      @click="setLoopEnabled(true)"
                    >
                      {{ $t('video.loopOn') }}
                    </button>
                    <button
                      type="button"
                      class="settings-option"
                      :class="{ active: !loopEnabled }"
                      @click="setLoopEnabled(false)"
                    >
                      {{ $t('video.loopOff') }}
                    </button>
                  </div>
                </div>

                <!-- 字幕 -->
                <div v-if="normalizedSubtitles.length" class="settings-section">
                  <div class="settings-label">{{ $t('video.subtitles') }}</div>
                  <div class="settings-options">
                    <button
                      type="button"
                      class="settings-option"
                      :class="{ active: !selectedSubtitleLanguage }"
                      @click="setSubtitleLanguage(null)"
                    >
                      {{ $t('video.subtitlesOff') }}
                    </button>
                    <button
                      v-for="track in normalizedSubtitles"
                      :key="`subtitle-${track.language}`"
                      type="button"
                      class="settings-option"
                      :class="{ active: selectedSubtitleLanguage === track.language }"
                      @click="setSubtitleLanguage(track.language)"
                    >
                      {{ track.label }}
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
            </Teleport>

            <!-- 画中画 -->
            <button
              v-if="supportsPiP"
              type="button"
              class="control-btn"
              :aria-label="$t('video.pip')"
              @click="togglePiP"
            >
              <AnimatedIcon name="explore" :fallback-icon="PictureInPicture" size="md" />
            </button>

            <!-- 全屏 -->
            <button
              type="button"
              class="control-btn"
              :aria-label="$t('video.fullscreen')"
              @click="toggleFullscreen"
            >
              <AnimatedIcon
                v-if="!isFullscreen"
                name="explore"
                :fallback-icon="Maximize"
                size="md"
              />
              <AnimatedIcon v-else name="explore" :fallback-icon="Minimize" size="md" />
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
        <AnimatedIcon name="explore" :fallback-icon="Play" size="xl" />
      </div>
    </button>

    <!-- 加载指示器 -->
    <div v-if="isBuffering" class="loading-indicator">
      <span class="spinner spinner-lg" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
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
  Sun,
  FastForward,
  Rewind,
} from 'lucide-vue-next'
import { useVideoSettings } from '@/composables/useVideoSettings'
import { useVideoGestures } from '@/composables/useVideoGestures'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import { normalizeToProxyPath } from '@/utils/url'

interface Props {
  src: string
  poster?: string
  playsinline?: boolean
  loop?: boolean
  preload?: 'auto' | 'metadata' | 'none'
  subtitles?: SubtitleTrack[] | null | undefined
}
function updateBufferedPercent() {
  if (!videoRef.value) return
  const dur = duration.value
  if (!isFinite(dur) || dur <= 0) {
    bufferedPercent.value = 0
    return
  }
  if (videoRef.value.buffered.length > 0) {
    const buffered = videoRef.value.buffered.end(videoRef.value.buffered.length - 1)
    bufferedPercent.value = Math.min(100, Math.max(0, (buffered / dur) * 100))
  } else {
    bufferedPercent.value = 0
  }
}

const props = withDefaults(defineProps<Props>(), {
  playsinline: true,
  loop: false,
  preload: 'metadata',
  subtitles: null,
})

interface SubtitleTrack {
  id?: string | null
  language: string
  format?: string | null
  label?: string | null
  url?: string | null
  subtitle_url?: string | null
  file_path?: string | null
  subtitle_path?: string | null
  path?: string | null
}

interface NormalizedSubtitleTrack {
  language: string
  label: string
  src: string
  format?: string | null | undefined
}

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
const settingsBtnRef = ref<HTMLElement | null>(null)
const isPlaying = ref(false)
const isBuffering = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const playbackRate = ref(1)
const currentQuality = ref('auto')
const isFullscreen = ref(false)
const showControls = ref(false)
const showControlHints = ref(true)
const showSettings = ref(false)
const bufferedPercent = ref(0)
const isSeeking = ref(false)
const isSeekPending = ref(false)
const seekPreviewPercent = ref<number | null>(null)

// 使用视频设置 composable
const { locale } = useI18n()

const {
  settings: videoSettings,
  setVolume: updateVolume,
  setMuted: updateMuted,
  setPlaybackRate: updatePlaybackRate,
  setLoop: updateLoop,
  setBrightness: updateBrightness,
  setSubtitleLanguage: updateSubtitleLanguage,
} = useVideoSettings()

// 从设置中获取音量和静音状态
const volume = computed(() => videoSettings.value.volume)
const isMuted = computed(() => videoSettings.value.muted)
const brightness = computed(() => videoSettings.value.brightness)
const loopEnabled = computed(() => props.loop || videoSettings.value.loop)

function setLoopEnabled(enabled: boolean) {
  updateLoop(enabled)
}

// 使用手势控制 composable
const {
  showVolumeIndicator,
  showBrightnessIndicator,
  showSeekIndicator,
  indicatorValue,
  seekDirection,
  currentVolume,
  currentBrightness,
  triggerVolumeIndicator,
  triggerSeekIndicator,
} = useVideoGestures({
  videoRef,
  containerRef: playerElement,
  onVolumeChange: (vol) => {
    updateVolume(vol)
  },
  onBrightnessChange: (bright) => {
    updateBrightness(bright)
  },
  onSeek: (time) => {
    if (videoRef.value) {
      videoRef.value.currentTime = time
    }
  },
  onTogglePlay: () => {
    togglePlay()
  },
})

const playbackSpeeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
const qualities = ref<string[]>(['auto']) // 可扩展支持多画质

// 设置面板定位（Teleport 到 body 时使用 fixed 定位，全屏时也用 fixed）
const settingsPanelPosition = ref<Record<string, string>>({})

function updateSettingsPanelPosition() {
  if (!settingsBtnRef.value) return
  const rect = settingsBtnRef.value.getBoundingClientRect()
  const isMobile = window.innerWidth <= 768

  if (!isFullscreen.value && isMobile) {
    // 非全屏移动端：底部弹出式
    settingsPanelPosition.value = {
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      zIndex: 'var(--z-modal)',
    }
  } else {
    // 桌面端 & 全屏模式：从按钮上方弹出
    settingsPanelPosition.value = {
      position: 'fixed',
      bottom: `${window.innerHeight - rect.top + 8}px`,
      right: `${window.innerWidth - rect.right}px`,
      zIndex: 'var(--z-modal)',
    }
  }
}

function toggleSettingsPanel() {
  showSettings.value = !showSettings.value
  if (showSettings.value) {
    nextTick(() => updateSettingsPanelPosition())
  }
}

const subtitleOverrides = ref<Record<string, string>>({})
const selectedSubtitleLanguage = ref<string | null>(null)

const normalizedSubtitles = computed<NormalizedSubtitleTrack[]>(() => {
  const tracks = props.subtitles ?? []
  if (!tracks.length) {
    if (import.meta.env['VITE_ENABLE_DEBUG'] === 'true') {
      console.log('[VideoPlayer] 没有字幕数据')
    }
    return []
  }

  if (import.meta.env['VITE_ENABLE_DEBUG'] === 'true') {
    console.group('[VideoPlayer] 字幕数据处理')
    console.log('原始字幕数据:', tracks)
  }

  const result = tracks.reduce<NormalizedSubtitleTrack[]>((acc, track) => {
    const src = normalizeSubtitleSrc(track)
    if (!src || !track.language) {
      if (import.meta.env['VITE_ENABLE_DEBUG'] === 'true') {
        console.warn('跳过无效字幕轨道:', track, '原因:', !src ? '无 URL' : '无语言')
      }
      return acc
    }
    const label = track.label || track.language.toUpperCase()
    const override = subtitleOverrides.value[src]
    const finalSrc = override || src

    if (import.meta.env['VITE_ENABLE_DEBUG'] === 'true') {
      console.log(`✅ 字幕轨道 [${track.language}]:`, {
        label,
        src: finalSrc,
        format: track.format,
        override: !!override,
      })
    }

    acc.push({ language: track.language, label, src: finalSrc, format: track.format })
    return acc
  }, [])

  if (import.meta.env['VITE_ENABLE_DEBUG'] === 'true') {
    console.log('处理后的字幕轨道:', result)
    console.groupEnd()
  }

  return result
})

const playedPercent = computed(() => {
  const dur = duration.value
  if (!isFinite(dur) || dur <= 0) return 0
  const percent = (currentTime.value / dur) * 100
  return Math.min(100, Math.max(0, percent))
})

const displayPercent = computed(() => {
  const raw = seekPreviewPercent.value ?? playedPercent.value
  if (!isFinite(raw)) return 0
  return Math.min(100, Math.max(0, raw))
})

const supportsPiP = computed(() => {
  return document.pictureInPictureEnabled
})

const activeSubtitleLabel = computed(() => {
  if (!selectedSubtitleLanguage.value) return null
  return (
    normalizedSubtitles.value.find((track) => track.language === selectedSubtitleLanguage.value)
      ?.label || selectedSubtitleLanguage.value.toUpperCase()
  )
})

// Helper to get API base URL consistently
const apiBaseUrl = computed(
  () => import.meta.env.VITE_API_ENDPOINT || `${import.meta.env.VITE_API_URL || '/api'}/v1`
)

function extractMediaIdFromSrc(src: string): string | null {
  if (!src?.trim()) return null

  // 从视频 src 中提取 media_id
  // 格式: /api/v1/media/{media_id}/stream
  const match = src.match(/\/media\/([0-9a-f-]+)\/stream/i)
  return match?.[1] ?? null
}

function normalizeSubtitleSrc(track: SubtitleTrack): string | null {
  // 优先使用已构建的 URL
  const raw =
    track.url || track.subtitle_url || track.file_path || track.subtitle_path || track.path

  if (raw) {
    const normalized = normalizeToProxyPath(raw)
    if (normalized) {
      // 已经是完整 URL（第三方）或可直接使用的代理路径
      if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
        return normalized
      }
      if (normalized.startsWith('/')) {
        return normalized
      }
    }

    // 构建相对路径的完整 URL
    const base = apiBaseUrl.value
    return raw.startsWith('/') ? `${base}${raw}` : `${base}/${raw}`
  }

  // 如果没有 URL，但有 language，则构建标准字幕 API URL
  // 根据后端 API: /api/v1/media/{media_id}/subtitle?language={language}
  if (track.language && props.src?.trim()) {
    const mediaId = extractMediaIdFromSrc(props.src)
    if (mediaId) {
      return `${apiBaseUrl.value}/media/${mediaId}/subtitle?language=${track.language}`
    }
  }

  return null
}

function isSrtTrack(track: NormalizedSubtitleTrack): boolean {
  if (track.format?.toLowerCase() === 'srt') return true
  return track.src.toLowerCase().endsWith('.srt')
}

function toLocaleMatches(trackLanguage: string, target: string): boolean {
  const normalized = trackLanguage.toLowerCase()
  const localeValue = target.toLowerCase()
  if (normalized === localeValue) return true
  const base = localeValue.split('-')[0]
  return normalized === base || normalized.startsWith(`${base}-`)
}

function pickDefaultSubtitle(tracks: NormalizedSubtitleTrack[]) {
  if (!tracks.length) return null
  const preferred = videoSettings.value.subtitleLanguage
  if (preferred) {
    const match = tracks.find((track) => toLocaleMatches(track.language, preferred))
    if (match) return match.language
  }

  const localeMatch = tracks.find((track) => toLocaleMatches(track.language, locale.value))
  if (localeMatch) return localeMatch.language
  return tracks[0]?.language ?? null
}

async function ensureVttFallback(track: NormalizedSubtitleTrack) {
  if (!isSrtTrack(track)) return
  if (subtitleOverrides.value[track.src]) return

  try {
    const response = await fetch(track.src)
    if (!response.ok) return
    const rawText = await response.text()
    const normalized = rawText.replace(/\r+/g, '')
    const body = normalized.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
    const vttText = body.startsWith('WEBVTT') ? body : `WEBVTT\n\n${body.trim()}\n`
    const blobUrl = URL.createObjectURL(new Blob([vttText], { type: 'text/vtt' }))
    subtitleOverrides.value = {
      ...subtitleOverrides.value,
      [track.src]: blobUrl,
    }
  } catch (error) {
    console.warn('Subtitle fallback failed:', error)
  }
}

function syncSubtitleSelection(tracks: NormalizedSubtitleTrack[]) {
  if (!tracks.length) {
    selectedSubtitleLanguage.value = null
    return
  }

  const current = selectedSubtitleLanguage.value
  if (current && tracks.some((track) => track.language === current)) return
  selectedSubtitleLanguage.value = pickDefaultSubtitle(tracks)
}

function applySubtitleMode() {
  const textTracks = videoRef.value?.textTracks
  if (!textTracks) return
  const target = selectedSubtitleLanguage.value
  for (let i = 0; i < textTracks.length; i += 1) {
    const track = textTracks[i]
    if (!track) continue
    track.mode = target && track.language === target ? 'showing' : 'disabled'
  }
}

// Constants
const CONTROLS_HIDE_DELAY = 3000
const SEEK_STEP = 5
const VOLUME_STEP = 0.1

let controlsTimeout: ReturnType<typeof setTimeout> | null = null
let seekPendingTimeout: ReturnType<typeof setTimeout> | null = null
let hintTimeout: ReturnType<typeof setTimeout> | null = null

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
  const raw = videoRef.value.duration
  duration.value = isFinite(raw) && raw > 0 ? raw : 0
  updateBufferedPercent()
  emit('ready')
  applySubtitleMode()
}

function onTimeUpdate() {
  if (!videoRef.value) return
  currentTime.value = videoRef.value.currentTime
  emit('timeupdate', currentTime.value)
  updateBufferedPercent()
}

function onVolumeChange() {
  if (!videoRef.value) return
  updateVolume(videoRef.value.volume)
  updateMuted(videoRef.value.muted)
}
function markSeekPending(percent?: number) {
  if (typeof percent === 'number') {
    seekPreviewPercent.value = Math.min(100, Math.max(0, percent))
  }
  isSeekPending.value = true
  if (seekPendingTimeout) {
    clearTimeout(seekPendingTimeout)
  }
  seekPendingTimeout = setTimeout(() => {
    isSeekPending.value = false
    seekPreviewPercent.value = null
  }, 1200)
}

function clearSeekPending() {
  isSeekPending.value = false
  seekPreviewPercent.value = null
  if (seekPendingTimeout) {
    clearTimeout(seekPendingTimeout)
    seekPendingTimeout = null
  }
}

function seek(event: MouseEvent) {
  if (!videoRef.value || !event.currentTarget) return
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  if (duration.value <= 0) return
  const newTime = percent * duration.value
  const delta = newTime - currentTime.value
  currentTime.value = newTime
  markSeekPending(percent * 100)
  videoRef.value.currentTime = newTime
  if (Math.abs(delta) > 0.2) {
    triggerSeekIndicator(delta > 0 ? 'forward' : 'backward', Math.round(Math.abs(delta)))
  }
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
  if (duration.value <= 0) return
  const newTime = percent * duration.value
  const delta = newTime - currentTime.value
  currentTime.value = newTime
  markSeekPending(percent * 100)
  videoRef.value.currentTime = newTime
  if (Math.abs(delta) > 0.2) {
    triggerSeekIndicator(delta > 0 ? 'forward' : 'backward', Math.round(Math.abs(delta)))
  }
}

function stopSeekDrag() {
  isSeeking.value = false
  document.removeEventListener('mousemove', updateSeek)
  document.removeEventListener('mouseup', stopSeekDrag)
  document.removeEventListener('touchmove', updateSeek)
  document.removeEventListener('touchend', stopSeekDrag)
}

function onWaiting() {
  isBuffering.value = true
}

function onCanPlay() {
  isBuffering.value = false
  clearSeekPending()
}

function onProgress() {
  updateBufferedPercent()
}

function onSeeking() {
  const dur = duration.value
  if (!isFinite(dur) || dur <= 0) {
    isSeekPending.value = true
    return
  }
  const percent = (videoRef.value?.currentTime ?? 0) / dur
  markSeekPending(percent * 100)
}

function onSeeked() {
  // keep seek preview until canplay unless no buffering occurs
  if (!isBuffering.value) {
    clearSeekPending()
  }
}

function toggleMute() {
  if (!videoRef.value) return
  videoRef.value.muted = !videoRef.value.muted
  triggerVolumeIndicator(videoRef.value.muted ? 0 : Math.round(volume.value * 100))
}

function setVolume(event: Event) {
  if (!videoRef.value || !event.target) return
  const target = event.target as HTMLInputElement
  const value = parseInt(target.value, 10)
  if (isNaN(value)) return

  const newVolume = Math.max(0, Math.min(1, value / 100))
  videoRef.value.volume = newVolume
  updateVolume(newVolume)
  triggerVolumeIndicator(Math.round(newVolume * 100))
  if (value > 0) {
    videoRef.value.muted = false
    updateMuted(false)
  }
}

function setPlaybackRate(rate: number) {
  if (!videoRef.value) return
  videoRef.value.playbackRate = rate
  playbackRate.value = rate
  updatePlaybackRate(rate)
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
      triggerSeekIndicator('backward', SEEK_STEP)
      break
    case 'ArrowRight':
      event.preventDefault()
      videoRef.value.currentTime = Math.min(duration.value, currentTime.value + SEEK_STEP)
      triggerSeekIndicator('forward', SEEK_STEP)
      break
    case 'ArrowUp':
      event.preventDefault()
      videoRef.value.volume = Math.min(1, volume.value + VOLUME_STEP)
      triggerVolumeIndicator(Math.round(videoRef.value.volume * 100))
      break
    case 'ArrowDown':
      event.preventDefault()
      videoRef.value.volume = Math.max(0, volume.value - VOLUME_STEP)
      triggerVolumeIndicator(Math.round(videoRef.value.volume * 100))
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
  if (!showSettings.value) return
  const target = event.target as Node
  // 检查点击是否在设置按钮或 Teleport 出去的设置面板内
  if (settingsMenuRef.value?.contains(target)) return
  if ((target as Element).closest?.('.settings-panel')) return
  showSettings.value = false
}

onMounted(() => {
  startHintTimer()
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('click', handleClickOutside)

  // 应用保存的设置
  if (videoRef.value) {
    videoRef.value.volume = videoSettings.value.volume
    videoRef.value.muted = videoSettings.value.muted
    videoRef.value.playbackRate = videoSettings.value.playbackRate
    playbackRate.value = videoSettings.value.playbackRate
  }

  // 初始化手势控制的当前值
  currentVolume.value = videoSettings.value.volume
  currentBrightness.value = videoSettings.value.brightness
})

// 监听亮度变化并应用滤镜
watch(brightness, (newBrightness) => {
  if (videoRef.value) {
    videoRef.value.style.filter = `brightness(${newBrightness})`
  }
})

watch(normalizedSubtitles, (tracks) => {
  syncSubtitleSelection(tracks)
  tracks.forEach((track) => {
    void ensureVttFallback(track)
  })
})

watch(
  [selectedSubtitleLanguage, () => videoSettings.value.subtitleLanguage],
  ([currentSelection, storedSelection]) => {
    if (currentSelection !== storedSelection) {
      updateSubtitleLanguage(currentSelection)
    }
    applySubtitleMode()
  }
)

watch(
  () => locale.value,
  () => {
    syncSubtitleSelection(normalizedSubtitles.value)
  }
)

onBeforeUnmount(() => {
  Object.values(subtitleOverrides.value).forEach((url) => URL.revokeObjectURL(url))
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('click', handleClickOutside)
  stopControlsTimer()
  stopSeekDrag()
  clearSeekPending()
  if (hintTimeout) {
    clearTimeout(hintTimeout)
    hintTimeout = null
  }
})

function setSubtitleLanguage(language: string | null) {
  selectedSubtitleLanguage.value = language
  showSettings.value = false
}

function toggleSubtitles() {
  if (selectedSubtitleLanguage.value) {
    setSubtitleLanguage(null)
    return
  }

  const fallback = pickDefaultSubtitle(normalizedSubtitles.value)
  setSubtitleLanguage(fallback)
}

function startHintTimer() {
  showControlHints.value = true
  if (hintTimeout) {
    clearTimeout(hintTimeout)
  }
  hintTimeout = window.setTimeout(() => {
    showControlHints.value = false
  }, 2600) as unknown as number
}
</script>

<style scoped>
.video-player {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 12.5rem;
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
  height: 7.5rem;
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
  bottom: 5rem; /* 提高位置，避免被控制栏遮挡 */
  left: 1rem;
  padding: 0.5rem 0.875rem;
  border-radius: var(--radius-full);
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.9);
  font-size: var(--text-xs);
  opacity: 0;
  transform: translateY(6px);
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast);
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.controls-hint.is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* 手势指示器 */
.gesture-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-4);
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(12px);
  border-radius: var(--radius-xl);
  color: white;
  pointer-events: none;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.indicator-value {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  font-variant-numeric: tabular-nums;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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
  height: 1.25rem;
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: var(--spacing-1) 0;
}

.progress-bar {
  position: relative;
  width: 100%;
  height: 0.25rem;
  background: rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-full);
  overflow: visible;
}

.progress-container:hover .progress-bar {
  height: 0.375rem;
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
  width: 0.875rem;
  height: 0.875rem;
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

.progress-container.is-buffering .progress-thumb {
  opacity: 1;
}

.progress-container.is-buffering .progress-bar {
  height: 0.375rem;
}

.progress-loading {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 1.125rem;
  height: 1.125rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.4);
  pointer-events: none;
  color: white;
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
  width: 2.5rem;
  height: 2.5rem;
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

.control-btn--text {
  width: auto;
  min-width: 40px;
  padding: 0 var(--spacing-2);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  letter-spacing: 0.04em;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(0, 0, 0, 0.25);
  gap: var(--spacing-1);
}

.control-btn--text.is-active {
  border-color: rgba(var(--color-primary-rgb), 0.7);
  color: var(--color-primary);
  box-shadow: 0 0 0 1px rgba(var(--color-primary-rgb), 0.3);
}

.control-btn__badge {
  display: inline-flex;
  align-items: center;
  padding: 0 var(--spacing-1);
  margin-left: var(--spacing-1);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  letter-spacing: 0.01em;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.85);
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
  width: 5rem;
  opacity: 1;
}

.volume-slider {
  width: 100%;
  height: 0.25rem;
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
  width: 0.75rem;
  height: 0.75rem;
  background: white;
  border-radius: 50%;
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 0.75rem;
  height: 0.75rem;
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
  min-width: 200px;
  padding: var(--spacing-3);
  background: rgba(28, 28, 30, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  border-radius: var(--radius-xl);
}

/* Teleport 到 body 和全屏模式均由 JS 内联样式控制 position/z-index */

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
  width: 5rem;
  height: 5rem;
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
    width: 2.25rem;
    height: 2.25rem;
  }

  .volume-control {
    flex-shrink: 0;
  }

  .volume-slider-container {
    width: 4rem;
  }

  .time-display {
    font-size: var(--text-xs);
  }

  .center-play-icon {
    width: 4rem;
    height: 4rem;
  }

  .center-play-icon svg {
    width: 2rem;
    height: 2rem;
  }

  .settings-panel--teleported {
    /* JS 已设置 position:fixed; bottom:0; left:0; right:0 */
    min-width: unset;
    width: auto;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    padding: var(--spacing-4);
    padding-bottom: calc(var(--spacing-4) + env(safe-area-inset-bottom));
    max-height: 70svh;
    overflow-y: auto;
    background: var(--glass-bg-strong);
    backdrop-filter: var(--glass-blur-strong);
    -webkit-backdrop-filter: var(--glass-blur-strong);
    border: 1px solid var(--glass-border);
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.2);
  }

  /* 全屏模式下移动端：从按钮上方弹出（JS 定位），仅补充视觉样式 */
  .settings-panel--fullscreen {
    max-height: 60svh;
    overflow-y: auto;
  }

  /* Adjust settings panel text for theme adaptation */
  .settings-label {
    color: var(--color-text-secondary);
  }

  .settings-option {
    border-color: var(--glass-border);
    color: var(--color-text-primary);
  }

  .settings-option:hover {
    background: var(--glass-bg-hover);
    border-color: var(--glass-border-strong);
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
