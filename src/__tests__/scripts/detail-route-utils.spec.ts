import { describe, expect, it, vi } from 'vitest'

import { resolveSampleDetailRoute } from '../../../scripts/lib/detail-route-utils.js'

function createRouteProbePage(state: Record<string, unknown>) {
  return {
    evaluate: vi.fn(async () => state),
    goto: vi.fn(async () => undefined),
    waitForFunction: vi.fn(async () => undefined),
    waitForSelector: vi.fn(async () => undefined),
  }
}

describe('detail route utility sample resolution', () => {
  it('marks detail empty and error states as data-dependent sample misses', async () => {
    const page = createRouteProbePage({
      hasShell: true,
      hasUnavailableDetailState: true,
      notFound: false,
      pathname: '/posts/018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a10',
      title: 'Post detail · MomiChan',
    })

    const result = await resolveSampleDetailRoute(page, 'http://127.0.0.1:4173', {
      dataDependent: true,
      detailKind: 'post',
      fallbackRoute: '',
      label: 'sample post route',
      requestedRoute: '/posts/018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a10',
      shellSelector: '.hmr-detail--reader',
    })

    expect(result).toMatchObject({
      classification: 'data-dependent',
      route: null,
      source: null,
    })
    expect(result.skipReason).toContain('resolved to detail unavailable state')
    expect(result.skipReason).toContain('sample data is unavailable')
  })

  it('rejects live detail candidates that do not satisfy required sample readiness', async () => {
    const page = createRouteProbePage({
      hasShell: true,
      hasUnavailableDetailState: false,
      notFound: false,
      pathname: '/posts/019e854f-dc1b-7a22-930b-fe05ca95d7c1',
      title: 'Post detail · MomiChan',
    })
    page.waitForFunction
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Waiting for selector `.hmr-detail-comment-list` failed'))

    const result = await resolveSampleDetailRoute(page, 'http://127.0.0.1:4173', {
      dataDependent: true,
      detailKind: 'post',
      fallbackRoute: '',
      label: 'sample post route',
      readinessSelectorsAny: ['.hmr-detail-comment-list'],
      requestedRoute: '/posts/019e854f-dc1b-7a22-930b-fe05ca95d7c1',
      shellSelector: '.hmr-detail--reader',
    })

    expect(result).toMatchObject({
      classification: 'unavailable',
      route: null,
      source: null,
    })
    expect(result.skipReason).toContain('did not reach detail readiness')
  })
})
