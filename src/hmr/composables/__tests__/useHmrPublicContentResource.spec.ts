import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useHmrPublicContentResource } from '@/hmr/composables/useHmrPublicContentResource'
import type { HmrAsyncResource } from '@/hmr/types'
import { readAvailablePublicContent, readPublicContent } from '@/utils/cache/publicContentCache'

vi.mock('@/utils/cache/publicContentCache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/cache/publicContentCache')>()
  return {
    ...actual,
    readAvailablePublicContent: vi.fn(),
    readPublicContent: vi.fn(),
  }
})

interface TestContent {
  items: string[]
}

const readAvailablePublicContentMock = vi.mocked(readAvailablePublicContent)
const readPublicContentMock = vi.mocked(readPublicContent)

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

describe('useHmrPublicContentResource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes an idle local resource from the provided content', () => {
    const initialData = { items: [] }
    const loader = vi.fn(async () => makeResource({ items: ['loaded'] }))
    const resource = useHmrPublicContentResource({
      initialData,
      paths: ['/test'],
      cacheKey: 'hmr:test',
      scope: 'snapshot',
      loader,
    })

    expect(resource.content.value).toBe(initialData)
    expect(resource.pageState.value).toBe('idle')
    expect(resource.resource.value).toEqual({
      state: 'idle',
      data: initialData,
      source: 'local',
      error: null,
      paths: ['/test'],
      updatedAt: null,
    })
  })

  it('refreshes through the public content cache and applies ready data', async () => {
    const loader = vi.fn(async () => makeResource({ items: ['fresh'] }))
    const nextResource = makeResource({ items: ['fresh'] })
    readPublicContentMock.mockResolvedValueOnce(nextResource)
    const resource = useHmrPublicContentResource({
      initialData: { items: [] },
      paths: ['/test'],
      cacheKey: 'hmr:test',
      scope: 'snapshot',
      strategy: 'network-first',
      loader,
      isEmpty: (data) => data.items.length === 0,
    })

    await expect(resource.refresh()).resolves.toBe(nextResource)

    expect(readPublicContentMock).toHaveBeenCalledWith({
      key: 'hmr:test',
      scope: 'snapshot',
      strategy: 'network-first',
      loader,
    })
    expect(resource.content.value).toBe(nextResource.data)
    expect(resource.pageState.value).toBe('ready')
    expect(resource.resource.value).toBe(nextResource)
  })

  it('supports dynamic cache keys and caller-defined empty states', async () => {
    const loader = vi.fn(async () => makeResource({ items: [] }))
    const cacheKey = vi.fn(() => 'hmr:test:dynamic')
    const nextResource = makeResource({ items: [] })
    readPublicContentMock.mockResolvedValueOnce(nextResource)
    const resource = useHmrPublicContentResource({
      initialData: { items: ['seed'] },
      paths: ['/test'],
      cacheKey,
      scope: 'snapshot',
      loader,
      isEmpty: (data) => data.items.length === 0,
    })

    await resource.refresh()

    expect(cacheKey).toHaveBeenCalledOnce()
    expect(readPublicContentMock).toHaveBeenCalledWith({
      key: 'hmr:test:dynamic',
      scope: 'snapshot',
      loader,
    })
    expect(resource.pageState.value).toBe('empty')
  })

  it('allows callers to derive page state from the resolved resource', async () => {
    const loader = vi.fn(async () => makeResource({ items: [] }))
    const nextResource = makeResource({ items: [] })
    readPublicContentMock.mockResolvedValueOnce(nextResource)
    const resource = useHmrPublicContentResource({
      initialData: { items: [] },
      paths: ['/test'],
      cacheKey: 'hmr:test',
      scope: 'snapshot',
      loader,
      isEmpty: () => true,
      resolvePageState: (data) => (data.items.length === 0 ? 'error' : 'ready'),
    })

    await resource.refresh()

    expect(resource.pageState.value).toBe('error')
  })

  it('can apply available stale data before resolving the network refresh', async () => {
    const loader = vi.fn(async () => makeResource({ items: ['fresh'] }))
    const staleResource = makeResource({ items: ['stale'] })
    const freshResource = makeResource({ items: ['fresh'] })
    readAvailablePublicContentMock.mockResolvedValueOnce(staleResource)
    readPublicContentMock.mockResolvedValueOnce(freshResource)
    const onResolved = vi.fn()
    const resource = useHmrPublicContentResource({
      initialData: { items: [] },
      paths: ['/test'],
      cacheKey: 'hmr:test',
      scope: 'snapshot',
      loader,
      readAvailableBeforeRefresh: true,
      onResolved,
    })

    await expect(resource.refresh()).resolves.toBe(freshResource)

    expect(readAvailablePublicContentMock).toHaveBeenCalledWith({
      key: 'hmr:test',
      scope: 'snapshot',
    })
    expect(onResolved).toHaveBeenCalledExactlyOnceWith(freshResource.data, freshResource)
    expect(resource.content.value).toBe(freshResource.data)
  })
})
