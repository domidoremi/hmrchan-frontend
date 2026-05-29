import { createApp, defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { useHmrScrollProgress } from '@/hmr/composables/useHmrScrollProgress'

function mountScrollProgressProbe() {
  let exposed: ReturnType<typeof useHmrScrollProgress> | undefined

  const app = createApp(
    defineComponent({
      setup() {
        exposed = useHmrScrollProgress()
        return () => null
      },
    })
  )

  app.mount(document.createElement('div'))

  return {
    app,
    get progress() {
      return exposed?.progress.value
    },
    updateProgress() {
      exposed?.updateProgress()
    },
  }
}

describe('useHmrScrollProgress', () => {
  it('keeps the initial mount layout-read free and updates after scroll events', () => {
    const scrollHeightGetter = vi.fn(() => 2000)
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      get: scrollHeightGetter,
    })
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 1000,
    })
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 250,
    })

    const probe = mountScrollProgressProbe()

    expect(probe.progress).toBe(0)
    expect(scrollHeightGetter).not.toHaveBeenCalled()

    window.dispatchEvent(new Event('scroll'))

    expect(scrollHeightGetter).toHaveBeenCalledOnce()
    expect(probe.progress).toBe(0.25)

    probe.app.unmount()
  })
})
