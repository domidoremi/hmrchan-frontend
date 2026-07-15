import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/ui/Avatar.vue', () => ({
  default: {
    name: 'MockAvatar',
    template: '<span class="mock-avatar" />',
  },
}))

import { CommentComposerShell, CommentItemShell, CommentThreadHeader } from '../shared'

describe('comment shared exports', () => {
  it('exposes the public comment shell boundary', () => {
    expect([CommentComposerShell, CommentItemShell, CommentThreadHeader].every(Boolean)).toBe(true)
  })
})
