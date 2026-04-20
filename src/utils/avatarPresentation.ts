import { normalizeAvatarUrl } from './avatarUrl'

export function resolveAvatarSrc(avatarUrl: string | null | undefined): string | undefined {
  return normalizeAvatarUrl(avatarUrl || undefined) || undefined
}

export function getAvatarFallbackLabel(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    const normalized = candidate?.trim()
    if (normalized) {
      return normalized.slice(0, 1).toUpperCase()
    }
  }

  return '?'
}
