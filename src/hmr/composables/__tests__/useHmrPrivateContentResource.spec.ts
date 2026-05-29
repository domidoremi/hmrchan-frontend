import { describe, expect, it, vi } from 'vitest'

import { useHmrPrivateContentResource } from '@/hmr/composables/useHmrPrivateContentResource'
import type { HmrAsyncResource } from '@/hmr/types'

interface TestContent {
  rows: string[]
}

function makeResource(data: TestContent): HmrAsyncResource<TestContent> {
  return {
    state: 'ready',
    data,
    source: 'api',
    error: null,
    paths: ['/private'],
    updatedAt: '2026-05-28T00:00:00.000Z',
  }
}

describe('useHmrPrivateContentResource', () => {
  it('initializes an idle local resource and refreshes through the loader', async () => {
    const nextResource = makeResource({ rows: ['loaded'] })
    const loader = vi.fn(async () => nextResource)
    const resource = useHmrPrivateContentResource({
      initialData: { rows: [] },
      paths: ['/private'],
      loader,
      isEmpty: (data) => data.rows.length === 0,
    })

    expect(resource.pageState.value).toBe('idle')
    await expect(resource.refresh()).resolves.toBe(nextResource)

    expect(loader).toHaveBeenCalledOnce()
    expect(resource.content.value).toBe(nextResource.data)
    expect(resource.resource.value).toBe(nextResource)
    expect(resource.pageState.value).toBe('ready')
  })

  it('supports local ready resources without invoking the loader', () => {
    const loader = vi.fn(async () => makeResource({ rows: ['remote'] }))
    const resource = useHmrPrivateContentResource({
      initialData: { rows: [] },
      paths: ['/private'],
      loader,
      isEmpty: (data) => data.rows.length === 0,
    })

    resource.markReady({ rows: ['local'] })

    expect(loader).not.toHaveBeenCalled()
    expect(resource.content.value).toEqual({ rows: ['local'] })
    expect(resource.resource.value.source).toBe('local')
    expect(resource.pageState.value).toBe('ready')
  })

  it('allows callers to override page state resolution', async () => {
    const loader = vi.fn(async () => makeResource({ rows: [] }))
    const resource = useHmrPrivateContentResource({
      initialData: { rows: [] },
      paths: ['/private'],
      loader,
      isEmpty: () => true,
      resolvePageState: () => 'error',
    })

    await resource.refresh()

    expect(resource.pageState.value).toBe('error')
  })
})
