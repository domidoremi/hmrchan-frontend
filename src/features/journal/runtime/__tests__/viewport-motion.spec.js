import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installViewportMotion } from '../viewport-motion.js'

let lifetime, callbacks, height, sceneBox, viewport, progress, top, order
beforeEach(() => {
  document.body.innerHTML =
    '<div class="reading-progress"></div><button class="back-to-top" hidden></button><section data-depth-scene></section>'
  lifetime = new AbortController()
  callbacks = []
  order = []
  vi.stubGlobal('scrollY', 0)
  vi.stubGlobal('innerHeight', 800)
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  height = vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockImplementation(() => {
    order.push('height')
    return 2800
  })
  sceneBox = vi
    .spyOn(document.querySelector('[data-depth-scene]'), 'getBoundingClientRect')
    .mockImplementation(() => {
      order.push('scene')
      return { top: 100, bottom: 500, height: 400 }
    })
  progress = document.querySelector('.reading-progress')
  top = document.querySelector('.back-to-top')
  const setProgress = progress.style.setProperty.bind(progress.style)
  vi.spyOn(progress.style, 'setProperty').mockImplementation((...args) => {
    order.push('write')
    return setProgress(...args)
  })
  viewport = installViewportMotion({
    listen: (target, name, callback, options) =>
      target.addEventListener(name, callback, { ...options, signal: lifetime.signal }),
    frame: (callback) => callbacks.push(callback),
    fullMotion: () => true,
  })
})
afterEach(() => {
  lifetime.abort()
  viewport.dispose()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})
const flush = () => {
  for (const callback of callbacks.splice(0)) callback()
}

describe('journal scroll geometry', () => {
  it('does not force initial layout when content is added at the top', () => {
    viewport.refresh()
    viewport.refresh()
    flush()
    expect(callbacks).toHaveLength(0)
    expect(height).not.toHaveBeenCalled()
    expect(sceneBox).not.toHaveBeenCalled()
    expect(top.hidden).toBe(true)
  })
  it('updates restored scroll positions with all reads before writes', () => {
    vi.stubGlobal('scrollY', 1000)
    viewport.refresh()
    flush()
    expect(progress.style.getPropertyValue('--progress')).toBe('0.5')
    expect(top.hidden).toBe(false)
    expect(order).toEqual(['height', 'scene', 'write'])
    expect(
      document.querySelector('[data-depth-scene]').style.getPropertyValue('--scroll-depth')
    ).not.toBe('')
  })
  it('coalesces scroll events and resets the top without measuring layout', () => {
    viewport.refresh()
    vi.stubGlobal('scrollY', 1000)
    for (let i = 0; i < 3; i++) window.dispatchEvent(new Event('scroll'))
    expect(callbacks).toHaveLength(1)
    flush()
    expect(height).toHaveBeenCalledTimes(1)
    vi.stubGlobal('scrollY', 0)
    window.dispatchEvent(new Event('scroll'))
    flush()
    expect(height).toHaveBeenCalledTimes(1)
    expect(sceneBox).toHaveBeenCalledTimes(1)
    expect(progress.style.getPropertyValue('--progress')).toBe('0')
    expect(top.hidden).toBe(true)
  })
  it('does not schedule hidden pages and catches up when visible', () => {
    vi.stubGlobal('scrollY', 1000)
    vi.mocked(Object.getOwnPropertyDescriptor(document, 'hidden').get).mockReturnValue(true)
    viewport.refresh()
    expect(callbacks).toHaveLength(0)
    vi.mocked(Object.getOwnPropertyDescriptor(document, 'hidden').get).mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange'))
    flush()
    expect(progress.style.getPropertyValue('--progress')).toBe('0.5')
  })
})
