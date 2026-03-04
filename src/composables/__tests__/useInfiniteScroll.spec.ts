import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useInfiniteScroll } from '../useInfiniteScroll'

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []

  callback: IntersectionObserverCallback
  observe = vi.fn<(target: Element) => void>()
  unobserve = vi.fn<(target: Element) => void>()
  disconnect = vi.fn<() => void>()

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    MockIntersectionObserver.instances.push(this)
  }

  trigger(entry: Partial<IntersectionObserverEntry> = {}) {
    const payload = {
      isIntersecting: false,
      target: document.createElement('div'),
      ...entry,
    } as IntersectionObserverEntry

    this.callback([payload], this as unknown as IntersectionObserver)
  }
}

const originalIntersectionObserver = globalThis.IntersectionObserver

function mountHost(
  loadMore: () => void | boolean | Promise<void | boolean>,
  enabled?: boolean | Ref<boolean> | (() => boolean),
  sentinelAsGetter = false
) {
  const sentinel = ref<HTMLElement | null>(null)

  const Host = defineComponent({
    setup() {
      useInfiniteScroll(sentinelAsGetter ? () => sentinel.value : sentinel, loadMore, { enabled })
      return () => h('div', [h('div', { ref: sentinel, 'data-testid': 'sentinel' })])
    },
  })

  return mount(Host)
}

describe('useInfiniteScroll', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = []
    globalThis.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver
  })

  afterEach(() => {
    vi.clearAllMocks()
    if (originalIntersectionObserver) {
      globalThis.IntersectionObserver = originalIntersectionObserver
    } else {
      delete (globalThis as Partial<typeof globalThis>).IntersectionObserver
    }
  })

  it('enabled=true 时应创建 observer 并触发 loadMore', async () => {
    const loadMore = vi.fn()
    const wrapper = mountHost(loadMore, true)

    await nextTick()

    expect(MockIntersectionObserver.instances).toHaveLength(1)

    const observer = MockIntersectionObserver.instances[0]!
    const sentinel = wrapper.get('[data-testid="sentinel"]').element

    expect(observer.observe).toHaveBeenCalledWith(sentinel)

    observer.trigger({ isIntersecting: true, target: sentinel })
    await Promise.resolve()

    expect(loadMore).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })

  it('enabled=false 时不应创建 observer', async () => {
    const loadMore = vi.fn()
    const wrapper = mountHost(loadMore, false)

    await nextTick()

    expect(MockIntersectionObserver.instances).toHaveLength(0)
    expect(loadMore).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('应支持 Ref<boolean> 形式的 enabled 开关', async () => {
    const loadMore = vi.fn()
    const enabled = ref(false)
    const wrapper = mountHost(loadMore, enabled)

    await nextTick()
    expect(MockIntersectionObserver.instances).toHaveLength(0)

    enabled.value = true
    await nextTick()

    expect(MockIntersectionObserver.instances).toHaveLength(1)

    const observer = MockIntersectionObserver.instances[0]!
    const sentinel = wrapper.get('[data-testid="sentinel"]').element

    observer.trigger({ isIntersecting: true, target: sentinel })
    await Promise.resolve()

    expect(loadMore).toHaveBeenCalledTimes(1)

    enabled.value = false
    await nextTick()

    expect(observer.disconnect).toHaveBeenCalled()

    wrapper.unmount()
  })

  it('应支持 getter 形式的 enabled 开关', async () => {
    const loadMore = vi.fn()
    const enabled = ref(false)
    const wrapper = mountHost(loadMore, () => enabled.value)

    await nextTick()
    expect(MockIntersectionObserver.instances).toHaveLength(0)

    enabled.value = true
    await nextTick()

    expect(MockIntersectionObserver.instances).toHaveLength(1)

    const observer = MockIntersectionObserver.instances[0]!
    const sentinel = wrapper.get('[data-testid="sentinel"]').element

    observer.trigger({ isIntersecting: true, target: sentinel })
    await Promise.resolve()

    expect(loadMore).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })

  it('应支持 getter 形式的 sentinel 引用', async () => {
    const loadMore = vi.fn()
    const wrapper = mountHost(loadMore, true, true)

    await nextTick()
    expect(MockIntersectionObserver.instances).toHaveLength(1)

    const observer = MockIntersectionObserver.instances[0]!
    const sentinel = wrapper.get('[data-testid="sentinel"]').element

    observer.trigger({ isIntersecting: true, target: sentinel })
    await Promise.resolve()

    expect(loadMore).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })
})
