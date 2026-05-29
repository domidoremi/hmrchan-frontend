import { computed, ref } from 'vue'
import type { Router } from 'vue-router'

import type { SupportedLocale } from '@/i18n'
import { applyLocale, supportedLocales } from '@/i18n'
import { createLoginRouteTarget, createRegisterRouteTarget } from '@/router/authTargets'
import type { useAuthStore } from '@/stores/auth'
import type { HmrTheme, useThemeStore } from '@/stores/theme'
import { clearPublicContentCache } from '@/utils/cache/publicContentCache'

type AuthStore = ReturnType<typeof useAuthStore>
type ThemeStore = ReturnType<typeof useThemeStore>
export type HmrSettingsCacheClearState = 'idle' | 'clearing' | 'done' | 'error'

export interface HmrSettingsWorkspaceOptions<T> {
  auth: Pick<AuthStore, 'isAuthenticated' | 'isLoading' | 'logout'>
  content: { value: T }
  markSettingsReady: (data: T) => void
  refreshSettingsResource: () => Promise<unknown>
  router: Pick<Router, 'push'>
  theme: Pick<ThemeStore, 'theme' | 'resolvedTheme' | 'setTheme' | 'initializeTheme'>
  resetDelayMs?: number
}

const localeLabels: Record<SupportedLocale, string> = {
  'zh-CN': '简体中文',
  'en-US': 'English',
  'ja-JP': '日本語',
}

export const hmrSettingsThemeOptions: Array<{ value: HmrTheme; label: string }> = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
]

export const hmrSettingsLocaleOptions = supportedLocales.map((id) => ({
  id,
  label: localeLabels[id],
}))

export function useHmrSettingsWorkspace<T>(options: HmrSettingsWorkspaceOptions<T>) {
  const cacheClearState = ref<HmrSettingsCacheClearState>('idle')
  const settingsLoginTarget = computed(() => createLoginRouteTarget('/settings'))
  const settingsRegisterTarget = computed(() => createRegisterRouteTarget('/settings'))
  const securityLoginTarget = computed(() => createLoginRouteTarget('/profile/security'))
  const inboxLoginTarget = computed(() => createLoginRouteTarget('/profile/inbox'))
  const themeLabel = computed(() => {
    if (options.theme.theme === 'system') {
      return `系统 / ${options.theme.resolvedTheme === 'dark' ? '深色' : '浅色'}`
    }
    return options.theme.theme === 'dark' ? '深色' : '浅色'
  })
  const cacheClearLabel = computed(() => {
    if (cacheClearState.value === 'clearing') return '清理中'
    if (cacheClearState.value === 'done') return '已清理'
    if (cacheClearState.value === 'error') return '重试'
    return '可清理'
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
      applyLocale(value)
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
