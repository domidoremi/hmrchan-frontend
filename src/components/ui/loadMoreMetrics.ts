export interface LoadMoreMetrics {
  count: number
  total: number
  progressPercent: number
}

export function resolveLoadMoreMetrics(count: number, total: number): LoadMoreMetrics {
  const normalizedCount = Number.isFinite(count) ? Math.max(0, count) : 0
  const normalizedTotal = Number.isFinite(total) ? Math.max(0, total) : 0
  const displayTotal = Math.max(normalizedTotal, normalizedCount)
  const progressPercent =
    displayTotal === 0 ? 0 : Math.min((normalizedCount / displayTotal) * 100, 100)

  return {
    count: normalizedCount,
    total: displayTotal,
    progressPercent,
  }
}
