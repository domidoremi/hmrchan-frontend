export interface LoadMoreMetrics {
  count: number
  total: number
  progressPercent: number
}

export function resolveLoadMoreMetrics(count: number, total?: number): LoadMoreMetrics {
  const normalizedCount = Number.isFinite(count) ? Math.max(0, count) : 0
  const normalizedTotal = Number.isFinite(total) ? Math.max(0, total ?? 0) : 0
  const displayTotal = normalizedTotal > 0 ? normalizedTotal : normalizedCount
  const displayCount = displayTotal > 0 ? Math.min(normalizedCount, displayTotal) : normalizedCount
  const progressPercent =
    displayTotal === 0 ? 0 : Math.min((displayCount / displayTotal) * 100, 100)

  return {
    count: displayCount,
    total: displayTotal,
    progressPercent,
  }
}
