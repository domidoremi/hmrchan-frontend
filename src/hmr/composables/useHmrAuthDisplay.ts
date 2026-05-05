import { computed } from 'vue'

import type { HmrAuthDisplayState } from '@/hmr/types'
import { useAuthStore } from '@/stores/auth'

export function useHmrAuthDisplay() {
  const auth = useAuthStore()

  const authDisplay = computed<HmrAuthDisplayState>(() => {
    const username = auth.user?.username ? `@${auth.user.username}` : null
    const shortId = auth.user?.id ? auth.user.id.slice(0, 8) : null
    const identity =
      username && shortId ? `${username} / ${shortId}` : (username ?? shortId ?? 'Guest')
    const base = {
      isAuthenticated: auth.isAuthenticated,
      displayName: auth.displayName,
      identity,
    }

    return auth.avatarUrl ? { ...base, avatarUrl: auth.avatarUrl } : base
  })

  return { auth, authDisplay }
}
