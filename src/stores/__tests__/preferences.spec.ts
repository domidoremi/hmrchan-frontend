import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { normalizeHmrPreferences, usePreferencesStore } from '@/stores/preferences'

describe('preferences store', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it('uses the simplified defaults for global animations', () => {
    const store = usePreferencesStore()

    expect(store.preferences).toEqual({
      enableAnimations: true,
    })
  })

  it('normalizes old or malformed stored data without carrying removed fields forward', () => {
    expect(
      normalizeHmrPreferences({
        enableAnimations: false,
        animationIntensity: 'loud',
        autoHeroInteraction: false,
      })
    ).toEqual({
      enableAnimations: false,
    })
  })

  it('persists only the animation preference', async () => {
    const store = usePreferencesStore()

    store.setAnimationsEnabled(false)
    await Promise.resolve()

    expect(JSON.parse(window.localStorage.getItem('hmr.preferences.v1') ?? '{}')).toEqual({
      enableAnimations: false,
    })
  })
})
