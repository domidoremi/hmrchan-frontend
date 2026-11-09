import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMotionPreference } from '../motion.js'

let media, lifetime
beforeEach(() => {
  media = new EventTarget()
  media.matches = true
  vi.stubGlobal('matchMedia', () => media)
  lifetime = new AbortController()
})
afterEach(() => {
  lifetime.abort()
  vi.unstubAllGlobals()
  delete document.body.dataset.motion
})
describe('journal motion preferences', () => {
  it('follows system changes until the visitor makes an explicit choice', () => {
    const save = vi.fn(),
      changed = vi.fn()
    const preference = createMotionPreference({
      read: () => '',
      save,
      changed,
      signal: lifetime.signal,
    })
    expect(preference.get()).toBe('reduced')
    expect(save).not.toHaveBeenCalled()
    media.matches = false
    media.dispatchEvent(new Event('change'))
    expect(document.body.dataset.motion).toBe('full')
    preference.set('reduced')
    media.dispatchEvent(new Event('change'))
    expect(preference.get()).toBe('reduced')
    expect(save).toHaveBeenCalledWith('presentation-motion', 'reduced')
  })
  it('restores an explicit full preference and removes listeners on disposal', () => {
    const changed = vi.fn()
    const preference = createMotionPreference({
      read: () => 'full',
      save: vi.fn(),
      changed,
      signal: lifetime.signal,
    })
    expect(preference.get()).toBe('full')
    lifetime.abort()
    document.dispatchEvent(new CustomEvent('journalmotionrequest', { detail: 'reduced' }))
    media.dispatchEvent(new Event('change'))
    expect(changed).toHaveBeenCalledTimes(1)
  })
})
