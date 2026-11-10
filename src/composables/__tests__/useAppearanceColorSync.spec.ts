import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref, type EffectScope } from 'vue'
import { useAppearanceColorSync } from '../useAppearanceColorSync'

describe('useAppearanceColorSync', () => {
  let scope: EffectScope
  let frames: Map<number, FrameRequestCallback>
  let nextId: number
  const root = document.documentElement

  function paint() {
    const current = [...frames.values()]
    frames.clear()
    for (const callback of current) callback(performance.now())
  }

  function setup() {
    const preset = ref('minimal-editorial')
    const mode = ref('light')
    scope.run(() => useAppearanceColorSync([preset, mode]))
    return { preset, mode }
  }

  beforeEach(() => {
    scope = effectScope()
    frames = new Map()
    nextId = 0
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextId, callback)
      return nextId
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  })

  afterEach(() => {
    scope.stop()
    vi.unstubAllGlobals()
    root.removeAttribute('data-appearance-changing')
  })

  it('leaves initial render and repeated selections unchanged', () => {
    const { preset, mode } = setup()
    preset.value = 'minimal-editorial'
    mode.value = 'light'
    expect(root.hasAttribute('data-appearance-changing')).toBe(false)
    expect(frames.size).toBe(0)
  })

  it('synchronizes mode colors before DOM updates and restores transitions after a paint', () => {
    const { mode } = setup()
    mode.value = 'dark'
    expect(root.hasAttribute('data-appearance-changing')).toBe(true)
    paint()
    expect(root.hasAttribute('data-appearance-changing')).toBe(true)
    paint()
    expect(root.hasAttribute('data-appearance-changing')).toBe(false)
    expect(frames.size).toBe(0)
  })

  it('keeps the latest preset and mode change covered when selections arrive between frames', () => {
    const { preset, mode } = setup()
    mode.value = 'dark'
    paint()
    preset.value = 'organic-natural'
    mode.value = 'light'
    expect(frames.size).toBe(1)
    paint()
    expect(root.hasAttribute('data-appearance-changing')).toBe(true)
    paint()
    expect(root.hasAttribute('data-appearance-changing')).toBe(false)
  })

  it('removes the temporary state and queued callback when the owning scope is disposed', () => {
    const { mode } = setup()
    mode.value = 'dark'
    paint()
    scope.stop()
    expect(frames.size).toBe(0)
    expect(root.hasAttribute('data-appearance-changing')).toBe(false)
    paint()
    expect(root.hasAttribute('data-appearance-changing')).toBe(false)
  })
})
