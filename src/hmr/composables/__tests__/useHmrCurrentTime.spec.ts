import { createApp, defineComponent, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useHmrCurrentTime } from '@/hmr/composables/useHmrCurrentTime'

describe('useHmrCurrentTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-28T12:34:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats time in the provided time zone and updates on an interval', async () => {
    const app = createApp(
      defineComponent({
        setup() {
          return useHmrCurrentTime('UTC')
        },
        template: '<span>{{ currentTime }} {{ timeZoneLabel }}</span>',
      })
    )
    const root = document.createElement('div')

    app.mount(root)

    expect(root.textContent).toContain('12:34')
    expect(root.textContent).toContain('UTC')

    vi.setSystemTime(new Date('2026-05-28T12:35:00.000Z'))
    vi.advanceTimersByTime(1000)
    await nextTick()

    expect(root.textContent).toContain('12:35')

    app.unmount()
  })
})
