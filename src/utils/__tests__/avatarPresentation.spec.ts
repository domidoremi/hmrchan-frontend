import { describe, expect, it } from 'vitest'
import { getAvatarFallbackLabel, resolveAvatarSrc } from '../avatarPresentation'

describe('avatarPresentation', () => {
  it('normalizes avatar urls through the shared helper', () => {
    expect(resolveAvatarSrc('/uploads/avatars/test.jpg')).toBe('/uploads/avatars/test.jpg')
    expect(resolveAvatarSrc('https://i.ytimg.com/vi/demo/maxresdefault.jpg')).toBe(
      'https://i.ytimg.com/vi/demo/hqdefault.jpg'
    )
  })

  it('returns undefined for blocked high-risk external avatar urls', () => {
    expect(resolveAvatarSrc('https://p16-sign-sg.tiktokcdn.com/avatar.jpeg')).toBeUndefined()
    expect(resolveAvatarSrc('https://pbs.twimg.com/profile_images/demo/avatar.jpg')).toBeUndefined()
  })

  it('returns undefined when there is no usable avatar source', () => {
    expect(resolveAvatarSrc(null)).toBeUndefined()
    expect(resolveAvatarSrc(undefined)).toBeUndefined()
    expect(resolveAvatarSrc('')).toBeUndefined()
  })

  it('builds a fallback label from the first non-empty candidate', () => {
    expect(getAvatarFallbackLabel(null, '  ', 'momi')).toBe('M')
    expect(getAvatarFallbackLabel(undefined, 'Alice', 'bob')).toBe('A')
    expect(getAvatarFallbackLabel(null, undefined, '')).toBe('?')
  })
})
