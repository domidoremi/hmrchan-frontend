import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from '../settings'

describe('Settings Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('applies backend preferences without overwriting local-only settings', () => {
    const store = useSettingsStore()

    store.setAppearancePreset('material-calm')
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
    expect(store.settings.appearancePreset).toBe('material-calm')
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
    store.setPerformanceCookiesEnabled(true)

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

  it('keeps analytics and performance toggles independent under granted cookie consent', () => {
    const store = useSettingsStore()

    store.setAnalyticsEnabled(true)

    expect(store.settings.cookieConsent).toBe(true)
    expect(store.settings.analyticsEnabled).toBe(true)
    expect(store.settings.performanceCookiesEnabled).toBe(false)

    store.setPerformanceCookiesEnabled(true)
    store.setAnalyticsEnabled(false)

    expect(store.settings.cookieConsent).toBe(true)
    expect(store.settings.analyticsEnabled).toBe(false)
    expect(store.settings.performanceCookiesEnabled).toBe(true)
  })

  it('clears non-essential telemetry toggles when cookie consent is revoked', () => {
    const store = useSettingsStore()

    store.setCookieConsent(true)
    store.setAnalyticsEnabled(true)
    store.setPerformanceCookiesEnabled(true)
    store.setCookieConsent(false)

    expect(store.settings.cookieConsent).toBe(false)
    expect(store.settings.analyticsEnabled).toBe(false)
    expect(store.settings.performanceCookiesEnabled).toBe(false)
  })

  it('defaults non-essential decorations to disabled for new users', () => {
    const store = useSettingsStore()

    expect(store.settings.appearancePreset).toBe('minimal-editorial')
    expect(store.settings.densityMode).toBe('comfortable')
    expect(store.settings.contrastMode).toBe('normal')
    expect(store.settings.textureLevel).toBe('subtle')
    expect(store.settings.backgroundEffect.type).toBe('none')
    expect(store.settings.mascotBackground.enabled).toBe(false)
    expect(store.settings.deskPet.enabled).toBe(false)
    expect('uiStyle' in store.settings).toBe(false)
  })

  it('keeps appearance preset as the only runtime appearance state', () => {
    const store = useSettingsStore()

    store.setAppearancePreset('material-calm')
    expect(store.settings.appearancePreset).toBe('material-calm')

    store.setAppearancePreset('gradient-narrative')
    expect(store.settings.appearancePreset).toBe('gradient-narrative')
    expect('uiStyle' in store.settings).toBe(false)
  })

  it('migrates legacy material uiStyle snapshots to material-calm on hydration', async () => {
    const store = useSettingsStore()
    const legacySnapshot = store.settings as typeof store.settings & {
      uiStyle?: 'ios' | 'material'
      appearancePreset?: string
    }

    legacySnapshot.uiStyle = 'material'
    legacySnapshot.appearancePreset = undefined
    await nextTick()

    expect(store.settings.appearancePreset).toBe('material-calm')
    expect('uiStyle' in store.settings).toBe(false)
  })

  it('migrates legacy ios uiStyle snapshots to the default rounded preset on hydration', async () => {
    const store = useSettingsStore()
    const legacySnapshot = store.settings as typeof store.settings & {
      uiStyle?: 'ios' | 'material'
      appearancePreset?: string
    }

    legacySnapshot.uiStyle = 'ios'
    legacySnapshot.appearancePreset = undefined
    await nextTick()

    expect(store.settings.appearancePreset).toBe('minimal-editorial')
    expect('uiStyle' in store.settings).toBe(false)
  })
})
