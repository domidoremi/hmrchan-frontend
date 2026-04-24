const UUID_V7_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeCandidate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized) return null

  const lowered = normalized.toLowerCase()
  if (lowered === 'undefined' || lowered === 'null' || lowered === 'nan') {
    return null
  }

  return normalized
}

export function isContractResourceId(value: unknown): value is string {
  const normalized = normalizeCandidate(value)
  return normalized !== null && UUID_V7_RE.test(normalized)
}

export function getContractResourceId(value: unknown): string | null {
  const normalized = normalizeCandidate(value)
  if (!normalized) return null
  return UUID_V7_RE.test(normalized) ? normalized : null
}
