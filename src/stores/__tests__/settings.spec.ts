import { beforeEach, describe, expect, it } from 'vitest'
import { createApp, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { useSettingsStore } from '../settings'

describe('Settings Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('defaults to idle automatic application updates', () => {
    const store = useSettingsStore()

    expect(store.settings.appUpdateStrategy).toBe('public-idle-refresh')
  })

  it('applies backend preferences without overwriting local-only settings', () => {
    const store = useSettingsStore()

    store.setAppearancePreset('material-calm')
    store.setAppUpdateStrategy('aggressive-idle-refresh')

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
    expect(store.settings.appUpdateStrategy).toBe('aggressive-idle-refresh')
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

  it('keeps retired appearance fields out of new settings', () => {
    const store = useSettingsStore()

    expect(store.settings.appearancePreset).toBe('minimal-editorial')
    expect('densityMode' in store.settings).toBe(false)
    expect('contrastMode' in store.settings).toBe(false)
    expect('textureLevel' in store.settings).toBe(false)
    expect('backgroundEffect' in store.settings).toBe(false)
    expect('mascotBackground' in store.settings).toBe(false)
    expect('deskPet' in store.settings).toBe(false)
    expect(store.settings.appUpdateStrategy).toBe('public-idle-refresh')
    expect('uiStyle' in store.settings).toBe(false)
  })

  it('removes retired visual runtime fields from hydrated settings', async () => {
    const store = useSettingsStore()
    const legacySnapshot = store.settings as typeof store.settings & {
      backgroundEffect?: unknown
      mascotBackground?: unknown
      deskPet?: unknown
    }

    legacySnapshot.backgroundEffect = { type: 'stars' }
    legacySnapshot.mascotBackground = { enabled: true }
    legacySnapshot.deskPet = { enabled: true }
    localStorage.setItem('desk-pet:last-position', '{"x":10,"y":20}')

    await nextTick()

    expect('backgroundEffect' in store.settings).toBe(false)
    expect('mascotBackground' in store.settings).toBe(false)
    expect('deskPet' in store.settings).toBe(false)
    expect(localStorage.getItem('desk-pet:last-position')).toBeNull()
  })

  it('removes retired visual runtime fields from persisted snapshots', async () => {
    localStorage.setItem(
      'settings',
      JSON.stringify({
        settings: {
          ...useSettingsStore().settings,
          backgroundEffect: { type: 'stars' },
          mascotBackground: { enabled: true },
          deskPet: { enabled: true },
        },
      })
    )
    localStorage.setItem('desk-pet:last-position', '{"x":10,"y":20}')

    const pinia = createPinia()
    pinia.use(piniaPluginPersistedstate)
    createApp({}).use(pinia)
    setActivePinia(pinia)

    const store = useSettingsStore()
    await nextTick()
    await nextTick()

    expect('backgroundEffect' in store.settings).toBe(false)
    expect('mascotBackground' in store.settings).toBe(false)
    expect('deskPet' in store.settings).toBe(false)
    expect(localStorage.getItem('desk-pet:last-position')).toBeNull()

    const persistedState = JSON.parse(localStorage.getItem('settings') ?? '{}') as {
      settings?: Record<string, unknown>
    }
    expect(persistedState.settings).not.toHaveProperty('backgroundEffect')
    expect(persistedState.settings).not.toHaveProperty('mascotBackground')
    expect(persistedState.settings).not.toHaveProperty('deskPet')
  })

  it('stores app update strategy locally without exporting it to backend preferences', () => {
    const store = useSettingsStore()

    store.setAppUpdateStrategy('prompt-only')

    expect(store.settings.appUpdateStrategy).toBe('prompt-only')
    expect(store.exportPreferences()).not.toHaveProperty('app_update_strategy')
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

  it('ignores legacy density, contrast, and texture snapshots during hydration', async () => {
    const store = useSettingsStore()
    const legacySnapshot = store.settings as typeof store.settings & {
      densityMode?: string
      contrastMode?: string
      textureLevel?: string
    }

    legacySnapshot.densityMode = 'compact'
    legacySnapshot.contrastMode = 'high'
    legacySnapshot.textureLevel = 'rich'
    await nextTick()

    expect('densityMode' in store.settings).toBe(false)
    expect('contrastMode' in store.settings).toBe(false)
    expect('textureLevel' in store.settings).toBe(false)
  })
})
