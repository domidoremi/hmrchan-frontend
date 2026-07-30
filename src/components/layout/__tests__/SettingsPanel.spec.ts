import { flushPromises, mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { reactive, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('pinia', async () => {
  const actual = await vi.importActual<typeof import('pinia')>('pinia')
  const vue = await vi.importActual<typeof import('vue')>('vue')

  return {
    ...actual,
    storeToRefs: (store: Record<string, unknown>) => {
      const refs: Record<string, unknown> = {}
      for (const key of Object.keys(store)) {
        if (typeof store[key] === 'function') continue
        refs[key] = vue.toRef(store, key)
      }
      return refs
    },
  }
})

const panelMocks = vi.hoisted(() => ({
  setLocale: vi.fn(),
  applyAppearancePreset: vi.fn(),
  resetPreferences: vi.fn(),
  replacePreferences: vi.fn(),
  resetVideoSettings: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

const authStoreState = reactive({
  isAuthenticated: true,
})

const themeStoreState = reactive({
  theme: 'auto',
  resolvedTheme: 'dark',
  setTheme: vi.fn(),
})

const settingsStoreState = reactive({
  settings: reactive({
    appearancePreset: 'minimal-editorial',
    showHeroSection: true,
    enableAnimations: true,
    enableSwipeNavigation: true,
    animationIntensity: 'normal',
    postsPerPage: 20,
    cookieConsent: false,
    analyticsEnabled: false,
    performanceCookiesEnabled: false,
    appUpdateStrategy: 'prompt-only',
  }),
  toggleSetting: vi.fn(),
  setAppearancePreset: vi.fn(),
  setAppUpdateStrategy: vi.fn(),
  updateSetting: vi.fn(),
  setCookieConsent: vi.fn(),
  setAnalyticsEnabled: vi.fn(),
  setPerformanceCookiesEnabled: vi.fn(),
  setAnimationIntensity: vi.fn(),
})

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: ref('en'),
    t: (key: string) => key,
  }),
}))

vi.mock('@/stores', () => ({
  useAuthStore: () => authStoreState,
  useThemeStore: () => themeStoreState,
  useSettingsStore: () => settingsStoreState,
  useToastStore: () => ({
    success: panelMocks.toastSuccess,
    error: panelMocks.toastError,
  }),
}))

vi.mock('@/i18n', () => ({
  setLocale: panelMocks.setLocale,
}))

vi.mock('@/config/appearance', () => ({
  getAppearancePresetSpecs: () => [
    {
      preset: 'minimal-editorial',
      gallerySummary: 'Editorial quiet.',
      surfaceStyle: 'Paper panels.',
    },
    {
      preset: 'material-calm',
      gallerySummary: 'Structured tonal surfaces.',
      surfaceStyle: 'Tonal containers.',
    },
  ],
}))

vi.mock('@/composables/usePreferencesSync', () => ({
  usePreferencesSync: () => ({
    isSavingPreferences: ref(false),
    resetPreferences: panelMocks.resetPreferences,
    replacePreferences: panelMocks.replacePreferences,
  }),
}))

vi.mock('@/composables/useVideoSettings', () => ({
  useVideoSettings: () => ({
    resetSettings: panelMocks.resetVideoSettings,
  }),
}))

vi.mock('@/services/appearanceLoader', () => ({
  applyAppearancePreset: panelMocks.applyAppearancePreset,
}))

import SettingsPanel from '../SettingsPanel.vue'

const settingsPanelSource = readFileSync(
  resolve(process.cwd(), 'src/components/layout/SettingsPanel.vue'),
  'utf8'
)
const settingsPanelStyles = readFileSync(
  resolve(process.cwd(), 'src/styles/components/settings-panel.css'),
  'utf8'
)
const letterbookStyles = readFileSync(
  resolve(process.cwd(), 'src/styles/stage-letterbook.css'),
  'utf8'
)

function createWrapper(props: Record<string, unknown> = {}) {
  return mount(SettingsPanel, {
    props,
    global: {
      mocks: {
        $t: (key: string) => key,
      },
      stubs: {
        transition: false,
        RouterLink: {
          props: ['to'],
          template: "<a :href=\"typeof to === 'string' ? to : '#'\"><slot /></a>",
        },
        AnimatedIcon: {
          template: '<span data-stub="animated-icon" />',
        },
        ControlButton: {
          props: ['ariaLabel'],
          emits: ['click'],
          template: `
            <button type="button" :aria-label="ariaLabel" @click="$emit('click', $event)">
              <slot name="start" />
              <slot />
              <slot name="end" />
            </button>
          `,
        },
        ThemeModeSwitch: {
          props: ['modelValue', 'resolvedTheme', 'label', 'lightLabel', 'darkLabel', 'autoLabel'],
          emits: ['update:modelValue'],
          template: `
            <div data-stub="theme-mode-switch">
              <button type="button" @click="$emit('update:modelValue', 'light')">{{ lightLabel }}</button>
              <button type="button" @click="$emit('update:modelValue', 'dark')">{{ darkLabel }}</button>
              <button type="button" @click="$emit('update:modelValue', 'auto')">{{ autoLabel }}</button>
            </div>
          `,
        },
      },
    },
  })
}

function findButtonByText(wrapper: ReturnType<typeof createWrapper>, text: string) {
  const button = wrapper
    .findAll('button')
    .find(
      (candidate) => candidate.text().includes(text) || candidate.attributes('aria-label') === text
    )

  expect(button, `Expected button containing "${text}"`).toBeTruthy()
  return button!
}

describe('SettingsPanel', () => {
  beforeEach(() => {
    panelMocks.setLocale.mockReset()
    panelMocks.setLocale.mockResolvedValue(undefined)
    panelMocks.applyAppearancePreset.mockReset()
    panelMocks.applyAppearancePreset.mockResolvedValue(true)
    panelMocks.resetPreferences.mockReset()
    panelMocks.resetPreferences.mockResolvedValue(undefined)
    panelMocks.replacePreferences.mockReset()
    panelMocks.replacePreferences.mockResolvedValue(undefined)
    panelMocks.resetVideoSettings.mockReset()
    panelMocks.toastSuccess.mockReset()
    panelMocks.toastError.mockReset()
    themeStoreState.setTheme.mockReset()

    for (const method of [
      'toggleSetting',
      'setAppearancePreset',
      'setAppUpdateStrategy',
      'updateSetting',
      'setCookieConsent',
      'setAnalyticsEnabled',
      'setPerformanceCookiesEnabled',
      'setAnimationIntensity',
    ] as const) {
      settingsStoreState[method].mockReset()
    }

    authStoreState.isAuthenticated = true
    themeStoreState.theme = 'auto'
    themeStoreState.resolvedTheme = 'dark'

    Object.assign(settingsStoreState.settings, {
      appearancePreset: 'minimal-editorial',
      showHeroSection: true,
      enableAnimations: true,
      enableSwipeNavigation: true,
      animationIntensity: 'normal',
      postsPerPage: 20,
      cookieConsent: false,
      analyticsEnabled: false,
      performanceCookiesEnabled: false,
      appUpdateStrategy: 'prompt-only',
    })
  })

  it('keeps settings panel presentation in an external scoped stylesheet', () => {
    expect(settingsPanelSource).toContain(
      '<style scoped src="../../styles/components/settings-panel.css"></style>'
    )
    expect(settingsPanelSource).not.toContain('<style scoped>\n')
    expect(settingsPanelStyles).toContain('.settings-panel {')
    expect(settingsPanelStyles).toContain('.settings-category-switcher {')
    expect(settingsPanelStyles).toContain('.toggle-btn {')
    expect(settingsPanelStyles).toContain('.reduced-motion-notice {')
    expect(settingsPanelStyles).toContain('@media (max-width: 28rem)')
    expect(settingsPanelSource).toContain('<ThemeModeSwitch')
  })

  it('renders app update strategies as a compact segmented control', () => {
    expect(settingsPanelSource).toContain('class="update-strategy-options"')
    expect(settingsPanelSource).toContain('role="radiogroup"')
    expect(settingsPanelSource).not.toContain('theme-btn-check')
    expect(settingsPanelStyles).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))')
    expect(settingsPanelStyles).toContain('min-block-size: 3.25rem')
    expect(settingsPanelStyles).toContain('.update-strategy-description {')
    expect(letterbookStyles).toContain(
      '#app .settings-panel .update-strategy-option--active:focus-visible'
    )
  })

  it('exposes all update strategies and selects idle automatic updates', async () => {
    const wrapper = createWrapper({
      embedded: true,
      allowedCategories: ['system'],
    })

    const strategies = wrapper.findAll('[role="radio"]')
    expect(strategies).toHaveLength(3)
    expect(strategies[0]?.attributes('aria-checked')).toBe('true')
    expect(wrapper.get('.update-strategy-description').text()).toBe(
      'settings.appUpdatePromptOnlyDesc'
    )

    await findButtonByText(wrapper, 'settings.appUpdatePublicIdle').trigger('click')

    expect(settingsStoreState.setAppUpdateStrategy).toHaveBeenCalledWith('public-idle-refresh')
  })

  it('supports external scroll shell and category switching', async () => {
    const wrapper = createWrapper({
      externalScroll: true,
      allowedCategories: ['appearance', 'system'],
    })

    expect(wrapper.classes()).toContain('settings-panel--external-scroll')
    expect(wrapper.findAll('.settings-category-switcher__item')).toHaveLength(2)
    expect(wrapper.get('.settings-panel__body').attributes('id')).toBe(
      'settings-category-panel-appearance'
    )

    await findButtonByText(wrapper, 'settings.categorySystem').trigger('click')

    expect(wrapper.get('.settings-panel__body').attributes('id')).toBe(
      'settings-category-panel-system'
    )
    expect(findButtonByText(wrapper, 'settings.categorySystem').classes()).toContain(
      'settings-category-switcher__item--active'
    )
  })

  it('emits close and wires user actions to stores and sync helpers', async () => {
    const wrapper = createWrapper({
      embedded: true,
      allowedCategories: ['appearance', 'experience', 'privacy', 'system'],
    })

    await findButtonByText(wrapper, 'common.close').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)

    await findButtonByText(wrapper, 'settings.dark').trigger('click')
    expect(themeStoreState.setTheme).toHaveBeenCalledWith('dark')

    await findButtonByText(wrapper, '日本語').trigger('click')
    expect(panelMocks.setLocale).toHaveBeenCalledWith('ja')

    await findButtonByText(wrapper, 'settings.toggleHeroSection').trigger('click')
    await findButtonByText(wrapper, 'settings.toggleAnimations').trigger('click')
    await findButtonByText(wrapper, 'settings.toggleSwipeNavigation').trigger('click')
    expect(settingsStoreState.toggleSetting).toHaveBeenNthCalledWith(1, 'showHeroSection')
    expect(settingsStoreState.toggleSetting).toHaveBeenNthCalledWith(2, 'enableAnimations')
    expect(settingsStoreState.toggleSetting).toHaveBeenNthCalledWith(3, 'enableSwipeNavigation')

    await findButtonByText(wrapper, 'settings.cookieConsent').trigger('click')
    await findButtonByText(wrapper, 'settings.analyticsEnabled').trigger('click')
    await findButtonByText(wrapper, 'settings.performanceCookies').trigger('click')
    expect(settingsStoreState.setCookieConsent).toHaveBeenCalledWith(true)
    expect(settingsStoreState.setAnalyticsEnabled).toHaveBeenCalledWith(true)
    expect(settingsStoreState.setPerformanceCookiesEnabled).toHaveBeenCalledWith(true)

    await findButtonByText(wrapper, 'settings.replacePreferences').trigger('click')
    await findButtonByText(wrapper, 'settings.resetPreferences').trigger('click')
    await flushPromises()
    expect(panelMocks.replacePreferences).toHaveBeenCalledTimes(1)
    expect(panelMocks.resetPreferences).toHaveBeenCalledTimes(1)
    expect(panelMocks.toastSuccess).toHaveBeenCalledWith('settings.preferencesReplaced')
    expect(panelMocks.toastSuccess).toHaveBeenCalledWith('settings.preferencesReset')

    await findButtonByText(wrapper, 'settings.resetVideoSettings').trigger('click')
    expect(panelMocks.resetVideoSettings).toHaveBeenCalledTimes(1)
    expect(panelMocks.toastSuccess).toHaveBeenCalledWith('settings.videoSettingsReset')
  })

  it('applies appearance preset and reports runtime failure', async () => {
    const wrapper = createWrapper({
      embedded: true,
      allowedCategories: ['appearance'],
    })

    await findButtonByText(wrapper, 'settings.presets.material-calm').trigger('click')
    await flushPromises()

    expect(panelMocks.applyAppearancePreset).toHaveBeenCalledWith('material-calm', 'dark')
    expect(settingsStoreState.setAppearancePreset).toHaveBeenCalledWith('material-calm')

    panelMocks.applyAppearancePreset.mockResolvedValueOnce(false)
    await findButtonByText(wrapper, 'settings.presets.material-calm').trigger('click')
    await flushPromises()

    expect(panelMocks.toastError).toHaveBeenCalledWith('settings.appearanceRuntimeFailed')
  })

  it('removes deprecated style and visual runtime controls', () => {
    const wrapper = createWrapper({
      embedded: true,
      allowedCategories: ['appearance', 'experience'],
    })

    expect(wrapper.text()).toContain('settings.appearanceLead')
    expect(wrapper.text()).not.toContain('settings.openStyleGallery')
    expect(wrapper.text()).not.toContain('settings.density')
    expect(wrapper.text()).not.toContain('settings.contrast')
    expect(wrapper.text()).not.toContain('settings.texture')
    expect(wrapper.text()).not.toContain('settings.backgroundEffect')
    expect(wrapper.text()).not.toContain('settings.mascotBackground')
    expect(wrapper.text()).not.toContain('settings.deskPet')
  })
})
