import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { normalizeHmrPreferences, usePreferencesStore } from '@/stores/preferences'

describe('preferences store', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it('uses the v1 defaults for animations and Tidyfox', () => {
    const store = usePreferencesStore()

    expect(store.preferences).toEqual({
      enableAnimations: true,
      animationIntensity: 'subtle',
      deskPet: {
        enabled: true,
        autoHeroInteraction: true,
      },
    })
  })

  it('normalizes old or malformed stored data', () => {
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
      animationIntensity: 'subtle',
      deskPet: {
        enabled: false,
        autoHeroInteraction: true,
      },
    })
  })

  it('persists an explicit desk pet shutdown as the highest-priority preference', async () => {
    const store = usePreferencesStore()

    store.setDeskPetEnabled(false)
    await Promise.resolve()

    expect(JSON.parse(window.localStorage.getItem('hmr.preferences.v1') ?? '{}')).toMatchObject({
      deskPet: {
        enabled: false,
      },
    })
  })
})
