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
      cookie_consent: true,
      analytics_enabled: true,
      performance_cookies_enabled: true,
    })

    expect(store.settings.showHeroSection).toBe(false)
    expect(store.settings.enableAnimations).toBe(false)
    expect(store.settings.postsPerPage).toBe(30)
    expect(store.settings.cookieConsent).toBe(true)
    expect(store.settings.analyticsEnabled).toBe(true)
    expect(store.settings.performanceCookiesEnabled).toBe(true)
    expect(store.settings.uiStyle).toBe('material')
    expect(store.settings.backgroundEffect.type).toBe('stars')
    expect(store.settings.backgroundEffect.density).toBe(0.8)
  })

  it('exports stable preferences payload for API sync', () => {
    const store = useSettingsStore()

    store.toggleSetting('showHeroSection')
    store.toggleSetting('enableAnimations')
    store.updateSetting('postsPerPage', 50)
    store.setCookieConsent(true)
    store.setAnalyticsEnabled(true)

    expect(store.exportPreferences()).toEqual({
      show_hero_section: false,
      enable_animations: false,
      posts_per_page: 50,
      cookie_consent: true,
      analytics_enabled: true,
      functional_cookies_enabled: true,
      performance_cookies_enabled: true,
      data_collection: false,
      personalized_content: false,
    })
  })

  it('defaults non-essential decorations to disabled for new users', () => {
    const store = useSettingsStore()

    expect(store.settings.backgroundEffect.type).toBe('none')
    expect(store.settings.mascotBackground.enabled).toBe(false)
    expect(store.settings.deskPet.enabled).toBe(false)
  })
})
