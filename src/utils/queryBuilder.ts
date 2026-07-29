type QueryValue = string | number | boolean | undefined | null

export function buildQuery(params: Record<string, QueryValue>): string {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    query.set(key, String(value))
  }

  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export function parseQuery(queryString: string): Record<string, string> {
  const params = new URLSearchParams(queryString)
  const result: Record<string, string> = {}

  for (const [key, value] of params.entries()) {
    result[key] = value
  }

  return result
}

export function mergeQueryParams(
  base: Record<string, QueryValue>,
  override: Record<string, QueryValue>
): Record<string, QueryValue> {
  return { ...base, ...override }
}
