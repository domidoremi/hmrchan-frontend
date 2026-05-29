import { describe, expect, it } from 'vitest'

import {
  buildSubtitleOverlayStyle,
  buildSubtitlePreviewStyle,
  clampPercent,
  CONTROLS_HIDE_DELAY,
  extractActiveCueHtml,
  extractCueTextHtml,
  extractMediaIdFromSrc,
  formatTime,
  isSrtTrack,
  normalizeSubtitleFallbackText,
  normalizeVolumeInput,
  normalizeSubtitleTracks,
  needsFetchFallback,
  pickDefaultSubtitle,
  PLAYBACK_SPEEDS,
  resolveDisplayPercent,
  resolveKeyboardSeekTime,
  resolvePlayedPercent,
  resolveSeekFromPoint,
  resolveSeekFromUnitPercent,
  SEEK_STEP,
  toLocaleMatches,
  VOLUME_STEP,
} from '../videoPlayerModel'

describe('videoPlayerModel', () => {
  it('normalizes subtitle track urls from explicit and derived inputs', () => {
    expect(extractMediaIdFromSrc('/api/v1/media/123e4567-e89b-12d3-a456-426614174000/stream')).toBe(
      '123e4567-e89b-12d3-a456-426614174000'
    )

    expect(
      normalizeSubtitleTracks({
        apiBaseUrl: '/api/v1',
        videoSrc: '/api/v1/media/123e4567-e89b-12d3-a456-426614174000/stream',
        tracks: [{ language: 'en', file_path: 'subs/post-en.vtt' }, { language: 'ja' }],
      })
    ).toEqual([
      { language: 'en', label: 'EN', src: '/api/v1/subs/post-en.vtt', format: undefined },
      {
        language: 'ja',
        label: 'JA',
        src: '/api/v1/media/123e4567-e89b-12d3-a456-426614174000/subtitle?language=ja',
        format: undefined,
      },
    ])
  })

  it('builds stable subtitle styles for overlays and previews', () => {
    expect(
      buildSubtitleOverlayStyle({
        offset: 2,
        fontSize: 1.1,
        color: '#ffffff',
        backgroundColor: '#000000',
        backgroundOpacity: 0.75,
        shadow: 'outline',
        align: 'center',
      })
    ).toEqual({
      bottom: '16%',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      fontSize: '1.1em',
      textShadow: '0 0 2px rgba(0, 0, 0, 0.95), 0 0 6px rgba(0, 0, 0, 0.5)',
      textAlign: 'center',
    })

    expect(
      buildSubtitlePreviewStyle({
        color: '#ffff00',
        backgroundColor: '#333333',
        backgroundOpacity: 0.4,
        shadow: 'none',
      })
    ).toEqual({
      color: '#ffff00',
      backgroundColor: 'rgba(51, 51, 51, 0.4)',
      textShadow: undefined,
    })
  })

  it('formats playback time defensively', () => {
    expect(formatTime(Number.NaN)).toBe('0:00')
    expect(formatTime(125)).toBe('2:05')
  })

  it('clamps playback percentages for progress rendering', () => {
    expect(clampPercent(Number.NaN)).toBe(0)
    expect(clampPercent(-5)).toBe(0)
    expect(clampPercent(120)).toBe(100)
    expect(resolvePlayedPercent(25, 100)).toBe(25)
    expect(resolvePlayedPercent(25, 0)).toBe(0)
    expect(resolveDisplayPercent(null, 40)).toBe(40)
    expect(resolveDisplayPercent(120, 40)).toBe(100)
  })

  it('resolves seek targets from pointer and keyboard input', () => {
    expect(
      resolveSeekFromPoint({
        clientX: 75,
        rectLeft: 25,
        rectWidth: 100,
        duration: 200,
        currentTime: 20,
      })
    ).toEqual({
      percent: 0.5,
      time: 100,
      delta: 80,
      direction: 'forward',
      indicatorSeconds: 80,
    })

    expect(
      resolveSeekFromUnitPercent({
        percent: -1,
        duration: 200,
        currentTime: 20,
      })
    ).toEqual({
      percent: 0,
      time: 0,
      delta: -20,
      direction: 'backward',
      indicatorSeconds: 20,
    })

    const keyboardSeek = resolveKeyboardSeekTime({
      key: 'ArrowRight',
      shiftKey: true,
      currentTime: 20,
      duration: 200,
    })
    expect(keyboardSeek?.time).toBe(35)

    expect(
      resolveKeyboardSeekTime({
        key: 'Escape',
        shiftKey: false,
        currentTime: 20,
        duration: 200,
      })
    ).toBeNull()
  })

  it('normalizes volume slider input into media volume', () => {
    expect(normalizeVolumeInput('75')).toBe(0.75)
    expect(normalizeVolumeInput('150')).toBe(1)
    expect(normalizeVolumeInput('bad')).toBeNull()
  })

  it('keeps playback control constants within supported UI bounds', () => {
    expect([...PLAYBACK_SPEEDS]).toEqual([...PLAYBACK_SPEEDS].sort((a, b) => a - b))
    expect(PLAYBACK_SPEEDS).toContain(1)
    expect(CONTROLS_HIDE_DELAY).toBeGreaterThan(0)
    expect(SEEK_STEP).toBeGreaterThan(0)
    expect(VOLUME_STEP).toBeGreaterThan(0)
    expect(VOLUME_STEP).toBeLessThanOrEqual(1)
  })

  it('selects a default subtitle by preferred language, locale, then first track', () => {
    const tracks = [
      { language: 'en', label: 'EN', src: '/en.vtt' },
      { language: 'ja-JP', label: 'JA', src: '/ja.vtt' },
      { language: 'zh-TW', label: 'ZH', src: '/zh.vtt' },
    ]

    expect(toLocaleMatches('ja-JP', 'ja')).toBe(true)
    expect(toLocaleMatches('ja', 'ja-JP')).toBe(true)
    expect(toLocaleMatches('en', 'ja')).toBe(false)
    expect(pickDefaultSubtitle({ tracks, preferredLanguage: 'zh', locale: 'ja-JP' })).toBe('zh-TW')
    expect(pickDefaultSubtitle({ tracks, preferredLanguage: null, locale: 'ja' })).toBe('ja-JP')
    expect(pickDefaultSubtitle({ tracks, preferredLanguage: null, locale: 'ko' })).toBe('en')
    expect(pickDefaultSubtitle({ tracks: [], preferredLanguage: 'en', locale: 'en' })).toBeNull()
  })

  it('detects subtitle sources that require VTT fetch fallback', () => {
    expect(isSrtTrack({ language: 'en', label: 'EN', src: '/subtitles/en.srt' })).toBe(true)
    expect(
      isSrtTrack({ language: 'en', label: 'EN', src: '/subtitles/en.vtt', format: 'srt' })
    ).toBe(true)
    expect(
      needsFetchFallback({
        language: 'ja',
        label: 'JA',
        src: '/api/v1/media/1/subtitle?language=ja',
      })
    ).toBe(true)
    expect(needsFetchFallback({ language: 'en', label: 'EN', src: '/subtitles/en.vtt' })).toBe(
      false
    )
  })

  it('normalizes fetched subtitle fallback text into VTT', () => {
    expect(normalizeSubtitleFallbackText('1\r\n00:00:01,000 --> 00:00:02,000\r\nHello')).toBe(
      'WEBVTT\n\n1\n00:00:01.000 --> 00:00:02.000\nHello\n'
    )
    expect(normalizeSubtitleFallbackText('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi')).toBe(
      'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi'
    )
  })

  it('extracts safe cue text html for the custom subtitle overlay', () => {
    expect(extractCueTextHtml('<v Speaker>Hello</v>\n\n<i>World</i>')).toBe('Hello<br>World')
    expect(
      extractActiveCueHtml({
        length: 3,
        0: { text: '<b>Hello</b>' },
        1: { text: '\n' },
        2: { text: 'Second\nLine' },
      })
    ).toBe('Hello<br>Second<br>Line')
    expect(extractActiveCueHtml(null)).toBe('')
  })
})
