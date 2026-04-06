function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function readPath(source: unknown, path: readonly string[]): unknown {
  let current: unknown = source
  for (const segment of path) {
    const record = asRecord(current)
    if (!record || !(segment in record)) {
      return undefined
    }
    current = record[segment]
  }
  return current
}

export function pickSummaryCount(
  payload: unknown,
  candidatePaths: ReadonlyArray<readonly string[]>
): number | null {
  for (const path of candidatePaths) {
    const value = readNumber(readPath(payload, path))
    if (value !== null) {
      return Math.max(0, Math.trunc(value))
    }
  }
  return null
}
