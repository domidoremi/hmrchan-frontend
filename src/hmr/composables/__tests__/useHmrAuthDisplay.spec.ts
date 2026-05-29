import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useHmrAuthDisplay } from '@/hmr/composables/useHmrAuthDisplay'
import { useAuthStore } from '@/stores/auth'

describe('useHmrAuthDisplay', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('builds guest identity when no user is authenticated', () => {
    const { authDisplay } = useHmrAuthDisplay()

    expect(authDisplay.value).toEqual({
      isAuthenticated: false,
      displayName: 'MomiChan',
      identity: 'Guest',
    })
  })

  it('combines username, short id, display name, and avatar when authenticated', () => {
    const auth = useAuthStore()
    auth.user = {
      id: 'user-123456789',
      username: 'momi',
      full_name: 'Momi',
      avatar_url: '/avatar.webp',
    }

    const { authDisplay } = useHmrAuthDisplay()

    expect(authDisplay.value).toEqual({
      isAuthenticated: true,
      displayName: 'Momi',
      identity: '@momi / user-123',
      avatarUrl: '/avatar.webp',
    })
  })
})
