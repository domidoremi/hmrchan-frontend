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
  delete document.body.dataset.motionPreference
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
  it('follows the current system preference again after restoring automatic motion', () => {
    const save = vi.fn()
    const preference = createMotionPreference({
      read: () => 'full',
      save,
      changed: vi.fn(),
      signal: lifetime.signal,
    })
    expect(preference.get()).toBe('full')
    preference.set('auto')
    expect(preference.choice()).toBe('auto')
    expect(preference.get()).toBe('reduced')
    expect(save).toHaveBeenLastCalledWith('presentation-motion', 'auto')
    media.matches = false
    media.dispatchEvent(new Event('change'))
    expect(preference.get()).toBe('full')
  })
  it('applies another tab’s saved choice without writing it back', () => {
    const read = vi.fn().mockReturnValue('full')
    const save = vi.fn()
    const preference = createMotionPreference({
      read,
      save,
      changed: vi.fn(),
      signal: lifetime.signal,
    })
    read.mockReturnValue('reduced')
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'momichan-journal:presentation-motion',
        newValue: 'reduced',
      })
    )
    expect(preference.get()).toBe('reduced')
    expect(save).not.toHaveBeenCalled()
    read.mockReturnValue('full')
    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }))
    expect(preference.get()).toBe('reduced')
    lifetime.abort()
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'momichan-journal:presentation-motion' })
    )
    expect(preference.get()).toBe('reduced')
  })
})
