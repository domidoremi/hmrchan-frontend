import { computed, ref, type Ref } from 'vue'
import type { Router } from 'vue-router'

import type { SupportedLocale } from '@/i18n'
import { applyLocale, localeLabels, supportedLocales } from '@/i18n'
import { createLoginRouteTarget, createRegisterRouteTarget } from '@/router/authTargets'
import type { useAuthStore } from '@/stores/auth'
import {
  hmrAppearancePresetMeta,
  hmrAppearancePresets,
  type HmrTheme,
  type useThemeStore,
} from '@/stores/theme'
import { clearPublicContentCache } from '@/utils/cache/publicContentCache'

type AuthStore = ReturnType<typeof useAuthStore>
type ThemeStore = ReturnType<typeof useThemeStore>
export type HmrSettingsCacheClearState = 'idle' | 'clearing' | 'done' | 'error'

export interface HmrSettingsWorkspaceOptions<T> {
  auth: Pick<AuthStore, 'isAuthenticated' | 'isLoading' | 'logout'>
  content: { value: T }
  locale: Ref<string>
  markSettingsReady: (data: T) => void
  refreshSettingsResource: () => Promise<unknown>
  router: Pick<Router, 'push'>
  theme: Pick<
    ThemeStore,
    | 'theme'
    | 'appearancePreset'
    | 'appearancePresetMeta'
    | 'resolvedTheme'
    | 'setTheme'
    | 'setAppearancePreset'
    | 'initializeTheme'
  >
  t?: (key: string) => string
  resetDelayMs?: number
}

export const hmrSettingsThemeOptions: Array<{ value: HmrTheme; labelKey: string }> = [
  { value: 'light', labelKey: 'settings.themeModes.light' },
  { value: 'dark', labelKey: 'settings.themeModes.dark' },
  { value: 'system', labelKey: 'settings.themeModes.system' },
]

export const hmrSettingsAppearanceOptions = hmrAppearancePresets.map((value) => ({
  value,
  label: hmrAppearancePresetMeta[value].label,
  summary: hmrAppearancePresetMeta[value].summary,
  family: hmrAppearancePresetMeta[value].family,
  enhancer: hmrAppearancePresetMeta[value].enhancer,
  sceneRoles: hmrAppearancePresetMeta[value].sceneRoles,
}))

export const hmrSettingsLocaleOptions = supportedLocales.map((id) => ({
  id,
  label: localeLabels[id],
}))

export function useHmrSettingsWorkspace<T>(options: HmrSettingsWorkspaceOptions<T>) {
  const translate = options.t ?? ((key: string) => key)
  const cacheClearState = ref<HmrSettingsCacheClearState>('idle')
  const settingsLoginTarget = computed(() => createLoginRouteTarget('/settings'))
  const settingsRegisterTarget = computed(() => createRegisterRouteTarget('/settings'))
  const securityLoginTarget = computed(() => createLoginRouteTarget('/profile/security'))
  const inboxLoginTarget = computed(() => createLoginRouteTarget('/profile/inbox'))
  const themeLabel = computed(() => {
    const lightLabel = translate('settings.themeModes.light')
    const darkLabel = translate('settings.themeModes.dark')
    if (options.theme.theme === 'system') {
      return `${translate('settings.themeModes.system')} / ${
        options.theme.resolvedTheme === 'dark' ? darkLabel : lightLabel
      }`
    }
    return options.theme.theme === 'dark' ? darkLabel : lightLabel
  })
  const appearanceLabel = computed(() => {
    return translate(`settings.presets.${options.theme.appearancePreset}`)
  })
  const cacheClearLabel = computed(() => {
    if (cacheClearState.value === 'clearing') return translate('settings.cacheClearing')
    if (cacheClearState.value === 'done') return translate('settings.cacheDone')
    if (cacheClearState.value === 'error') return translate('settings.cacheRetry')
    return translate('settings.cacheReady')
  })

  async function logout(): Promise<void> {
    if (options.auth.isAuthenticated) {
      await options.auth.logout()
    }

    await options.router.push('/login')
  }

  async function refreshSettings(): Promise<void> {
    if (!options.auth.isAuthenticated) {
      options.markSettingsReady(options.content.value)
      return
    }

    await options.refreshSettingsResource()
  }

  function handleLocaleChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as SupportedLocale
    if (supportedLocales.includes(value)) {
      options.locale.value = applyLocale(value)
    }
  }

  async function clearCache(): Promise<void> {
    cacheClearState.value = 'clearing'
    try {
      await clearPublicContentCache()
      cacheClearState.value = 'done'
      window.setTimeout(() => {
        if (cacheClearState.value === 'done') cacheClearState.value = 'idle'
      }, options.resetDelayMs ?? 1600)
    } catch {
      cacheClearState.value = 'error'
    }
  }

  function initializeSettingsWorkspace(): void {
    options.theme.initializeTheme()
    void refreshSettings()
  }

  return {
    appearanceLabel,
    appearanceOptions: hmrSettingsAppearanceOptions,
    cacheClearLabel,
    cacheClearState,
    clearCache,
    handleLocaleChange,
    inboxLoginTarget,
    initializeSettingsWorkspace,
    localeOptions: hmrSettingsLocaleOptions,
    logout,
    refreshSettings,
    securityLoginTarget,
    settingsLoginTarget,
    settingsRegisterTarget,
    themeLabel,
    themeOptions: hmrSettingsThemeOptions,
  }
}
