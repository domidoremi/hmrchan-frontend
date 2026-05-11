import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { normalizeHmrPreferences, usePreferencesStore } from '@/stores/preferences'

describe('preferences store', () => {
  beforeEach(() => {
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

  it('persists the normalized preference shape', async () => {
    const store = usePreferencesStore()

    store.replacePreferences({} as never)
    await Promise.resolve()

    expect(JSON.parse(window.localStorage.getItem('hmr.preferences.v1') ?? '{}')).toEqual({})
  })
})
