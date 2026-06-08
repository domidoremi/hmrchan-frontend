import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { normalizeHmrPreferences, usePreferencesStore } from '@/stores/preferences'

describe('preferences store', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it('uses empty defaults after removing user-controlled animation preferences', () => {
    const store = usePreferencesStore()

    expect(store.preferences).toEqual({})
  })

  it('normalizes old or malformed stored data without carrying removed fields forward', () => {
    expect(
      normalizeHmrPreferences({
        enableAnimations: false,
        animationIntensity: 'loud',
        autoHeroInteraction: false,
      })
    ).toEqual({})
  })

  it('falls back to empty defaults when stored preferences are not parseable', () => {
    window.localStorage.setItem('hmr.preferences.v1', '{not-json')

    const store = usePreferencesStore()

    expect(store.preferences).toEqual({})
  })

  it('normalizes stored legacy preferences during startup', () => {
    window.localStorage.setItem(
      'hmr.preferences.v1',
      JSON.stringify({
        animationIntensity: 'loud',
        autoHeroInteraction: false,
        enableAnimations: false,
      })
    )

    const store = usePreferencesStore()

    expect(store.preferences).toEqual({})
  })

  it('initializes stored preferences only once after creation', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
    const store = usePreferencesStore()

    store.initializePreferences()
    store.initializePreferences()

    expect(getItem).toHaveBeenCalledTimes(2)
  })

  it('persists the normalized preference shape', async () => {
    const store = usePreferencesStore()

    store.replacePreferences({} as never)
    await Promise.resolve()

    expect(JSON.parse(window.localStorage.getItem('hmr.preferences.v1') ?? '{}')).toEqual({})
  })
})
