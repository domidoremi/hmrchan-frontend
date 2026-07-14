import { createApp, defineComponent, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useHmrInViewReveal } from '@/hmr/composables/useHmrInViewReveal'

type ObserverEntry = Pick<IntersectionObserverEntry, 'isIntersecting' | 'target'>

const originalIntersectionObserver = window.IntersectionObserver

function mountRevealProbe(rootSelector?: string) {
  const app = createApp(
    defineComponent({
      setup() {
        useHmrInViewReveal(rootSelector)
        return () => null
      },
    })
  )
  const host = document.createElement('div')
  document.body.append(host)
  app.mount(host)

  return {
    app,
    host,
    unmount() {
      app.unmount()
      host.remove()
    },
  }
}

describe('useHmrInViewReveal', () => {
  afterEach(() => {
    window.IntersectionObserver = originalIntersectionObserver
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('observes reveal targets with any viewport intersection', () => {
    const observe = vi.fn()
    const unobserve = vi.fn()
    let callback: IntersectionObserverCallback | undefined

    class MockIntersectionObserver {
      constructor(
        observerCallback: IntersectionObserverCallback,
        public options?: IntersectionObserverInit
      ) {
        callback = observerCallback
      }

      observe = observe
      unobserve = unobserve
      disconnect = vi.fn()
      root = null
      rootMargin = '0px 0px -8% 0px'
      thresholds = [0]
      takeRecords = () => []
    }

    window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

    const target = document.createElement('section')
    target.dataset['hmrReveal'] = ''
    document.body.append(target)

    const probe = mountRevealProbe()

    expect(observe).toHaveBeenCalledWith(target)
    expect((observe.mock.instances[0] as MockIntersectionObserver).options).toEqual({
      rootMargin: '0px 0px -8% 0px',
      threshold: 0,
    })

    callback?.([{ isIntersecting: true, target } as ObserverEntry as IntersectionObserverEntry], {
      unobserve,
    } as unknown as IntersectionObserver)

    expect(target.classList.contains('is-inview')).toBe(true)
    expect(unobserve).toHaveBeenCalledWith(target)

    probe.unmount()
  })

  it('marks existing and inserted reveal targets visible when observation is unavailable', async () => {
    window.IntersectionObserver = undefined as unknown as typeof IntersectionObserver

    const target = document.createElement('section')
    target.dataset['hmrReveal'] = ''
    document.body.append(target)

    const probe = mountRevealProbe()

    expect(target.classList.contains('is-inview')).toBe(true)

    const inserted = document.createElement('section')
    inserted.dataset['hmrReveal'] = ''
    document.body.append(inserted)
    await nextTick()

    expect(inserted.classList.contains('is-inview')).toBe(true)

    probe.unmount()
  })
})
