<template>
  <div
    ref="playerElement"
    class="vp"
    :class="{
      'is-fullscreen': isFullscreen,
      'is-buffering': isBuffering || isSeekPending,
      'is-idle': !showControls && isPlaying,
    }"
    tabindex="0"
    role="group"
    :aria-label="$t('video.player')"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <video
      ref="videoRef"
      class="vp__video"
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

    <!-- Gesture indicators -->
    <Transition name="vp-fade">
      <div v-if="showVolumeIndicator" class="vp__indicator">
        <Volume2 :size="28" />
        <span class="vp__indicator-val">{{ indicatorValue }}%</span>
      </div>
    </Transition>
    <Transition name="vp-fade">
      <div v-if="showBrightnessIndicator" class="vp__indicator">
        <Sun :size="28" />
        <span class="vp__indicator-val">{{ indicatorValue }}%</span>
      </div>
    </Transition>
    <Transition name="vp-fade">
      <div v-if="showSeekIndicator" class="vp__indicator">
        <FastForward v-if="seekDirection === 'forward'" :size="28" />
        <Rewind v-else :size="28" />
        <span class="vp__indicator-val">{{ indicatorValue }}s</span>
      </div>
    </Transition>

    <!-- Controls overlay -->
    <div class="vp__controls" :class="{ 'is-visible': showControls || !isPlaying }">
      <div class="vp__gradient vp__gradient--top" />
      <div class="vp__gradient vp__gradient--bottom" />

      <div class="vp__bar">
        <!-- Progress -->
        <div
          class="vp__progress"
          :class="{ 'is-active': isSeeking || isSeekPending }"
          role="slider"
          tabindex="0"
          :aria-label="$t('video.seek')"
          :aria-valuemin="0"
          :aria-valuemax="Math.max(duration, 0)"
          :aria-valuenow="Math.max(currentTime, 0)"
          :aria-valuetext="`${formatTime(currentTime)} / ${formatTime(duration)}`"
          @click="seekFromClick"
          @keydown="handleProgressKeydown"
          @mousedown.prevent="startSeekDrag"
          @touchstart.prevent="startSeekDrag"
        >
          <div class="vp__progress-track">
            <div class="vp__progress-buffered" :style="{ width: `${bufferedPercent}%` }" />
            <div class="vp__progress-fill" :style="{ width: `${displayPercent}%` }" />
            <div class="vp__progress-thumb" :style="{ left: `${displayPercent}%` }" />
          </div>
        </div>

        <!-- Button row -->
        <div class="vp__row">
          <div class="vp__group vp__group--left">
            <button
              type="button"
              class="vp__btn"
              :aria-label="isPlaying ? $t('video.pause') : $t('video.play')"
              @click="togglePlay"
            >
              <Pause v-if="isPlaying" :size="20" />
              <Play v-else :size="20" />
            </button>

            <!-- Volume (desktop only) -->
            <div class="vp__volume">
              <button
                type="button"
                class="vp__btn"
                :aria-label="isMuted ? $t('video.unmute') : $t('video.mute')"
                @click="toggleMute"
              >
                <Volume2 v-if="!isMuted && volume > 0.5" :size="20" />
                <Volume1 v-else-if="!isMuted && volume > 0" :size="20" />
                <VolumeX v-else :size="20" />
              </button>
              <div class="vp__volume-track">
                <input
                  type="range"
                  class="vp__slider"
                  min="0"
                  max="100"
                  :value="Math.round(volume * 100)"
                  :aria-label="$t('video.volume')"
                  @input="handleVolumeInput"
                />
              </div>
            </div>

            <div class="vp__time">
              <span class="vp__time-current">{{ formatTime(currentTime) }}</span>
              <span class="vp__time-sep">/</span>
              <span class="vp__time-total">{{ formatTime(duration) }}</span>
            </div>
          </div>

          <div class="vp__group vp__group--right">
            <!-- CC button -->
            <button
              v-if="normalizedSubtitles.length"
              type="button"
              class="vp__btn vp__btn--cc"
              :class="{ 'is-active': !!selectedSubtitleLanguage }"
              :aria-label="$t('video.subtitles')"
              :aria-pressed="!!selectedSubtitleLanguage"
              :aria-expanded="showSubtitlePicker"
              :aria-controls="subtitlePanelId"
              @click="toggleSubtitlePicker"
            >
              CC
            </button>

            <!-- Settings -->
            <button
              ref="settingsBtnRef"
              type="button"
              class="vp__btn"
              :aria-label="$t('video.settings')"
              :aria-expanded="showSettings"
              :aria-controls="settingsPanelId"
              @click="toggleSettingsPanel"
            >
              <Settings :size="20" />
            </button>

            <!-- PiP -->
            <button
              v-if="supportsPiP"
              type="button"
              class="vp__btn vp__btn--hide-mobile"
              :aria-label="$t('video.pip')"
              @click="togglePiP"
            >
              <PictureInPicture :size="20" />
            </button>

            <!-- Fullscreen -->
            <button
              type="button"
              class="vp__btn"
              :aria-label="$t('video.fullscreen')"
              @click="toggleFullscreen"
            >
              <Maximize v-if="!isFullscreen" :size="20" />
              <Minimize v-else :size="20" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Keyboard hint -->
    <div
      class="vp__hint"
      :class="{ 'is-visible': showControls && !isPlaying && showControlHints }"
      aria-hidden="true"
    >
      {{ $t('video.keyboardHint') }}
    </div>

    <!-- Center play button -->
    <Transition name="vp-scale">
      <button
        v-if="!isPlaying && !isBuffering"
        type="button"
        class="vp__center-play"
        :aria-label="$t('video.play')"
        @click="togglePlay"
      >
        <Play :size="32" />
      </button>
    </Transition>

    <!-- Custom subtitle overlay (cross-browser) -->
    <Transition name="vp-fade">
      <div
        v-if="activeCueHtml && selectedSubtitleLanguage"
        class="vp__subtitle-overlay"
        :style="subtitleOverlayStyle"
        aria-live="polite"
        role="status"
      >
        <span class="vp__subtitle-text" v-html="activeCueHtml" />
      </div>
    </Transition>

    <!-- Loading spinner -->
    <Transition name="vp-fade">
      <div v-if="isBuffering" class="vp__loader">
        <span class="spinner spinner-lg" />
      </div>
    </Transition>

    <!-- Panel backdrop (mobile) -->
    <Transition name="vp-fade">
      <div
        v-if="showSettings || showSubtitlePicker"
        class="vp__panel-backdrop"
        role="button"
        tabindex="0"
        :aria-label="$t('common.close')"
        @click="closeAllPanels"
        @keydown.enter.prevent="closeAllPanels"
        @keydown.space.prevent="closeAllPanels"
      />
    </Transition>

    <!-- Settings panel -->
    <Transition name="vp-panel">
      <div
        v-if="showSettings"
        :id="settingsPanelId"
        class="vp__panel vp__panel--settings"
        @click.stop
      >
        <div class="vp__panel-head">
          <span class="vp__panel-title">{{ $t('video.settings') }}</span>
          <button
            type="button"
            class="vp__btn vp__btn--close"
            :aria-label="$t('common.close')"
            @click="showSettings = false"
          >
            <X :size="18" />
          </button>
        </div>
        <div class="vp__panel-section">
          <div class="vp__panel-label">{{ $t('video.playbackSpeed') }}</div>
          <div class="vp__panel-chips">
            <button
              v-for="speed in PLAYBACK_SPEEDS"
              :key="speed"
              type="button"
              class="vp__chip"
              :class="{ 'is-active': playbackRate === speed }"
              :aria-pressed="playbackRate === speed"
              @click="setPlaybackRate(speed)"
            >
              {{ speed }}x
            </button>
          </div>
        </div>

        <div class="vp__panel-section">
          <div class="vp__panel-label">{{ $t('video.loop') }}</div>
          <div class="vp__panel-chips">
            <button
              type="button"
              class="vp__chip"
              :class="{ 'is-active': loopEnabled }"
              :aria-pressed="loopEnabled"
              @click="setLoopEnabled(true)"
            >
              {{ $t('video.loopOn') }}
            </button>
            <button
              type="button"
              class="vp__chip"
              :class="{ 'is-active': !loopEnabled }"
              :aria-pressed="!loopEnabled"
              @click="setLoopEnabled(false)"
            >
              {{ $t('video.loopOff') }}
            </button>
          </div>
        </div>

        <div v-if="normalizedSubtitles.length" class="vp__panel-section">
          <div class="vp__panel-label">{{ $t('video.subtitles') }}</div>
          <div class="vp__panel-chips">
            <button
              type="button"
              class="vp__chip"
              :class="{ 'is-active': !selectedSubtitleLanguage }"
              :aria-pressed="!selectedSubtitleLanguage"
              @click="setSubtitleLanguage(null)"
            >
              {{ $t('video.subtitlesOff') }}
            </button>
            <button
              v-for="track in normalizedSubtitles"
              :key="`sub-${track.language}`"
              type="button"
              class="vp__chip"
              :class="{ 'is-active': selectedSubtitleLanguage === track.language }"
              :aria-pressed="selectedSubtitleLanguage === track.language"
              @click="setSubtitleLanguage(track.language)"
            >
              {{ track.label }}
            </button>
          </div>

          <!-- Subtitle style controls (visible when a subtitle is selected) -->
          <template v-if="selectedSubtitleLanguage">
            <!-- Font size -->
            <div class="vp__panel-sub">
              <div class="vp__panel-label">
                <Type :size="12" style="vertical-align: -1px" />
                {{ $t('video.subtitleFontSize') }}
              </div>
              <div class="vp__panel-slider-row">
                <span>A</span>
                <input
                  type="range"
                  class="vp__slider vp__slider--panel"
                  min="75"
                  max="200"
                  step="5"
                  :value="Math.round(subtitleFontSize * 100)"
                  :aria-label="$t('video.subtitleFontSize')"
                  @input="handleSubtitleFontSizeInput"
                />
                <span style="font-size: 1.15em; font-weight: 600">A</span>
              </div>
            </div>

            <!-- Font color -->
            <div class="vp__panel-sub">
              <div class="vp__panel-label">{{ $t('video.subtitleColor') }}</div>
              <div class="vp__color-swatches">
                <button
                  v-for="c in SUBTITLE_COLORS"
                  :key="`fc-${c.value}`"
                  type="button"
                  class="vp__swatch"
                  :class="{ 'is-active': subtitleColor === c.value }"
                  :style="{ '--swatch-color': c.value }"
                  :aria-label="c.label"
                  :aria-pressed="subtitleColor === c.value"
                  @click="setSubtitleColorChoice(c.value)"
                />
              </div>
            </div>

            <!-- Background color + opacity -->
            <div class="vp__panel-sub">
              <div class="vp__panel-label">{{ $t('video.subtitleBgColor') }}</div>
              <div class="vp__color-swatches">
                <button
                  v-for="c in SUBTITLE_BG_COLORS"
                  :key="`bg-${c.value}`"
                  type="button"
                  class="vp__swatch"
                  :class="{ 'is-active': subtitleBgColor === c.value }"
                  :style="{ '--swatch-color': c.value }"
                  :aria-label="c.label"
                  :aria-pressed="subtitleBgColor === c.value"
                  @click="setSubtitleBgColorChoice(c.value)"
                />
              </div>
              <div class="vp__panel-slider-row">
                <span>{{ $t('video.subtitleBgOpacity') }}</span>
                <input
                  type="range"
                  class="vp__slider vp__slider--panel"
                  min="0"
                  max="100"
                  step="5"
                  :value="Math.round(subtitleBgOpacity * 100)"
                  :aria-label="$t('video.subtitleBgOpacity')"
                  @input="handleSubtitleBgOpacityInput"
                />
              </div>
            </div>

            <!-- Text shadow -->
            <div class="vp__panel-sub">
              <div class="vp__panel-label">{{ $t('video.subtitleShadow') }}</div>
              <div class="vp__panel-chips">
                <button
                  v-for="s in SUBTITLE_SHADOWS"
                  :key="`sh-${s.value}`"
                  type="button"
                  class="vp__chip"
                  :class="{ 'is-active': subtitleShadow === s.value }"
                  :aria-pressed="subtitleShadow === s.value"
                  @click="setSubtitleShadowChoice(s.value)"
                >
                  {{ $t(s.labelKey) }}
                </button>
              </div>
            </div>

            <!-- Alignment -->
            <div class="vp__panel-sub">
              <div class="vp__panel-label">{{ $t('video.subtitleAlign') }}</div>
              <div class="vp__align-group">
                <button
                  type="button"
                  class="vp__btn vp__btn--align"
                  :class="{ 'is-active': subtitleAlign === 'left' }"
                  :aria-label="$t('video.subtitleAlignLeft')"
                  :aria-pressed="subtitleAlign === 'left'"
                  @click="setSubtitleAlignChoice('left')"
                >
                  <AlignLeft :size="16" />
                </button>
                <button
                  type="button"
                  class="vp__btn vp__btn--align"
                  :class="{ 'is-active': subtitleAlign === 'center' }"
                  :aria-label="$t('video.subtitleAlignCenter')"
                  :aria-pressed="subtitleAlign === 'center'"
                  @click="setSubtitleAlignChoice('center')"
                >
                  <AlignCenter :size="16" />
                </button>
                <button
                  type="button"
                  class="vp__btn vp__btn--align"
                  :class="{ 'is-active': subtitleAlign === 'right' }"
                  :aria-label="$t('video.subtitleAlignRight')"
                  :aria-pressed="subtitleAlign === 'right'"
                  @click="setSubtitleAlignChoice('right')"
                >
                  <AlignRight :size="16" />
                </button>
              </div>
            </div>

            <!-- Vertical position -->
            <div class="vp__panel-sub">
              <div class="vp__panel-label">{{ $t('video.subtitlePosition') }}</div>
              <div class="vp__panel-slider-row">
                <span>{{ $t('video.subtitlePositionDefault') }}</span>
                <input
                  type="range"
                  class="vp__slider vp__slider--panel"
                  min="0"
                  max="5"
                  step="1"
                  :value="subtitleOffset"
                  :aria-label="$t('video.subtitlePosition')"
                  @input="handleSubtitleOffsetInput"
                />
                <span>{{ $t('video.subtitlePositionUp') }}</span>
              </div>
            </div>

            <!-- Preview -->
            <div class="vp__panel-sub">
              <div class="vp__panel-label">{{ $t('video.subtitlePreview') }}</div>
              <div class="vp__subtitle-preview-wrap">
                <span class="vp__subtitle-preview" :style="subtitlePreviewStyle">
                  {{ $t('video.subtitlePreviewText') }}
                </span>
              </div>
            </div>

            <!-- Reset -->
            <div class="vp__panel-sub">
              <button type="button" class="vp__chip vp__chip--reset" @click="resetSubtitleStyles">
                <RotateCcw :size="12" />
                {{ $t('video.subtitleReset') }}
              </button>
            </div>
          </template>
        </div>

        <div v-if="qualities.length > 1" class="vp__panel-section">
          <div class="vp__panel-label">{{ $t('video.quality') }}</div>
          <div class="vp__panel-chips">
            <button
              v-for="q in qualities"
              :key="q"
              type="button"
              class="vp__chip"
              :class="{ 'is-active': currentQuality === q }"
              :aria-pressed="currentQuality === q"
              @click="setQuality(q)"
            >
              {{ q }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Subtitle picker -->
    <Transition name="vp-panel">
      <div
        v-if="showSubtitlePicker"
        :id="subtitlePanelId"
        class="vp__panel vp__panel--subs"
        @click.stop
      >
        <div class="vp__panel-head">
          <span class="vp__panel-title">{{ $t('video.subtitles') }}</span>
          <button
            type="button"
            class="vp__btn vp__btn--close"
            :aria-label="$t('common.close')"
            @click="showSubtitlePicker = false"
          >
            <X :size="18" />
          </button>
        </div>
        <button
          type="button"
          class="vp__sub-item"
          :class="{ 'is-active': !selectedSubtitleLanguage }"
          :aria-pressed="!selectedSubtitleLanguage"
          @click="setSubtitleLanguage(null)"
        >
          <span class="vp__sub-check" :class="{ visible: !selectedSubtitleLanguage }">✓</span>
          {{ $t('video.subtitlesOff') }}
        </button>
        <button
          v-for="track in normalizedSubtitles"
          :key="`pick-${track.language}`"
          type="button"
          class="vp__sub-item"
          :class="{ 'is-active': selectedSubtitleLanguage === track.language }"
          :aria-pressed="selectedSubtitleLanguage === track.language"
          @click="setSubtitleLanguage(track.language)"
        >
          <span
            class="vp__sub-check"
            :class="{ visible: selectedSubtitleLanguage === track.language }"
          >
            ✓
          </span>
          {{ track.label }}
        </button>
        <div v-if="selectedSubtitleLanguage" class="vp__panel-sub">
          <div class="vp__panel-label">{{ $t('video.subtitlePosition') }}</div>
          <div class="vp__panel-slider-row">
            <span>{{ $t('video.subtitlePositionDefault') }}</span>
            <input
              type="range"
              class="vp__slider vp__slider--panel"
              min="0"
              max="5"
              step="1"
              :value="subtitleOffset"
              :aria-label="$t('video.subtitlePosition')"
              @input="handleSubtitleOffsetInput"
            />
            <span>{{ $t('video.subtitlePositionUp') }}</span>
          </div>
          <div class="vp__panel-slider-row" style="margin-top: 0.5rem">
            <span>A</span>
            <input
              type="range"
              class="vp__slider vp__slider--panel"
              min="75"
              max="200"
              step="5"
              :value="Math.round(subtitleFontSize * 100)"
              :aria-label="$t('video.subtitleFontSize')"
              @input="handleSubtitleFontSizeInput"
            />
            <span style="font-size: 1.15em; font-weight: 600">A</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  getCurrentInstance,
  useTemplateRef,
} from 'vue'
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
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  X,
  RotateCcw,
} from 'lucide-vue-next'
import { useVideoSettings } from '@/composables/useVideoSettings'
import type { SubtitleShadowPreset, SubtitleAlign } from '@/composables/useVideoSettings'
import { useVideoGestures } from '@/composables/useVideoGestures'
import { apiClient } from '@/api/client'
import {
  buildSubtitleOverlayStyle,
  buildSubtitlePreviewStyle,
  formatTime,
  normalizeSubtitleTracks,
  SUBTITLE_BG_COLORS,
  SUBTITLE_COLORS,
  SUBTITLE_SHADOWS,
  type NormalizedSubtitleTrack,
  type SubtitleTrack,
} from './video-player/videoPlayerModel'

interface Props {
  src: string
  poster?: string
  playsinline?: boolean
  loop?: boolean
  preload?: 'auto' | 'metadata' | 'none'
  subtitles?: SubtitleTrack[] | null | undefined
}

const props = withDefaults(defineProps<Props>(), {
  playsinline: true,
  loop: false,
  preload: 'metadata',
  subtitles: null,
})

const emit = defineEmits<{
  ready: []
  play: []
  pause: []
  ended: []
  timeupdate: [time: number]
}>()

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
const CONTROLS_HIDE_DELAY = 3000
const SEEK_STEP = 5
const VOLUME_STEP = 0.1

const videoRef = useTemplateRef<HTMLVideoElement>('videoRef')
const playerElement = useTemplateRef<HTMLElement>('playerElement')
const settingsBtnRef = useTemplateRef<HTMLElement>('settingsBtnRef')
const isPlaying = ref(false)
const isBuffering = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const playbackRate = ref(1)
const currentQuality = ref('auto')
const isFullscreen = ref(false)
const showControls = ref(true)
const showControlHints = ref(true)
const showSettings = ref(false)
const showSubtitlePicker = ref(false)
const bufferedPercent = ref(0)
const isSeeking = ref(false)
const isSeekPending = ref(false)
const seekPreviewPercent = ref<number | null>(null)
const subtitleOverrides = ref<Record<string, string>>({})
const selectedSubtitleLanguage = ref<string | null>(null)
const qualities = ref<string[]>(['auto'])
const activeCueHtml = ref('')

const playerUid = getCurrentInstance()?.uid ?? 0
const settingsPanelId = `vp-settings-panel-${playerUid}`
const subtitlePanelId = `vp-subtitle-panel-${playerUid}`

let controlsTimeout: ReturnType<typeof setTimeout> | null = null
let seekPendingTimeout: ReturnType<typeof setTimeout> | null = null
let hintTimeout: ReturnType<typeof setTimeout> | null = null
let activeCueTrack: TextTrack | null = null

const { locale } = useI18n()

const {
  settings: videoSettings,
  setVolume: updateVolume,
  setMuted: updateMuted,
  setPlaybackRate: updatePlaybackRate,
  setLoop: updateLoop,
  setBrightness: updateBrightness,
  setSubtitleLanguage: updateSubtitleLanguage,
  setSubtitleOffset: updateSubtitleOffset,
  setSubtitleFontSize: updateSubtitleFontSize,
  setSubtitleColor: updateSubtitleColor,
  setSubtitleBgColor: updateSubtitleBgColor,
  setSubtitleBgOpacity: updateSubtitleBgOpacity,
  setSubtitleShadow: updateSubtitleShadow,
  setSubtitleAlign: updateSubtitleAlign,
} = useVideoSettings()

const volume = computed(() => videoSettings.value.volume)
const isMuted = computed(() => videoSettings.value.muted)
const brightness = computed(() => videoSettings.value.brightness)
const loopEnabled = computed(() => props.loop || videoSettings.value.loop)
const subtitleOffset = computed(() => videoSettings.value.subtitleOffset)
const subtitleFontSize = computed(() => videoSettings.value.subtitleFontSize)
const subtitleColor = computed(() => videoSettings.value.subtitleColor)
const subtitleBgColor = computed(() => videoSettings.value.subtitleBgColor)
const subtitleBgOpacity = computed(() => videoSettings.value.subtitleBgOpacity)
const subtitleShadow = computed(() => videoSettings.value.subtitleShadow)
const subtitleAlign = computed(() => videoSettings.value.subtitleAlign)

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
  onVolumeChange: (vol) => updateVolume(vol),
  onBrightnessChange: (bright) => updateBrightness(bright),
  onSeek: (time) => {
    if (videoRef.value) videoRef.value.currentTime = time
  },
  onTogglePlay: () => togglePlay(),
  onDoubleTap: () => toggleFullscreen(),
})

const apiBaseUrl = computed(
  () => import.meta.env.VITE_API_ENDPOINT || `${import.meta.env.VITE_API_URL || '/api'}/v1`
)

const playedPercent = computed(() => {
  const dur = duration.value
  if (!isFinite(dur) || dur <= 0) return 0
  return Math.min(100, Math.max(0, (currentTime.value / dur) * 100))
})

const displayPercent = computed(() => {
  const raw = seekPreviewPercent.value ?? playedPercent.value
  if (!isFinite(raw)) return 0
  return Math.min(100, Math.max(0, raw))
})

const supportsPiP = computed(() => document.pictureInPictureEnabled)

const normalizedSubtitles = computed<NormalizedSubtitleTrack[]>(() =>
  normalizeSubtitleTracks({
    tracks: props.subtitles,
    apiBaseUrl: apiBaseUrl.value,
    videoSrc: props.src,
    overrides: subtitleOverrides.value,
  })
)

// --- Subtitle helpers ---

function isSrtTrack(track: NormalizedSubtitleTrack): boolean {
  if (track.format?.toLowerCase() === 'srt') return true
  return track.src.toLowerCase().endsWith('.srt')
}

function toLocaleMatches(trackLang: string, target: string): boolean {
  const n = trackLang.toLowerCase()
  const t = target.toLowerCase()
  if (n === t) return true
  const base = t.split('-')[0]
  return n === base || n.startsWith(`${base}-`)
}

function pickDefaultSubtitle(tracks: NormalizedSubtitleTrack[]) {
  if (!tracks.length) return null
  const preferred = videoSettings.value.subtitleLanguage
  if (preferred) {
    const match = tracks.find((t) => toLocaleMatches(t.language, preferred))
    if (match) return match.language
  }
  const localeMatch = tracks.find((t) => toLocaleMatches(t.language, locale.value))
  if (localeMatch) return localeMatch.language
  return tracks[0]?.language ?? null
}

function needsFetchFallback(track: NormalizedSubtitleTrack): boolean {
  if (track.src.includes('/subtitle?language=')) return true
  if (isSrtTrack(track)) return true
  return false
}

function isLocalApiTrackSource(src: string): boolean {
  try {
    const resolved = new URL(src, window.location.origin)
    return resolved.origin === window.location.origin && resolved.pathname.startsWith('/api/')
  } catch {
    return false
  }
}

async function ensureVttFallback(track: NormalizedSubtitleTrack) {
  if (!needsFetchFallback(track)) return
  if (subtitleOverrides.value[track.src]) return
  try {
    const rawText = isLocalApiTrackSource(track.src)
      ? await apiClient.text(new URL(track.src, window.location.origin).toString())
      : await (async () => {
          const response = await fetch(track.src)
          if (!response.ok) return ''
          return response.text()
        })()
    if (!rawText) return
    const normalized = rawText.replace(/\r+/g, '')
    const body = normalized.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
    const vttText = body.trimStart().startsWith('WEBVTT') ? body : `WEBVTT\n\n${body.trim()}\n`
    const blobUrl = URL.createObjectURL(new Blob([vttText], { type: 'text/vtt' }))
    subtitleOverrides.value = { ...subtitleOverrides.value, [track.src]: blobUrl }
  } catch {
    // silently fail
  }
}

function syncSubtitleSelection(tracks: NormalizedSubtitleTrack[]) {
  if (!tracks.length) {
    selectedSubtitleLanguage.value = null
    return
  }
  const current = selectedSubtitleLanguage.value
  if (current && tracks.some((t) => t.language === current)) return
  selectedSubtitleLanguage.value = pickDefaultSubtitle(tracks)
}

function applySubtitleMode() {
  const textTracks = videoRef.value?.textTracks
  if (!textTracks) return
  const target = selectedSubtitleLanguage.value

  // Detach previous cuechange listener
  if (activeCueTrack) {
    activeCueTrack.removeEventListener('cuechange', onCueChange)
    activeCueTrack = null
  }
  activeCueHtml.value = ''

  for (let i = 0; i < textTracks.length; i += 1) {
    const track = textTracks[i]
    if (!track) continue
    if (target && track.language === target) {
      // 'hidden' loads cues without native rendering — we render our own overlay
      track.mode = 'hidden'
      activeCueTrack = track
      track.addEventListener('cuechange', onCueChange)
    } else {
      track.mode = 'disabled'
    }
  }
}

function onCueChange() {
  if (!activeCueTrack?.activeCues?.length) {
    activeCueHtml.value = ''
    return
  }
  const parts: string[] = []
  for (let i = 0; i < activeCueTrack.activeCues.length; i += 1) {
    const cue = activeCueTrack.activeCues[i] as VTTCue | undefined
    if (!cue || !('text' in cue)) continue
    // Strip VTT tags but keep line breaks
    const clean = cue.text
      .replace(/<[^>]+>/g, '')
      .split('\n')
      .filter((l) => l.trim())
      .join('<br>')
    if (clean) parts.push(clean)
  }
  activeCueHtml.value = parts.join('<br>')
}

/** Reactive style object for the custom subtitle overlay */
const subtitleOverlayStyle = computed(() =>
  buildSubtitleOverlayStyle({
    offset: subtitleOffset.value,
    fontSize: subtitleFontSize.value,
    color: subtitleColor.value,
    backgroundColor: subtitleBgColor.value,
    backgroundOpacity: subtitleBgOpacity.value,
    shadow: subtitleShadow.value,
    align: subtitleAlign.value,
  })
)

/** Preview style for the settings panel */
const subtitlePreviewStyle = computed(() =>
  buildSubtitlePreviewStyle({
    color: subtitleColor.value,
    backgroundColor: subtitleBgColor.value,
    backgroundOpacity: subtitleBgOpacity.value,
    shadow: subtitleShadow.value,
  })
)

// --- Core playback ---

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

function togglePlay() {
  if (!videoRef.value) return
  if (isPlaying.value) videoRef.value.pause()
  else videoRef.value.play()
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
  markSeekPending(((videoRef.value?.currentTime ?? 0) / dur) * 100)
}

function onSeeked() {
  if (!isBuffering.value) clearSeekPending()
}

// --- Seek ---

function markSeekPending(percent?: number) {
  if (typeof percent === 'number') seekPreviewPercent.value = Math.min(100, Math.max(0, percent))
  isSeekPending.value = true
  if (seekPendingTimeout) clearTimeout(seekPendingTimeout)
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

function seekFromClick(event: MouseEvent) {
  if (!videoRef.value || !event.currentTarget) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
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

function handleProgressKeydown(event: KeyboardEvent) {
  if (!videoRef.value || duration.value <= 0) return

  const step = event.shiftKey ? SEEK_STEP * 3 : SEEK_STEP
  let nextTime: number | null = null

  switch (event.key) {
    case 'ArrowLeft':
      nextTime = currentTime.value - step
      break
    case 'ArrowRight':
      nextTime = currentTime.value + step
      break
    case 'Home':
      nextTime = 0
      break
    case 'End':
      nextTime = duration.value
      break
    default:
      return
  }

  event.preventDefault()
  event.stopPropagation()

  const clampedTime = Math.max(0, Math.min(duration.value, nextTime))
  const delta = clampedTime - currentTime.value
  currentTime.value = clampedTime
  markSeekPending((clampedTime / duration.value) * 100)
  videoRef.value.currentTime = clampedTime

  if (Math.abs(delta) > 0.2) {
    triggerSeekIndicator(delta > 0 ? 'forward' : 'backward', Math.round(Math.abs(delta)))
  }
}

function startSeekDrag(event: MouseEvent | TouchEvent) {
  if (!videoRef.value) return
  isSeeking.value = true
  showControls.value = true
  updateSeek(event)
  document.addEventListener('mousemove', updateSeek)
  document.addEventListener('mouseup', stopSeekDrag)
  document.addEventListener('touchmove', updateSeek, { passive: false })
  document.addEventListener('touchend', stopSeekDrag)
}

function updateSeek(event: MouseEvent | TouchEvent) {
  if (!videoRef.value) return
  const progress = playerElement.value?.querySelector('.vp__progress') as HTMLElement | null
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

// --- Controls ---

function toggleMute() {
  if (!videoRef.value) return
  videoRef.value.muted = !videoRef.value.muted
  triggerVolumeIndicator(videoRef.value.muted ? 0 : Math.round(volume.value * 100))
}

function handleVolumeInput(event: Event) {
  if (!videoRef.value || !event.target) return
  const value = parseInt((event.target as HTMLInputElement).value, 10)
  if (isNaN(value)) return
  const newVol = Math.max(0, Math.min(1, value / 100))
  videoRef.value.volume = newVol
  updateVolume(newVol)
  triggerVolumeIndicator(Math.round(newVol * 100))
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

function setLoopEnabled(enabled: boolean) {
  updateLoop(enabled)
}

function setQuality(quality: string) {
  currentQuality.value = quality
  showSettings.value = false
}

function setSubtitleLanguage(language: string | null) {
  selectedSubtitleLanguage.value = language
  showSubtitlePicker.value = false
  showSettings.value = false
}

function handleSubtitleOffsetInput(e: Event) {
  const val = Number((e.target as HTMLInputElement).value)
  updateSubtitleOffset(val)
}

function handleSubtitleFontSizeInput(e: Event) {
  const val = Number((e.target as HTMLInputElement).value)
  updateSubtitleFontSize(val / 100)
}

function handleSubtitleBgOpacityInput(e: Event) {
  const val = Number((e.target as HTMLInputElement).value)
  updateSubtitleBgOpacity(val / 100)
}

function setSubtitleColorChoice(color: string) {
  updateSubtitleColor(color)
}

function setSubtitleBgColorChoice(color: string) {
  updateSubtitleBgColor(color)
}

function setSubtitleShadowChoice(shadow: SubtitleShadowPreset) {
  updateSubtitleShadow(shadow)
}

function setSubtitleAlignChoice(align: SubtitleAlign) {
  updateSubtitleAlign(align)
}

function resetSubtitleStyles() {
  updateSubtitleFontSize(1)
  updateSubtitleColor('#ffffff')
  updateSubtitleBgColor('#000000')
  updateSubtitleBgOpacity(0.75)
  updateSubtitleShadow('none')
  updateSubtitleAlign('center')
  updateSubtitleOffset(0)
}

function toggleSettingsPanel() {
  showSubtitlePicker.value = false
  showSettings.value = !showSettings.value
}

function toggleSubtitlePicker() {
  showSettings.value = false
  showSubtitlePicker.value = !showSubtitlePicker.value
}

function closeAllPanels() {
  showSettings.value = false
  showSubtitlePicker.value = false
}

async function togglePiP() {
  if (!videoRef.value || !document.pictureInPictureEnabled) return
  try {
    if (document.pictureInPictureElement) await document.exitPictureInPicture()
    else await videoRef.value.requestPictureInPicture()
  } catch {
    /* ignore */
  }
}

async function toggleFullscreen() {
  if (!playerElement.value) return
  try {
    if (!document.fullscreenElement) {
      await playerElement.value.requestFullscreen()
      isFullscreen.value = true
    } else {
      await document.exitFullscreen()
      isFullscreen.value = false
    }
  } catch {
    /* ignore */
  }
}

// --- Timer / visibility ---

function startControlsTimer() {
  stopControlsTimer()
  controlsTimeout = setTimeout(() => {
    if (isPlaying.value) showControls.value = false
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
  if (isPlaying.value) startControlsTimer()
}

function handleMouseLeave() {
  if (isPlaying.value) startControlsTimer()
}

function startHintTimer() {
  showControlHints.value = true
  if (hintTimeout) clearTimeout(hintTimeout)
  hintTimeout = setTimeout(() => {
    showControlHints.value = false
  }, 2600)
}

// --- Keyboard ---

function handleKeydown(event: KeyboardEvent) {
  if (!videoRef.value) return
  const isPlayerFocused = playerElement.value?.contains(document.activeElement)
  if (!isPlayerFocused && document.activeElement?.tagName !== 'BODY') return

  switch (event.key) {
    case 'Escape':
      if (showSettings.value || showSubtitlePicker.value) {
        event.preventDefault()
        closeAllPanels()
      }
      break
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
  const target = event.target as Element
  if (showSubtitlePicker.value && !target.closest?.('.vp__panel--subs')) {
    showSubtitlePicker.value = false
  }
  if (
    showSettings.value &&
    !target.closest?.('.vp__panel--settings') &&
    !settingsBtnRef.value?.contains(target as Node)
  ) {
    showSettings.value = false
  }
}

// --- Lifecycle ---

onMounted(() => {
  startHintTimer()
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('click', handleClickOutside)

  if (videoRef.value) {
    videoRef.value.volume = videoSettings.value.volume
    videoRef.value.muted = videoSettings.value.muted
    videoRef.value.playbackRate = videoSettings.value.playbackRate
    playbackRate.value = videoSettings.value.playbackRate
  }
  currentVolume.value = videoSettings.value.volume
  currentBrightness.value = videoSettings.value.brightness
})

watch(brightness, (val) => {
  if (videoRef.value) videoRef.value.style.filter = `brightness(${val})`
})

watch(normalizedSubtitles, (tracks) => {
  syncSubtitleSelection(tracks)
  tracks.forEach((t) => void ensureVttFallback(t))
})

watch([selectedSubtitleLanguage, () => videoSettings.value.subtitleLanguage], ([cur, stored]) => {
  if (cur !== stored) updateSubtitleLanguage(cur)
  applySubtitleMode()
})

watch(
  () => locale.value,
  () => syncSubtitleSelection(normalizedSubtitles.value)
)

onBeforeUnmount(() => {
  Object.values(subtitleOverrides.value).forEach((url) => URL.revokeObjectURL(url))
  if (activeCueTrack) {
    activeCueTrack.removeEventListener('cuechange', onCueChange)
    activeCueTrack = null
  }
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
</script>

<style scoped>
/* ============================================================
   Video Player — Theme-aware, responsive controls
   Uses CSS custom properties from design tokens & ui-style.
   ============================================================ */

/* --- Player shell --- */
.vp {
  --vp-radius: var(--radius-xl);
  --vp-ctrl-bg: rgba(0, 0, 0, 0.6);
  --vp-ctrl-text: rgba(255, 255, 255, 0.92);
  --vp-ctrl-text-dim: rgba(255, 255, 255, 0.55);
  --vp-ctrl-hover: rgba(255, 255, 255, 0.12);
  --vp-ctrl-border: rgba(255, 255, 255, 0.1);
  --vp-accent: var(--color-primary);
  --vp-accent-rgb: var(--color-primary-rgb);
  --vp-btn-size: 2.25rem;
  --vp-progress-h: 3px;
  --vp-progress-h-active: 5px;

  position: relative;
  width: 100%;
  height: 100%;
  min-height: 12.5rem;
  background: #000;
  border-radius: var(--vp-radius);
  overflow: hidden;
  cursor: default;
  isolation: isolate;
  user-select: none;
}

.vp:focus-visible {
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
}

.vp.is-fullscreen {
  border-radius: 0;
}

.vp.is-idle {
  cursor: none;
}

.vp.is-buffering .vp__video {
  filter: brightness(0.7);
  transition: filter 0.4s ease;
}

.vp__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  background: #000;
}

/* --- Gradient overlays --- */
.vp__gradient {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.vp__gradient--top {
  top: 0;
  height: 5rem;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.4) 0%, transparent 100%);
}

.vp__gradient--bottom {
  bottom: 0;
  height: 8rem;
  background: linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.7) 0%,
    rgba(0, 0, 0, 0.3) 50%,
    transparent 100%
  );
}

.vp__controls.is-visible .vp__gradient {
  opacity: 1;
}

/* --- Controls wrapper --- */
.vp__controls {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  opacity: 0;
  transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  z-index: 2;
}

.vp__controls.is-visible {
  opacity: 1;
  pointer-events: auto;
}

.vp:hover .vp__controls {
  opacity: 1;
  pointer-events: auto;
}

.vp:has(.vp__progress.is-active) .vp__controls {
  opacity: 1;
  pointer-events: auto;
}

/* --- Bottom bar --- */
.vp__bar {
  position: relative;
  z-index: 2;
  padding: 0 var(--spacing-3) var(--spacing-2);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

/* --- Progress bar --- */
.vp__progress {
  width: 100%;
  height: 1.5rem;
  display: flex;
  align-items: flex-end;
  cursor: pointer;
  position: relative;
  touch-action: none;
}

.vp__progress-track {
  position: relative;
  width: 100%;
  height: var(--vp-progress-h);
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-full);
  overflow: visible;
  transition: height 0.15s var(--ease-out, ease);
}

.vp__progress:hover .vp__progress-track,
.vp__progress:focus-visible .vp__progress-track,
.vp__progress.is-active .vp__progress-track {
  height: var(--vp-progress-h-active);
}

.vp__progress:focus-visible .vp__progress-track {
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.35);
}

.vp__progress-buffered {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: rgba(255, 255, 255, 0.35);
  border-radius: inherit;
  transition: width 0.3s ease;
}

.vp__progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: var(--vp-accent);
  border-radius: inherit;
  transition: width 0.08s linear;
  box-shadow: 0 0 6px rgba(var(--vp-accent-rgb), 0.35);
}

.vp__progress.is-active .vp__progress-fill {
  transition: none;
}

.vp__progress-thumb {
  position: absolute;
  top: 50%;
  width: 0.875rem;
  height: 0.875rem;
  background: var(--vp-accent);
  border-radius: 50%;
  box-shadow:
    0 0 0 2px rgba(255, 255, 255, 0.85),
    0 2px 6px rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%) scale(0);
  transition: transform 0.15s var(--ease-out, ease);
  pointer-events: none;
}

.vp__progress:hover .vp__progress-thumb,
.vp__progress:focus-visible .vp__progress-thumb,
.vp__progress.is-active .vp__progress-thumb {
  transform: translate(-50%, -50%) scale(1);
}

.vp__progress.is-active .vp__progress-thumb {
  transform: translate(-50%, -50%) scale(1.2);
  box-shadow:
    0 0 0 3px rgba(var(--vp-accent-rgb), 0.3),
    0 2px 8px rgba(0, 0, 0, 0.35);
}

/* --- Button row --- */
.vp__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-1);
  min-width: 0;
}

.vp__group {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.vp__group--right {
  flex-shrink: 1;
}

/* --- Buttons --- */
.vp__btn {
  width: var(--vp-btn-size);
  height: var(--vp-btn-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--ui-radius-button, var(--radius-lg));
  color: var(--vp-ctrl-text);
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    transform 0.1s ease;
  flex-shrink: 0;
  padding: 0;
}

.vp__btn:hover {
  background: var(--vp-ctrl-hover);
  color: #fff;
}

.vp__btn:active {
  transform: scale(0.9);
}

.vp__btn--cc {
  width: auto;
  min-width: 2rem;
  height: 1.625rem;
  padding: 0 var(--spacing-2);
  font-size: 0.6875rem;
  font-weight: var(--font-bold);
  letter-spacing: 0.06em;
  border: 1.5px solid var(--vp-ctrl-border);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.05);
}

.vp__btn--cc.is-active {
  border-color: var(--vp-accent);
  color: var(--vp-accent);
  background: rgba(var(--vp-accent-rgb), 0.15);
}

/* --- Time display --- */
.vp__time {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 0.8125rem;
  color: var(--vp-ctrl-text);
  font-variant-numeric: tabular-nums;
  padding-left: var(--spacing-1);
  white-space: nowrap;
}

.vp__time-current {
  color: #fff;
}
.vp__time-sep {
  opacity: 0.4;
  padding: 0 1px;
}
.vp__time-total {
  opacity: 0.65;
}

/* --- Volume (desktop) --- */
.vp__volume {
  display: flex;
  align-items: center;
}

.vp__volume-track {
  width: 0;
  opacity: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  transition:
    width 0.2s var(--ease-out, ease),
    opacity 0.15s ease;
}

.vp__volume:hover .vp__volume-track {
  width: 4.5rem;
  opacity: 1;
}

/* --- Shared slider --- */
.vp__slider {
  width: 100%;
  height: 3px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-full);
  outline: none;
  cursor: pointer;
}

.vp__slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 0.75rem;
  height: 0.75rem;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.vp__slider::-moz-range-thumb {
  width: 0.75rem;
  height: 0.75rem;
  background: #fff;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.vp__slider--panel {
  flex: 1;
  min-width: 0;
  height: 0.25rem;
}

.vp__slider--panel::-webkit-slider-thumb {
  width: 0.875rem;
  height: 0.875rem;
}

.vp__slider--panel::-moz-range-thumb {
  width: 0.875rem;
  height: 0.875rem;
}

/* --- Gesture indicator --- */
.vp__indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-3) var(--spacing-5);
  background: var(--vp-ctrl-bg);
  backdrop-filter: blur(1rem);
  -webkit-backdrop-filter: blur(1rem);
  border-radius: var(--ui-radius-dialog, var(--radius-2xl));
  color: #fff;
  pointer-events: none;
}

.vp__indicator-val {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  font-variant-numeric: tabular-nums;
}

/* --- Center play --- */
.vp__center-play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
  width: 4rem;
  height: 4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-ctrl-bg);
  backdrop-filter: blur(0.75rem);
  -webkit-backdrop-filter: blur(0.75rem);
  border: 1.5px solid var(--vp-ctrl-border);
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  padding: 0;
  transition:
    transform 0.2s var(--ease-out, ease),
    background 0.2s ease;
}

.vp__center-play:hover {
  transform: translate(-50%, -50%) scale(1.08);
  background: rgba(var(--vp-accent-rgb), 0.6);
  border-color: rgba(var(--vp-accent-rgb), 0.4);
}

.vp__center-play:active {
  transform: translate(-50%, -50%) scale(0.94);
}

/* --- Loader --- */
.vp__loader {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
  color: #fff;
  filter: drop-shadow(0 0.125rem 0.5rem rgba(0, 0, 0, 0.4));
}

/* --- Keyboard hint --- */
.vp__hint {
  position: absolute;
  bottom: 5rem;
  left: var(--spacing-3);
  padding: 0.375rem 0.75rem;
  border-radius: var(--radius-full);
  background: var(--vp-ctrl-bg);
  backdrop-filter: blur(0.625rem);
  -webkit-backdrop-filter: blur(0.625rem);
  color: rgba(255, 255, 255, 0.8);
  font-size: var(--text-xs);
  opacity: 0;
  transform: translateY(0.25rem);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
  pointer-events: none;
  z-index: 10;
}

.vp__hint.is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* --- Panel backdrop (mobile tap-to-close) --- */
.vp__panel-backdrop {
  display: none;
}

.vp__panel-backdrop:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px rgba(var(--color-primary-rgb), 0.35);
}

/* --- Panel header with close button --- */
.vp__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-2);
  padding-bottom: var(--spacing-2);
  border-bottom: 1px solid var(--vp-ctrl-border);
}

.vp__panel-title {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--vp-ctrl-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.vp__btn--close {
  width: 1.75rem;
  height: 1.75rem;
  flex-shrink: 0;
}

/* --- Panels (settings / subtitle picker) --- */
.vp__panel {
  position: absolute;
  bottom: 4.5rem;
  right: var(--spacing-3);
  z-index: 10;
  min-width: 13rem;
  max-height: calc(100% - 5.5rem);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--spacing-3);
  background: var(--vp-ctrl-bg);
  backdrop-filter: blur(1.5rem) saturate(1.2);
  -webkit-backdrop-filter: blur(1.5rem) saturate(1.2);
  border: 1px solid var(--vp-ctrl-border);
  border-radius: var(--ui-radius-dialog, var(--radius-xl));
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  color: var(--vp-ctrl-text);
}

.vp__panel--subs {
  right: auto;
  left: var(--spacing-3);
  min-width: 11rem;
}

.vp__panel-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.vp__panel-section + .vp__panel-section {
  margin-top: var(--spacing-3);
  padding-top: var(--spacing-3);
  border-top: 1px solid var(--vp-ctrl-border);
}

.vp__panel-label {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--vp-ctrl-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.vp__panel-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.vp__chip {
  padding: 0.3125rem var(--spacing-3);
  background: transparent;
  border: 1px solid var(--vp-ctrl-border);
  border-radius: var(--ui-radius-button, var(--radius-md));
  color: var(--vp-ctrl-text);
  font-size: var(--text-sm);
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.vp__chip:hover {
  background: var(--vp-ctrl-hover);
  border-color: rgba(255, 255, 255, 0.2);
}

.vp__chip.is-active {
  background: rgba(var(--vp-accent-rgb), 0.2);
  border-color: rgba(var(--vp-accent-rgb), 0.5);
  color: var(--vp-accent);
}

.vp__panel-sub {
  margin-top: var(--spacing-2);
}

.vp__panel-slider-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-top: var(--spacing-1);
  font-size: var(--text-xs);
  color: var(--vp-ctrl-text-dim);
  white-space: nowrap;
}

/* --- Subtitle picker items --- */
.vp__sub-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  width: 100%;
  padding: var(--spacing-2) var(--spacing-3);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--vp-ctrl-text);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: background 0.15s ease;
  text-align: left;
}

.vp__sub-item:hover {
  background: var(--vp-ctrl-hover);
}

.vp__sub-item.is-active {
  background: rgba(var(--vp-accent-rgb), 0.2);
  color: var(--vp-accent);
}

.vp__sub-check {
  width: 1rem;
  font-size: var(--text-xs);
  opacity: 0;
  flex-shrink: 0;
}

.vp__sub-check.visible {
  opacity: 1;
}

/* --- Subtitle style controls --- */
.vp__color-swatches {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
  margin-top: var(--spacing-1);
}

.vp__swatch {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: var(--radius-full);
  background: var(--swatch-color);
  border: 2px solid transparent;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    transform 0.1s ease;
  padding: 0;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
}

.vp__swatch:hover {
  transform: scale(1.15);
}

.vp__swatch.is-active {
  border-color: var(--vp-accent);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.15),
    0 0 0 2px rgba(var(--vp-accent-rgb), 0.3);
}

.vp__align-group {
  display: flex;
  gap: 2px;
  margin-top: var(--spacing-1);
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--ui-radius-button, var(--radius-lg));
  padding: 2px;
}

.vp__btn--align {
  width: 2rem;
  height: 1.75rem;
  border-radius: calc(var(--ui-radius-button, var(--radius-lg)) - 0.125rem);
}

.vp__btn--align.is-active {
  background: rgba(var(--vp-accent-rgb), 0.2);
  color: var(--vp-accent);
}

/* --- Custom subtitle overlay --- */
.vp__subtitle-overlay {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 4;
  max-width: 85%;
  padding: 0.25em 0.5em;
  border-radius: var(--radius-sm);
  font-size: 1em;
  line-height: 1.5;
  font-family: inherit;
  pointer-events: none;
  text-align: center;
  word-break: break-word;
  transition:
    bottom 0.2s ease,
    color 0.15s ease,
    background-color 0.15s ease;
}

.vp__subtitle-text {
  display: inline;
}

/* --- Subtitle preview in settings --- */
.vp__subtitle-preview-wrap {
  margin-top: var(--spacing-1);
  padding: var(--spacing-3);
  background: #111;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 3rem;
}

.vp__subtitle-preview {
  padding: 0.2em 0.5em;
  border-radius: calc(var(--radius-sm) / 2);
  font-size: var(--text-sm);
  line-height: 1.5;
  transition:
    color 0.15s ease,
    background-color 0.15s ease;
}

/* --- Reset chip --- */
.vp__chip--reset {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--vp-ctrl-text-dim);
  border-color: transparent;
  font-size: var(--text-xs);
  padding: 0.25rem var(--spacing-2);
}

.vp__chip--reset:hover {
  color: var(--vp-ctrl-text);
  border-color: var(--vp-ctrl-border);
}

/* --- Transitions --- */
.vp-fade-enter-active,
.vp-fade-leave-active {
  transition: opacity 0.2s ease;
}

.vp-fade-enter-from,
.vp-fade-leave-to {
  opacity: 0;
}

.vp-scale-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s var(--ease-out, ease);
}

.vp-scale-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.vp-scale-enter-from {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.8);
}

.vp-scale-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(1.1);
}

.vp-panel-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s var(--ease-out, ease);
}

.vp-panel-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.vp-panel-enter-from {
  opacity: 0;
  transform: translateY(0.5rem);
}

.vp-panel-leave-to {
  opacity: 0;
  transform: translateY(0.25rem);
}

/* ============================================================
   Mobile responsive
   ============================================================ */
@media (max-width: 768px) {
  .vp__bar {
    padding: 0 var(--spacing-2) var(--spacing-2);
  }

  /* Issue 2: More opaque controls background on mobile non-fullscreen */
  .vp__gradient--bottom {
    height: 10rem;
    background: linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.85) 0%,
      rgba(0, 0, 0, 0.5) 40%,
      transparent 100%
    );
  }

  .vp__btn {
    width: 2.5rem;
    height: 2.5rem;
  }

  .vp__btn--hide-mobile {
    display: none;
  }

  .vp__time {
    font-size: var(--text-xs);
  }

  /* Volume: always show slider on mobile (no hover) */
  .vp__volume-track {
    width: 3rem;
    opacity: 1;
  }

  .vp__center-play {
    width: 3.5rem;
    height: 3.5rem;
  }

  .vp__subtitle-overlay {
    max-width: 92%;
    font-size: 0.875em;
  }

  .vp__progress {
    --vp-progress-h: 3px;
    --vp-progress-h-active: 6px;
    height: 1.75rem;
  }

  /* Panel backdrop: tap outside to close */
  .vp__panel-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: calc(var(--z-modal, 1000) - 1);
    -webkit-tap-highlight-color: transparent;
  }

  /* Issue 1 & 4: Bottom sheet panels — account for navbar, more opaque */
  .vp__panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    top: auto;
    min-width: unset;
    max-height: min(60svh, calc(100dvh - var(--navbar-height, 3.5rem) - 1rem));
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    border-radius: var(--ui-radius-sheet, 1.125rem) var(--ui-radius-sheet, 1.125rem) 0 0;
    padding: var(--spacing-4);
    padding-top: calc(var(--spacing-3) + 0.5rem);
    padding-bottom: calc(var(--spacing-4) + env(safe-area-inset-bottom));
    background: rgba(20, 20, 22, 0.97);
    backdrop-filter: blur(1.5rem) saturate(1.2);
    -webkit-backdrop-filter: blur(1.5rem) saturate(1.2);
    border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
    border-bottom: none;
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.35);
    color: var(--color-text-primary, #fff);
    z-index: var(--z-modal, 1000);
  }

  /* Drag handle indicator for mobile bottom sheet */
  .vp__panel::before {
    content: '';
    display: block;
    width: 2rem;
    height: 0.25rem;
    background: rgba(255, 255, 255, 0.25);
    border-radius: var(--radius-full);
    margin: 0 auto var(--spacing-3);
    flex-shrink: 0;
  }

  .vp__panel-head {
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  .vp__panel-title {
    color: var(--color-text-secondary, rgba(255, 255, 255, 0.6));
    font-size: var(--text-sm);
  }

  .vp__btn--close {
    width: 2rem;
    height: 2rem;
    color: var(--color-text-secondary, rgba(255, 255, 255, 0.6));
  }

  .vp__panel--subs {
    left: 0;
    right: 0;
  }

  /* Theme-aware panel text on mobile */
  .vp__panel-label {
    color: var(--color-text-secondary, rgba(255, 255, 255, 0.55));
  }

  .vp__chip {
    border-color: var(--glass-border, rgba(255, 255, 255, 0.12));
    color: var(--color-text-primary, rgba(255, 255, 255, 0.85));
  }

  .vp__chip:hover {
    background: rgba(var(--vp-accent-rgb), 0.06);
    border-color: var(--glass-border-strong, rgba(255, 255, 255, 0.2));
  }

  .vp__sub-item {
    padding: var(--spacing-3) var(--spacing-4);
    min-height: 2.75rem;
    font-size: var(--text-base);
    color: var(--color-text-primary, rgba(255, 255, 255, 0.9));
  }

  .vp__panel-slider-row {
    color: var(--color-text-tertiary, rgba(255, 255, 255, 0.5));
  }

  .vp__panel-slider-row .vp__slider--panel {
    height: 0.375rem;
    background: var(--glass-border, rgba(255, 255, 255, 0.2));
  }

  .vp__panel-slider-row .vp__slider--panel::-webkit-slider-thumb {
    width: 1.25rem;
    height: 1.25rem;
  }

  .vp__panel-slider-row .vp__slider--panel::-moz-range-thumb {
    width: 1.25rem;
    height: 1.25rem;
  }

  /* Subtitle swatches: larger touch targets on mobile */
  .vp__swatch {
    width: 2rem;
    height: 2rem;
  }

  .vp__btn--align {
    width: 2.5rem;
    height: 2.25rem;
  }

  /* Panel transition: slide up on mobile */
  .vp-panel-enter-from {
    opacity: 0;
    transform: translateY(100%);
  }

  .vp-panel-leave-to {
    opacity: 0;
    transform: translateY(100%);
  }

  .vp-panel-enter-active {
    transition:
      opacity 0.25s ease,
      transform 0.3s var(--ease-out, ease);
  }

  .vp-panel-leave-active {
    transition:
      opacity 0.2s ease,
      transform 0.25s ease;
  }

  .vp__hint {
    bottom: 4.5rem;
    font-size: 0.625rem;
  }
}

/* Mobile panel theme overrides — light theme */
@media (max-width: 768px) {
  :root .vp__panel,
  [data-theme='blue'] .vp__panel {
    background: rgba(255, 255, 255, 0.97);
    border-color: rgba(0, 0, 0, 0.06);
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.1);
    color: var(--color-text-primary, #0f172a);
  }

  :root .vp__panel::before,
  [data-theme='blue'] .vp__panel::before {
    background: rgba(0, 0, 0, 0.15);
  }

  :root .vp__panel-head,
  [data-theme='blue'] .vp__panel-head {
    border-bottom-color: rgba(0, 0, 0, 0.08);
  }

  :root .vp__panel-title,
  [data-theme='blue'] .vp__panel-title {
    color: var(--color-text-secondary, #475569);
  }

  :root .vp__btn--close,
  [data-theme='blue'] .vp__btn--close {
    color: var(--color-text-secondary, #475569);
  }

  :root .vp__panel-label,
  [data-theme='blue'] .vp__panel-label {
    color: var(--color-text-tertiary, #64748b);
  }

  :root .vp__chip,
  [data-theme='blue'] .vp__chip {
    border-color: rgba(0, 0, 0, 0.1);
    color: var(--color-text-primary, #0f172a);
  }

  :root .vp__chip:hover,
  [data-theme='blue'] .vp__chip:hover {
    background: rgba(0, 0, 0, 0.04);
    border-color: rgba(0, 0, 0, 0.15);
  }

  :root .vp__sub-item,
  [data-theme='blue'] .vp__sub-item {
    color: var(--color-text-primary, #0f172a);
  }

  :root .vp__sub-item:hover,
  [data-theme='blue'] .vp__sub-item:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  :root .vp__panel-slider-row,
  [data-theme='blue'] .vp__panel-slider-row {
    color: var(--color-text-tertiary, #64748b);
  }

  :root .vp__panel-slider-row .vp__slider--panel,
  [data-theme='blue'] .vp__panel-slider-row .vp__slider--panel {
    background: rgba(0, 0, 0, 0.1);
  }

  :root .vp__panel-slider-row .vp__slider--panel::-webkit-slider-thumb,
  [data-theme='blue'] .vp__panel-slider-row .vp__slider--panel::-webkit-slider-thumb {
    background: var(--color-primary, #18181b);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  }

  :root .vp__panel-slider-row .vp__slider--panel::-moz-range-thumb,
  [data-theme='blue'] .vp__panel-slider-row .vp__slider--panel::-moz-range-thumb {
    background: var(--color-primary, #18181b);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  }

  :root .vp__panel-backdrop,
  [data-theme='blue'] .vp__panel-backdrop {
    background: rgba(0, 0, 0, 0.2);
  }

  :root .vp__subtitle-preview-wrap,
  [data-theme='blue'] .vp__subtitle-preview-wrap {
    background: #1e293b;
  }

  /* Blue theme accent tint on panel */
  [data-theme='blue'] .vp__panel {
    border-color: rgba(59, 130, 246, 0.1);
  }

  [data-theme='blue'] .vp__chip.is-active {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.3);
    color: #2563eb;
  }
}

/* Fullscreen: panels stay inside player */
.vp.is-fullscreen .vp__panel {
  position: absolute;
  bottom: 4.5rem;
  left: auto;
  right: var(--spacing-3);
  max-height: calc(100% - 5.5rem);
  border-radius: var(--ui-radius-dialog, var(--radius-xl));
  background: var(--vp-ctrl-bg);
  backdrop-filter: blur(1.5rem) saturate(1.2);
  -webkit-backdrop-filter: blur(1.5rem) saturate(1.2);
  border: 1px solid var(--vp-ctrl-border);
  color: var(--vp-ctrl-text);
  z-index: 10;
}

.vp.is-fullscreen .vp__panel::before {
  display: none;
}

.vp.is-fullscreen .vp__panel-backdrop {
  display: none;
}

.vp.is-fullscreen .vp__panel--subs {
  right: auto;
  left: var(--spacing-3);
}

.vp.is-fullscreen .vp__panel-label,
.vp.is-fullscreen .vp__panel-title {
  color: var(--vp-ctrl-text-dim);
}

.vp.is-fullscreen .vp__chip {
  border-color: var(--vp-ctrl-border);
  color: var(--vp-ctrl-text);
}

.vp.is-fullscreen .vp__sub-item {
  color: var(--vp-ctrl-text);
}

.vp.is-fullscreen .vp__btn--close {
  color: var(--vp-ctrl-text-dim);
}

.vp.is-fullscreen .vp__panel-slider-row {
  color: var(--vp-ctrl-text-dim);
}

/* ============================================================
   Reduced motion
   ============================================================ */
@media (prefers-reduced-motion: reduce) {
  .vp__controls,
  .vp__progress-thumb,
  .vp__volume-track,
  .vp__btn,
  .vp__center-play,
  .vp__gradient {
    transition: none;
  }

  .vp-fade-enter-active,
  .vp-fade-leave-active,
  .vp-scale-enter-active,
  .vp-scale-leave-active,
  .vp-panel-enter-active,
  .vp-panel-leave-active {
    transition: none;
  }
}
</style>
