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
              ref="subtitleBtnRef"
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
        <SafeHtml as="span" class="vp__subtitle-text" :html="activeCueHtml" />
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
        v-click-outside="{ handler: () => (showSettings = false), include: [settingsBtnRef] }"
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
        v-click-outside="{
          handler: () => (showSubtitlePicker = false),
          include: [subtitleBtnRef],
        }"
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
} from '@lucide/vue'
import SafeHtml from '@/components/ui/SafeHtml.vue'
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
const subtitleBtnRef = useTemplateRef<HTMLElement>('subtitleBtnRef')
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

// --- Lifecycle ---

onMounted(() => {
  startHintTimer()
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('fullscreenchange', handleFullscreenChange)

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
  stopControlsTimer()
  stopSeekDrag()
  clearSeekPending()
  if (hintTimeout) {
    clearTimeout(hintTimeout)
    hintTimeout = null
  }
})
</script>

<style scoped src="./video-player/video-player-view.css"></style>
