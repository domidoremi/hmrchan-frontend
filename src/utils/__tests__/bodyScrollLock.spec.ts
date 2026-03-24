import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lockBodyScroll, unlockBodyScroll } from '../bodyScrollLock'

describe('bodyScrollLock', () => {
  beforeEach(() => {
    unlockBodyScroll()
    unlockBodyScroll()
    document.body.style.cssText = ''
    document.documentElement.style.cssText = ''
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 180,
    })
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1200,
    })
    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: 1180,
    })
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  afterEach(() => {
    unlockBodyScroll()
    unlockBodyScroll()
    vi.restoreAllMocks()
  })

  it('locks html and body scroll while preserving the current offset', () => {
    lockBodyScroll()

    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.documentElement.style.overscrollBehavior).toBe('none')
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.position).toBe('fixed')
    expect(document.body.style.top).toBe('-180px')
    expect(document.body.style.width).toBe('100%')
    expect(document.body.style.overscrollBehavior).toBe('none')
    expect(document.body.style.paddingRight).toContain('20px')
  })

  it('restores styles and scroll position only after the final unlock', () => {
    document.body.style.paddingRight = '4px'

    lockBodyScroll()
    lockBodyScroll()
    unlockBodyScroll()

    expect(document.body.style.position).toBe('fixed')
    expect(window.scrollTo).not.toHaveBeenCalled()

    unlockBodyScroll()

    expect(document.documentElement.style.overflow).toBe('')
    expect(document.body.style.overflow).toBe('')
    expect(document.body.style.position).toBe('')
    expect(document.body.style.top).toBe('')
    expect(document.body.style.paddingRight).toBe('4px')
    expect(window.scrollTo).toHaveBeenCalledWith(0, 180)
  })
})
