import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAtmosphereScroll } from '../editions/useAtmosphereScroll'
import { queueHomeFrame } from '../editions/homeFrame'

const callbacks = vi.hoisted(() => ({
  reads: new Set<() => (() => void) | undefined>(),
  visibility: undefined as IntersectionObserverCallback | undefined,
  disconnect: vi.fn(),
}))

vi.mock('../editions/homeFrame', () => ({
  queueHomeFrame: vi.fn((read: () => (() => void) | undefined) => callbacks.reads.add(read)),
  cancelHomeFrame: vi.fn((read: () => (() => void) | undefined) => callbacks.reads.delete(read)),
}))

vi.mock('@/utils/modernAPIs', () => ({
  createResizeObserver: () => ({ observe: vi.fn(), disconnect: callbacks.disconnect }),
  createVisibilityObserver: (notify: IntersectionObserverCallback) => {
    callbacks.visibility = notify
    return { observe: vi.fn(), disconnect: callbacks.disconnect }
  },
}))

let wrapper: VueWrapper | undefined
let hidden = false
let nativeTimeline = false

beforeEach(() => {
  vi.clearAllMocks()
  callbacks.reads.clear()
  callbacks.visibility = undefined
  hidden = false
  nativeTimeline = false
  vi.stubGlobal('CSS', { supports: () => nativeTimeline })
  vi.stubGlobal('IntersectionObserver', class {})
  vi.stubGlobal('scrollY', 0)
  vi.stubGlobal('innerHeight', 800)
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    () => new DOMRect(0, -scrollY, 1200, 2800)
  )
  document.body.dataset['motion'] = 'full'
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  callbacks.reads.clear()
  delete document.body.dataset['motion']
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function render() {
  wrapper = mount(
    defineComponent({
      setup() {
        const host = ref<HTMLElement | null>(null)
        useAtmosphereScroll(host)
        return () => h('div', { ref: host })
      },
    })
  )
  return wrapper
}

function flush() {
  const reads = [...callbacks.reads]
  callbacks.reads.clear()
  const writes = reads.map((read) => read())
  writes.forEach((write) => write?.())
}

describe('continuous atmosphere progress', () => {
  it('uses the native CSS timeline without installing a fallback frame', () => {
    nativeTimeline = true
    const host = render()
    expect(host.attributes('data-scene-fallback')).toBeUndefined()
    expect(queueHomeFrame).not.toHaveBeenCalled()
    window.dispatchEvent(new Event('scroll'))
    expect(callbacks.reads.size).toBe(0)
  })

  it('coalesces fallback scroll reads and writes normalized document progress', () => {
    const host = render()
    flush()
    vi.mocked(queueHomeFrame).mockClear()
    vi.stubGlobal('scrollY', 1000)
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('scroll'))
    expect(queueHomeFrame).toHaveBeenCalledOnce()
    flush()
    expect(host.element.style.getPropertyValue('--scene-progress')).toBe('0.5')
  })

  it('clears reduced-motion progress and stops hidden-page work', () => {
    const host = render()
    flush()
    vi.stubGlobal('scrollY', 1500)
    window.dispatchEvent(new Event('scroll'))
    document.body.dataset['motion'] = 'reduced'
    document.dispatchEvent(new Event('journalmotionchange'))
    expect(callbacks.reads.size).toBe(0)
    expect(host.element.style.getPropertyValue('--scene-progress')).toBe('')
    document.body.dataset['motion'] = 'full'
    hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('scroll'))
    expect(callbacks.reads.size).toBe(0)
    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    flush()
    expect(host.element.style.getPropertyValue('--scene-progress')).toBe('0.75')
  })

  it('marks offscreen scenes and disposes observers and pending frames', () => {
    const host = render()
    callbacks.visibility?.(
      [{ isIntersecting: false } as IntersectionObserverEntry],
      {} as IntersectionObserver
    )
    expect(host.attributes('data-scene-away')).toBe('')
    expect(callbacks.reads.size).toBe(0)
    callbacks.visibility?.(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    )
    expect(host.attributes('data-scene-away')).toBeUndefined()
    expect(callbacks.reads.size).toBe(1)
    host.unmount()
    wrapper = undefined
    expect(callbacks.reads.size).toBe(0)
    expect(callbacks.disconnect).toHaveBeenCalledTimes(2)
    window.dispatchEvent(new Event('scroll'))
    expect(callbacks.reads.size).toBe(0)
  })
})
