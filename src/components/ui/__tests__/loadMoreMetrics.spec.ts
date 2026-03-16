import { describe, expect, it } from 'vitest'
import { resolveLoadMoreMetrics } from '../loadMoreMetrics'

describe('resolveLoadMoreMetrics', () => {
  it('normalizes stale totals when loaded count exceeds reported total', () => {
    expect(resolveLoadMoreMetrics(60, 48)).toEqual({
      count: 60,
      total: 60,
      progressPercent: 100,
    })
  })

  it('keeps zero progress stable when both count and total are empty', () => {
    expect(resolveLoadMoreMetrics(0, 0)).toEqual({
      count: 0,
      total: 0,
      progressPercent: 0,
    })
  })
})
