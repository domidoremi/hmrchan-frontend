import { describe, expect, it } from 'vitest'

import { normalizeAvatarUrl } from '../userService'

describe('normalizeAvatarUrl', () => {
  it('keeps proxied relative avatar paths accessible', () => {
    expect(normalizeAvatarUrl('/uploads/avatars/test.jpg')).toBe('/uploads/avatars/test.jpg')
  })

  it('falls back YouTube maxres avatars to hqdefault before request', () => {
    expect(normalizeAvatarUrl('https://i.ytimg.com/vi/demo/maxresdefault.jpg')).toBe(
      'https://i.ytimg.com/vi/demo/hqdefault.jpg'
    )
  })

  it('leaves other absolute avatar urls untouched', () => {
    expect(normalizeAvatarUrl('https://cdn.example.com/avatar.jpg')).toBe(
      'https://cdn.example.com/avatar.jpg'
    )
  })
})
