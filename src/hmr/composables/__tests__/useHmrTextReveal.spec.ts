import { createApp, defineComponent, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useHmrTextReveal } from '@/hmr/composables/useHmrTextReveal'

const originalMutationObserver = globalThis.MutationObserver

type ObserverCallback = MutationCallback

function mountTextRevealProbe(selector?: string) {
  const app = createApp(
    defineComponent({
      setup() {
        useHmrTextReveal(selector)
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

async function waitForMountedReveal() {
  await nextTick()
  await nextTick()
}

describe('useHmrTextReveal', () => {
  afterEach(() => {
    globalThis.MutationObserver = originalMutationObserver
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('wraps non-empty text and element children with reveal spans', async () => {
    const target = document.createElement('h1')
    target.dataset.hmrTextReveal = ''
    target.append('Momi')
    target.append(document.createTextNode('   '))
    const strong = document.createElement('strong')
    strong.textContent = 'Chan'
    target.append(strong)
    document.body.append(target)

    const second = document.createElement('p')
    second.dataset.hmrTextReveal = ''
    second.textContent = 'Second'
    document.body.append(second)

    const probe = mountTextRevealProbe()
    await waitForMountedReveal()

    const masks = target.querySelectorAll('.hmr-reveal-mask')
    expect(target.dataset.hmrTextWrapped).toBe('true')
    expect(target.classList.contains('hmr-text-ready')).toBe(true)
    expect(target.style.getPropertyValue('--hmr-reveal-delay')).toBe('0ms')
    expect(masks).toHaveLength(2)
    expect(masks[0]?.querySelector('.hmr-reveal-inner')?.textContent).toBe('Momi')
    expect(masks[1]?.querySelector('strong')?.textContent).toBe('Chan')

    expect(second.style.getPropertyValue('--hmr-reveal-delay')).toBe('80ms')

    probe.unmount()
  })

  it('does not wrap empty targets or already prepared targets again', async () => {
    let callback: ObserverCallback | undefined
    class MockMutationObserver {
      constructor(observerCallback: ObserverCallback) {
        callback = observerCallback
      }

      observe = vi.fn()
      disconnect = vi.fn()
      takeRecords = () => []
    }
    globalThis.MutationObserver = MockMutationObserver as unknown as typeof MutationObserver

    const empty = document.createElement('h2')
    empty.dataset.hmrTextReveal = ''
    empty.textContent = '   '
    const prepared = document.createElement('h2')
    prepared.dataset.hmrTextReveal = ''
    prepared.textContent = 'Ready'
    document.body.append(empty, prepared)

    const probe = mountTextRevealProbe()
    await waitForMountedReveal()

    expect(empty.classList.contains('hmr-text-ready')).toBe(true)
    expect(empty.querySelector('.hmr-reveal-mask')).toBeNull()
    expect(prepared.querySelectorAll('.hmr-reveal-mask')).toHaveLength(1)

    callback?.([], new MockMutationObserver(callback) as unknown as MutationObserver)

    expect(prepared.querySelectorAll('.hmr-reveal-mask')).toHaveLength(1)

    probe.unmount()
  })

  it('prepares inserted matching nodes and disconnects on unmount', async () => {
    let callback: ObserverCallback | undefined
    const disconnect = vi.fn()
    const observe = vi.fn()
    class MockMutationObserver {
      constructor(observerCallback: ObserverCallback) {
        callback = observerCallback
      }

      observe = observe
      disconnect = disconnect
      takeRecords = () => []
    }
    globalThis.MutationObserver = MockMutationObserver as unknown as typeof MutationObserver

    const probe = mountTextRevealProbe('[data-custom-reveal]')
    await waitForMountedReveal()

    const inserted = document.createElement('h2')
    inserted.dataset.customReveal = ''
    inserted.textContent = 'Inserted'
    document.body.append(inserted)
    callback?.([], new MockMutationObserver(callback) as unknown as MutationObserver)

    expect(observe).toHaveBeenCalledWith(document.body, { childList: true, subtree: true })
    expect(inserted.classList.contains('hmr-text-ready')).toBe(true)
    expect(inserted.querySelector('.hmr-reveal-inner')?.textContent).toBe('Inserted')

    probe.unmount()

    expect(disconnect).toHaveBeenCalledTimes(1)
  })
})
