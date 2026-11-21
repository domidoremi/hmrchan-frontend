import { authorService } from '@/api/authorService'
import { isUuidV7String } from '@/types/publicId'
import { normalizeToProxyPath } from './url'
import { resolveAvatarSrc } from './avatarPresentation'

export const AUTHOR_AVATAR_FALLBACK = '/journal/mascot.webp'

export function publicAuthorAvatar(value: string | null | undefined): string | undefined {
  const source = normalizeToProxyPath(value)
  if (!source || source === AUTHOR_AVATAR_FALLBACK) return
  if (/^\/(?!\/)/.test(source)) return resolveAvatarSrc(source)
  try {
    const url = new URL(source)
    if (url.protocol !== 'https:' || url.username || url.password) return
    // These are source account portraits, not user-supplied profile images.
    if (url.hostname === 'pbs.twimg.com' && url.pathname.startsWith('/profile_images/')) {
      return url.href
    }
    if (/(^|\.)tiktokcdn(?:-us)?\.com$/.test(url.hostname)) return url.href
    return resolveAvatarSrc(url.href)
  } catch {
    return undefined
  }
}

const requests = new Map<string, { expires: number; result: Promise<string | undefined> }>()

/** Post list fields are optional; only an exact author ID may supply a missing portrait. */
export function loadPublicAuthorAvatar(id: string | null | undefined) {
  if (!isUuidV7String(id)) return Promise.resolve(undefined)
  const cached = requests.get(id)
  if (cached && Date.now() < cached.expires) return cached.result
  requests.delete(id)
  if (requests.size >= 128) requests.delete(requests.keys().next().value!)

  const entry = {
    expires: Number.POSITIVE_INFINITY,
    result: authorService.getAuthor(id, { skipErrorToast: true }).then(
      (author) => {
        const portrait = author.id === id ? publicAuthorAvatar(author.avatar_url) : undefined
        entry.expires = Date.now() + (portrait ? 10 * 60_000 : 30_000)
        return portrait
      },
      () => {
        entry.expires = Date.now() + 30_000
        return undefined
      }
    ),
  }
  requests.set(id, entry)
  return entry.result
}
