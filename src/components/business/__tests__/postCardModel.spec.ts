import { describe, expect, it } from 'vitest'

import {
  formatCount,
  formatDuration,
  isTitleDerivedFromContent,
  normalizeTag,
  normalizeText,
  resolveDisplayAuthorName,
  resolveDisplayExcerpt,
  resolveDisplayTitle,
  resolvePlatformAnimation,
  resolvePlatformLabel,
} from '../post-card/postCardModel'

describe('postCardModel', () => {
  it('normalizes text, tags, and author fallback display', () => {
    expect(normalizeText(' hello\n  world ')).toBe('hello world')
    expect(normalizeText(null)).toBe('')
    expect(normalizeTag('#momi  tag ')).toBe('momi tag')
    expect(resolveDisplayAuthorName({ authorName: ' Alice ', authorUsername: 'alice_id' })).toBe(
      'Alice'
    )
    expect(resolveDisplayAuthorName({ authorName: ' ', authorUsername: 'alice_id' })).toBe(
      '@alice_id'
    )
  })

  it('derives display title and excerpt without duplicating content snippets', () => {
    const longDescription = 'This is a long description that should stop at a nearby word boundary'

    expect(isTitleDerivedFromContent({ title: '', description: 'Body copy' })).toBe(true)
    expect(isTitleDerivedFromContent({ title: 'Hi', description: 'Body copy' })).toBe(true)
    expect(isTitleDerivedFromContent({ title: 'Title', description: 'Body copy' })).toBe(false)
    expect(
      resolveDisplayTitle({
        title: '',
        description: longDescription,
        titleFromContent: true,
      })
    ).toBe('This is a long description…')
    expect(resolveDisplayExcerpt({ description: longDescription, titleFromContent: true })).toBe('')
    expect(resolveDisplayExcerpt({ description: longDescription, titleFromContent: false })).toBe(
      longDescription
    )
  })

  it('formats platform metadata and numeric badges', () => {
    expect(resolvePlatformAnimation('youtube')).toBe('sparkle')
    expect(resolvePlatformAnimation('unknown')).toBe('explore')
    expect(resolvePlatformLabel('youtube')).toBe('YouTube')
    expect(resolvePlatformLabel('custom-platform')).toBe('Custom Platform')
    expect(formatCount(999)).toBe('999')
    expect(formatCount(1_200)).toBe('1.2K')
    expect(formatCount(1_000_000)).toBe('1M')
    expect(formatDuration(59)).toBe('0:59')
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(3661)).toBe('1:01:01')
  })
})
