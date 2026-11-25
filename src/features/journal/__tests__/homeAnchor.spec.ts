import { afterEach, describe, expect, it, vi } from 'vitest'
import { followHomeAnchor } from '../editions/homeAnchor'
import { scrollHomeTo } from '../editions/useHomeScroll'

const resizeObserver = vi.hoisted(() => ({
  callback: undefined as (() => void) | undefined,
  disconnect: vi.fn(),
  observe: vi.fn(),
}))

vi.mock('@/utils/modernAPIs', () => ({
  createResizeObserver: (callback: () => void) => {
    resizeObserver.callback = callback
    return { observe: resizeObserver.observe, disconnect: resizeObserver.disconnect }
  },
}))

vi.mock('../editions/useHomeScroll', () => ({ scrollHomeTo: vi.fn() }))

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  document.body.replaceChildren()
})

describe('Chapter anchors during image layout', () => {
  it('recomputes the inset when the header collapses without losing the requested chapter', () => {
    vi.stubGlobal('scrollY', 100)
    const target = document.createElement('section')
    document.body.append(target)
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({ top: 200 } as DOMRect)
    let inset = 72
    const stop = followHomeAnchor(target, () => inset, true)
    try {
      expect(scrollHomeTo).toHaveBeenLastCalledWith(228, true)
      inset = 0
      document.dispatchEvent(new Event('journalchromechange'))
      expect(scrollHomeTo).toHaveBeenLastCalledWith(300, true)
    } finally {
      stop()
    }
  })

  it('tracks a changing chapter position and releases on a user wheel gesture', () => {
    resizeObserver.callback = undefined
    resizeObserver.disconnect.mockClear()
    resizeObserver.observe.mockClear()
    vi.stubGlobal('scrollY', 100)
    document.body.innerHTML =
      '<main class="immersive-home"><section class="chapter-content" /></main>'
    const target = document.querySelector<HTMLElement>('section')!
    const rect = vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({ top: 200 } as DOMRect)
    const stop = followHomeAnchor(target, 80, true)
    try {
      expect(scrollHomeTo).toHaveBeenLastCalledWith(220, true)
      rect.mockReturnValue({ top: 320 } as DOMRect)
      resizeObserver.callback?.()
      expect(scrollHomeTo).toHaveBeenLastCalledWith(340, true)
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }))
      expect(resizeObserver.disconnect).toHaveBeenCalledOnce()
      rect.mockReturnValue({ top: 500 } as DOMRect)
      resizeObserver.callback?.()
      expect(scrollHomeTo).toHaveBeenCalledTimes(2)
    } finally {
      stop()
    }
  })

  it('follows late chrome changes after scrollend and releases at the lifetime limit', () => {
    vi.useFakeTimers()
    vi.stubGlobal('scrollY', 100)
    const target = document.createElement('section')
    document.body.append(target)
    const rect = vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({ top: 200 } as DOMRect)
    let inset = 68
    const stop = followHomeAnchor(target, () => inset, true)
    window.dispatchEvent(new Event('scrollend'))
    vi.advanceTimersByTime(1000)
    inset = 0
    rect.mockReturnValue({ top: 268 } as DOMRect)
    document.dispatchEvent(new Event('journalchromechange'))
    expect(scrollHomeTo).toHaveBeenLastCalledWith(368, true)
    vi.advanceTimersByTime(3000)
    expect(resizeObserver.disconnect).toHaveBeenCalledOnce()
    rect.mockReturnValue({ top: 400 } as DOMRect)
    document.dispatchEvent(new Event('journalchromechange'))
    resizeObserver.callback?.()
    expect(scrollHomeTo).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
    stop()
  })
})
