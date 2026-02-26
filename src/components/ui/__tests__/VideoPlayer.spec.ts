import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import VideoPlayer from '../VideoPlayer.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      video: {
        playbackSpeed: 'Playback Speed',
        quality: 'Quality',
        auto: 'Auto',
        player: 'Video player',
        play: 'Play',
        pause: 'Pause',
        volume: 'Volume',
        mute: 'Mute',
        unmute: 'Unmute',
        fullscreen: 'Fullscreen',
        pip: 'Picture in picture',
        settings: 'Settings',
        loop: 'Loop',
        loopOn: 'On',
        loopOff: 'Off',
        subtitles: 'Subtitles',
        subtitlesOff: 'Off',
        subtitlePosition: 'Subtitle Position',
        subtitlePositionDefault: 'Default',
        subtitlePositionUp: 'Up',
        keyboardHint: 'Space: play/pause · ←/→ seek · M mute · F fullscreen',
      },
    },
  },
})

interface VideoPlayerProps {
  src: string
  poster?: string
  playsinline?: boolean
  loop?: boolean
}

const createWrapper = (props: VideoPlayerProps) => {
  return mount(VideoPlayer, {
    props,
    global: {
      plugins: [i18n],
    },
  })
}

describe('VideoPlayer', () => {
  let mockPlay: ReturnType<typeof vi.fn>
  let mockPause: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockPlay = vi.fn().mockResolvedValue(undefined)
    mockPause = vi.fn()
    HTMLMediaElement.prototype.play = mockPlay
    HTMLMediaElement.prototype.pause = mockPause
    HTMLMediaElement.prototype.load = vi.fn()

    Object.defineProperty(document, 'pictureInPictureEnabled', {
      writable: true,
      value: true,
    })
    Object.defineProperty(document, 'fullscreenElement', {
      writable: true,
      value: null,
    })
    document.exitFullscreen = vi.fn().mockResolvedValue(undefined)
    document.exitPictureInPicture = vi.fn().mockResolvedValue(undefined)

    HTMLVideoElement.prototype.requestPictureInPicture = vi.fn().mockResolvedValue({})
    Element.prototype.requestFullscreen = vi.fn().mockResolvedValue(undefined)

    Object.defineProperty(HTMLMediaElement.prototype, 'buffered', {
      get: () => ({
        length: 1,
        start: () => 0,
        end: () => 10,
      }),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders video element with correct src', () => {
      const wrapper = createWrapper({
        src: 'https://example.com/video.mp4',
      })
      const video = wrapper.find('video')
      expect(video.exists()).toBe(true)
      expect(video.attributes('src')).toBe('https://example.com/video.mp4')
    })

    it('applies poster attribute when provided', () => {
      const wrapper = createWrapper({
        src: 'https://example.com/video.mp4',
        poster: 'https://example.com/poster.jpg',
      })
      const video = wrapper.find('video')
      expect(video.attributes('poster')).toBe('https://example.com/poster.jpg')
    })

    it('sets playsinline attribute by default', () => {
      const wrapper = createWrapper({
        src: 'https://example.com/video.mp4',
      })
      const video = wrapper.find('video')
      expect(video.attributes('playsinline')).toBeDefined()
    })

    it('sets loop attribute when provided', () => {
      const wrapper = createWrapper({
        src: 'https://example.com/video.mp4',
        loop: true,
      })
      const video = wrapper.find('video')
      expect(video.attributes('loop')).toBeDefined()
    })
  })

  describe('Events', () => {
    it('emits ready event when video metadata is loaded', async () => {
      const wrapper = createWrapper({
        src: 'https://example.com/video.mp4',
      })
      const video = wrapper.find('video')
      const videoElement = video.element as HTMLVideoElement
      Object.defineProperty(videoElement, 'duration', { value: 120, writable: true })
      await video.trigger('loadedmetadata')
      expect(wrapper.emitted('ready')).toBeTruthy()
      expect(wrapper.emitted('ready')).toHaveLength(1)
    })

    it('emits play event when video starts playing', async () => {
      const wrapper = createWrapper({
        src: 'https://example.com/video.mp4',
      })
      const video = wrapper.find('video')
      await video.trigger('play')
      expect(wrapper.emitted('play')).toBeTruthy()
      expect(wrapper.emitted('play')).toHaveLength(1)
    })

    it('emits pause event when video is paused', async () => {
      const wrapper = createWrapper({
        src: 'https://example.com/video.mp4',
      })
      const video = wrapper.find('video')
      await video.trigger('pause')
      expect(wrapper.emitted('pause')).toBeTruthy()
      expect(wrapper.emitted('pause')).toHaveLength(1)
    })

    it('emits ended event when video finishes', async () => {
      const wrapper = createWrapper({
        src: 'https://example.com/video.mp4',
      })
      const video = wrapper.find('video')
      await video.trigger('ended')
      expect(wrapper.emitted('ended')).toBeTruthy()
      expect(wrapper.emitted('ended')).toHaveLength(1)
    })

    it('emits timeupdate event with current time', async () => {
      const wrapper = createWrapper({
        src: 'https://example.com/video.mp4',
      })
      const video = wrapper.find('video')
      const videoElement = video.element as HTMLVideoElement
      Object.defineProperty(videoElement, 'currentTime', { value: 30, writable: true })
      await video.trigger('timeupdate')
      expect(wrapper.emitted('timeupdate')).toBeTruthy()
      expect(wrapper.emitted('timeupdate')?.[0]).toEqual([30])
    })
  })

  describe('UI State', () => {
    it('shows center play button when not playing', () => {
      const wrapper = createWrapper({
        src: 'https://example.com/video.mp4',
      })
      const centerPlayBtn = wrapper.find('.vp__center-play')
      expect(centerPlayBtn.exists()).toBe(true)
    })

    it('hides center play button when playing', async () => {
      const wrapper = createWrapper({
        src: 'https://example.com/video.mp4',
      })
      const video = wrapper.find('video')
      await video.trigger('play')
      await wrapper.vm.$nextTick()
      const centerPlayBtn = wrapper.find('.vp__center-play')
      expect(centerPlayBtn.exists()).toBe(false)
    })

    it('shows loading indicator when buffering', async () => {
      const wrapper = createWrapper({
        src: 'https://example.com/video.mp4',
      })
      const video = wrapper.find('video')
      await video.trigger('waiting')
      await wrapper.vm.$nextTick()
      const loader = wrapper.find('.vp__loader')
      expect(loader.exists()).toBe(true)
    })

    it('hides loading indicator when ready to play', async () => {
      const wrapper = createWrapper({
        src: 'https://example.com/video.mp4',
      })
      const video = wrapper.find('video')
      await video.trigger('waiting')
      await wrapper.vm.$nextTick()
      await video.trigger('canplay')
      await wrapper.vm.$nextTick()
      const loader = wrapper.find('.vp__loader')
      expect(loader.exists()).toBe(false)
    })
  })

  describe('User Interactions', () => {
    it('toggles play/pause when clicking video', async () => {
      const wrapper = createWrapper({
        src: 'https://example.com/video.mp4',
      })
      const video = wrapper.find('video')
      await video.trigger('click')
      expect(mockPlay).toHaveBeenCalledTimes(1)
    })

    it('toggles play/pause when clicking center button', async () => {
      const wrapper = createWrapper({
        src: 'https://example.com/video.mp4',
      })
      const centerBtn = wrapper.find('.vp__center-play')
      await centerBtn.trigger('click')
      expect(mockPlay).toHaveBeenCalledTimes(1)
    })

    it('toggles play/pause when clicking control button', async () => {
      const wrapper = createWrapper({
        src: 'https://example.com/video.mp4',
      })
      const controlBtn = wrapper.find('.vp__btn')
      await controlBtn.trigger('click')
      expect(mockPlay).toHaveBeenCalledTimes(1)
    })

    it('seeks to correct position when clicking progress bar', async () => {
      const wrapper = createWrapper({
        src: 'https://example.com/video.mp4',
      })
      const video = wrapper.find('video')
      const videoElement = video.element as HTMLVideoElement
      Object.defineProperty(videoElement, 'duration', { value: 100, writable: true })
      Object.defineProperty(videoElement, 'currentTime', { value: 0, writable: true })
      await video.trigger('loadedmetadata')

      const progressBar = wrapper.find('.vp__progress')
      const rect = { left: 0, width: 100 }
      vi.spyOn(progressBar.element, 'getBoundingClientRect').mockReturnValue(rect as DOMRect)
      await progressBar.trigger('click', { clientX: 50 })
      await wrapper.vm.$nextTick()
      expect(videoElement.currentTime).toBe(50)
    })
  })
})
