import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const preferencesMocks = vi.hoisted(() => ({
  get: vi.fn(),
  replace: vi.fn(),
  reset: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  preferencesService: preferencesMocks,
}))

import { useAuthStore, useSettingsStore } from '@/stores'
import { transitionAuthSessionScope } from '../authSessionScope'
import { usePreferencesSyncService } from '../preferencesSyncService'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}

describe('preferencesSyncService', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    transitionAuthSessionScope(null)
  })

  it('does not apply a deferred response after the authenticated principal changes', async () => {
    const userAResponse = deferred<{ show_hero_section: boolean }>()
    const userBResponse = deferred<{ show_hero_section: boolean }>()
    preferencesMocks.get
      .mockReturnValueOnce(userAResponse.promise)
      .mockReturnValueOnce(userBResponse.promise)

    const authStore = useAuthStore()
    const settingsStore = useSettingsStore()

    transitionAuthSessionScope('user-a')
    authStore.$patch({ user: { id: 'user-a' } as never })
    usePreferencesSyncService()
    await nextTick()

    transitionAuthSessionScope('user-b')
    authStore.$patch({ user: { id: 'user-b' } as never })
    await nextTick()

    userBResponse.resolve({ show_hero_section: true })
    await Promise.resolve()
    await nextTick()
    expect(settingsStore.exportPreferences().show_hero_section).toBe(true)

    userAResponse.resolve({ show_hero_section: false })
    await Promise.resolve()
    await nextTick()
    expect(settingsStore.exportPreferences().show_hero_section).toBe(true)
  })
})
