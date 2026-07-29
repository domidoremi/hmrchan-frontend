import { normalizeToProxyPath } from './url'

const BLOCKED_AVATAR_HOST_SUFFIXES = ['tiktokcdn.com', 'tiktokcdn-us.com', 'twimg.com']
const BLOCKED_AVATAR_HOSTS = new Set(['pbs.twimg.com'])
const RETIRED_LEGACY_AVATAR_PATH_PREFIXES = ['/uploads/avatars/', '/uploads/comment_images/']

function isBlockedExternalAvatarHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase()
  if (!normalized) return false
  if (BLOCKED_AVATAR_HOSTS.has(normalized)) return true
  return BLOCKED_AVATAR_HOST_SUFFIXES.some(
    (suffix) => normalized === suffix || normalized.endsWith(`.${suffix}`)
  )
}

function isRetiredLegacyAvatarPath(value: string): boolean {
  return RETIRED_LEGACY_AVATAR_PATH_PREFIXES.some((prefix) => value.startsWith(prefix))
}

/** Accepts storage-backed public URLs and rejects retired /uploads paths. */
export function normalizeAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const normalized = normalizeToProxyPath(url)
  const resolved = normalized ?? url

  if (isRetiredLegacyAvatarPath(resolved)) {
    return null
  }

  if (!/^https?:\/\//i.test(resolved)) {
    return resolved
  }

  try {
    const parsed = new URL(resolved)
    if (isRetiredLegacyAvatarPath(parsed.pathname)) {
      return null
    }

    if (isBlockedExternalAvatarHost(parsed.hostname)) {
      return null
    }

    const isYoutubeThumbnail = parsed.hostname === 'i.ytimg.com'
    const isMaxResVariant = /\/vi\/[^/]+\/maxresdefault\.jpg$/i.test(parsed.pathname)

    // Some YouTube videos lack maxresdefault.jpg; avoid predictable Lighthouse failures.
    if (isYoutubeThumbnail && isMaxResVariant) {
      parsed.pathname = parsed.pathname.replace(/maxresdefault\.jpg$/i, 'hqdefault.jpg')
      return parsed.toString()
    }
  } catch {
    return resolved
  }

  return resolved
}
