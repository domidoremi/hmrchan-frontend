import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from '../settings'

describe('Settings Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('applies backend preferences without overwriting local-only settings', () => {
    const store = useSettingsStore()

    store.setUiStyle('material')
    store.setBackgroundEffect({ type: 'stars', density: 0.8, speed: 1.2 })

    store.applyPreferences({
      show_hero_section: false,
      enable_animations: false,
      posts_per_page: 30,
    })

    expect(store.settings.showHeroSection).toBe(false)
    expect(store.settings.enableAnimations).toBe(false)
    expect(store.settings.postsPerPage).toBe(30)
    expect(store.settings.uiStyle).toBe('material')
    expect(store.settings.backgroundEffect.type).toBe('stars')
    expect(store.settings.backgroundEffect.density).toBe(0.8)
  })

  it('exports stable preferences payload for API sync', () => {
    const store = useSettingsStore()

    store.toggleSetting('showHeroSection')
    store.toggleSetting('enableAnimations')
    store.updateSetting('postsPerPage', 50)

    expect(store.exportPreferences()).toEqual({
      show_hero_section: false,
      enable_animations: false,
      posts_per_page: 50,
    })
  })
})
