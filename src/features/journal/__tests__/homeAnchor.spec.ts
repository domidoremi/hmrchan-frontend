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

  it('detaches after scrolling settles', () => {
    vi.useFakeTimers()
    const target = document.createElement('section')
    document.body.append(target)
    const stop = followHomeAnchor(target, 80, false)
    window.dispatchEvent(new Event('scrollend'))
    vi.advanceTimersByTime(450)
    expect(vi.getTimerCount()).toBe(0)
    stop()
  })
})
