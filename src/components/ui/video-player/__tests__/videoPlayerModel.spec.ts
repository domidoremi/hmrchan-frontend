import { describe, expect, it } from 'vitest'

import {
  buildSubtitleOverlayStyle,
  buildSubtitlePreviewStyle,
  extractMediaIdFromSrc,
  formatTime,
  normalizeSubtitleTracks,
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
})
