import { computed, getCurrentScope, onScopeDispose, ref, watch } from 'vue'
import { useAuthSurface } from '@/services/authSurface'
import { resolveAvatarSrc } from '@/utils/avatarPresentation'

const avatarVersion = ref(Date.now())
const DEFAULT_AVATAR = '/images/expressions/sitting-sm.webp'

function getDefaultAvatar(): string {
  return DEFAULT_AVATAR
}

export function getUserAvatarUrl(avatarUrl: string | null | undefined): string {
  const normalized = resolveAvatarSrc(avatarUrl)

  if (normalized) {
    const separator = normalized.includes('?') ? '&' : '?'
    return `${normalized}${separator}v=${avatarVersion.value}`
  }

  return getDefaultAvatar()
}

export function refreshAvatarCache(): void {
  avatarVersion.value = Date.now()
}

export function useUserAvatar() {
  const { user } = useAuthSurface()

  const avatarUrl = computed(() => {
    return getUserAvatarUrl(user.value?.avatar_url)
  })

  const stopUserAvatarWatch = watch(
    () => user.value?.avatar_url,
    (newUrl, oldUrl) => {
      if (newUrl && newUrl !== oldUrl) {
        refreshAvatarCache()
      }
    }
  )

  if (getCurrentScope()) {
    onScopeDispose(stopUserAvatarWatch)
  }

  return {
    avatarUrl,
    refreshAvatarCache,
  }
}

const MAX_PRELOADED_AVATARS = 5
const preloadCache = new Map<string, HTMLLinkElement>()

export function preloadUserAvatar(url: string): void {
  if (typeof document === 'undefined') return
  if (!url || url === DEFAULT_AVATAR) return

  if (preloadCache.has(url)) return

  try {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = url
    ;(link as HTMLLinkElement & { fetchPriority: string }).fetchPriority = 'high'
    document.head.appendChild(link)

    preloadCache.set(url, link)

    if (preloadCache.size > MAX_PRELOADED_AVATARS) {
      const oldestUrl = preloadCache.keys().next().value
      if (oldestUrl) {
        const oldLink = preloadCache.get(oldestUrl)
        if (oldLink) {
          oldLink.remove()
        }
        preloadCache.delete(oldestUrl)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to preload avatar:', url, error)
    }
  }
}

export function clearAvatarPreloadCache(): void {
  preloadCache.forEach((link) => link.remove())
  preloadCache.clear()
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    clearAvatarPreloadCache()
  })
}
