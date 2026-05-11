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

  it('normalizes old or malformed stored data without carrying desk pet fields forward', () => {
    expect(
      normalizeHmrPreferences({
        enableAnimations: false,
        animationIntensity: 'loud',
        deskPet: {
          enabled: false,
        },
      })
    ).toEqual({
      enableAnimations: false,
    })
  })

  it('persists animation preference without desk pet state', async () => {
    const store = usePreferencesStore()

    store.setAnimationsEnabled(false)
    await Promise.resolve()

    expect(JSON.parse(window.localStorage.getItem('hmr.preferences.v1') ?? '{}')).toEqual({
      enableAnimations: false,
    })
  })
})
