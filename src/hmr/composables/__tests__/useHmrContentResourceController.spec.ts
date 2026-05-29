import { describe, expect, it } from 'vitest'

import {
  createHmrInitialResource,
  useHmrContentResourceController,
} from '@/hmr/composables/useHmrContentResourceController'
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
    paths: ['/test'],
    updatedAt: '2026-05-28T00:00:00.000Z',
  }
}

describe('createHmrInitialResource', () => {
  it('creates the shared idle local resource shape', () => {
    const data = { rows: [] }

    expect(createHmrInitialResource(data, ['/test'])).toEqual({
      state: 'idle',
      data,
      source: 'local',
      error: null,
      paths: ['/test'],
      updatedAt: null,
    })
  })
})

describe('useHmrContentResourceController', () => {
  it('applies resources and derives ready, empty, and custom page states', () => {
    const controller = useHmrContentResourceController<TestContent>({
      initialData: { rows: ['seed'] },
      paths: ['/test'],
      isEmpty: (data) => data.rows.length === 0,
    })
    const readyResource = makeResource({ rows: ['loaded'] })

    expect(controller.pageState.value).toBe('idle')
    expect(controller.applyResource(readyResource)).toBe(readyResource)
    expect(controller.content.value).toBe(readyResource.data)
    expect(controller.pageState.value).toBe('ready')

    controller.applyResource(makeResource({ rows: [] }))
    expect(controller.pageState.value).toBe('empty')

    const customController = useHmrContentResourceController<TestContent>({
      initialData: { rows: [] },
      paths: ['/test'],
      resolvePageState: () => 'error',
    })
    customController.applyResource(makeResource({ rows: ['ignored'] }))
    expect(customController.pageState.value).toBe('error')
  })

  it('marks loading without replacing current data and creates local ready resources', () => {
    const controller = useHmrContentResourceController<TestContent>({
      initialData: { rows: ['seed'] },
      paths: ['/test'],
    })

    controller.markLoading()

    expect(controller.content.value).toEqual({ rows: ['seed'] })
    expect(controller.pageState.value).toBe('loading')
    expect(controller.resource.value.state).toBe('loading')

    controller.markReady({ rows: ['local'] })

    expect(controller.resource.value).toEqual(
      expect.objectContaining({
        state: 'ready',
        data: { rows: ['local'] },
        source: 'local',
        error: null,
        paths: ['/test'],
      })
    )
    expect(controller.resource.value.updatedAt).toEqual(expect.any(String))
  })
})
