import { createApp, defineComponent, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import {
  normalizeHmrRouteParam,
  useHmrMountedResourceRefresh,
  useHmrRouteResourceRefresh,
} from '@/hmr/composables/useHmrRouteResourceRefresh'

describe('normalizeHmrRouteParam', () => {
  it('normalizes scalar, array, empty, and missing route params', () => {
    expect(normalizeHmrRouteParam(' post-1 ', 'signal-room')).toBe('post-1')
    expect(normalizeHmrRouteParam(['post-2'], 'signal-room')).toBe('post-2')
    expect(normalizeHmrRouteParam('', 'signal-room')).toBe('signal-room')
    expect(normalizeHmrRouteParam(undefined, 'signal-room')).toBe('signal-room')
  })
})

describe('useHmrRouteResourceRefresh', () => {
  it('refreshes on mount and when the watched route source changes', async () => {
    const source = ref('post-1')
    const refresh = vi.fn()
    const app = createApp(
      defineComponent({
        setup() {
          useHmrRouteResourceRefresh({
            refresh,
            watchSource: () => source.value,
          })
          return () => null
        },
      })
    )

    app.mount(document.createElement('div'))

    expect(refresh).toHaveBeenCalledOnce()

    source.value = 'post-2'
    await nextTick()

    expect(refresh).toHaveBeenCalledTimes(2)

    app.unmount()
  })
})

describe('useHmrMountedResourceRefresh', () => {
  it('refreshes once when the host component mounts', () => {
    const refresh = vi.fn()
    const app = createApp(
      defineComponent({
        setup() {
          useHmrMountedResourceRefresh(refresh)
          return () => null
        },
      })
    )

    app.mount(document.createElement('div'))

    expect(refresh).toHaveBeenCalledOnce()

    app.unmount()
  })
})
