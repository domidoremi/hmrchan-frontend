export type PublicContentTier = 'guest' | 'user' | 'admin'

export interface PublicVisibilityScope {
  tier: PublicContentTier | null
  limit: number | null
}

export const DEFAULT_PUBLIC_VISIBILITY_SCOPE: PublicVisibilityScope = Object.freeze({
  tier: null,
  limit: null,
})

export function readPublicVisibilityHeaders(headers: Headers): PublicVisibilityScope {
  const rawTier = headers.get('X-Content-Tier')?.trim().toLowerCase() ?? ''
  const tier =
    rawTier === 'guest' || rawTier === 'user' || rawTier === 'admin'
      ? (rawTier as PublicContentTier)
      : null

  const rawLimit = headers.get('X-Content-Limit')
  const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : Number.NaN

  return {
    tier,
    limit: Number.isFinite(parsedLimit) ? parsedLimit : null,
  }
}
