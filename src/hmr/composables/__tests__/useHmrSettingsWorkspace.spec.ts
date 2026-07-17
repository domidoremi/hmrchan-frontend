import { nextTick, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  hmrSettingsAppearanceOptions,
  hmrSettingsLocaleOptions,
  hmrSettingsThemeOptions,
  useHmrSettingsWorkspace,
} from '@/hmr/composables/useHmrSettingsWorkspace'
import { localeLabels, supportedLocales } from '@/i18n/locales'
import { hmrAppearancePresetMeta, hmrAppearancePresets } from '@/stores/theme'

const mocks = vi.hoisted(() => ({
  applyLocale: vi.fn(),
  clearPublicContentCache: vi.fn(),
}))

vi.mock('@/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/i18n')>()
  return {
    ...actual,
    applyLocale: mocks.applyLocale,
  }
})

vi.mock('@/utils/cache/publicContentCache', () => ({
  clearPublicContentCache: mocks.clearPublicContentCache,
}))

interface SettingsFixtureOptions {
  authenticated?: boolean
  theme?: 'light' | 'dark' | 'system'
  resolvedTheme?: 'light' | 'dark'
}

function makeWorkspace(options: SettingsFixtureOptions = {}) {
  const content = ref({ loaded: false })
  const auth = {
    isAuthenticated: options.authenticated ?? false,
    isLoading: false,
    logout: vi.fn(async () => undefined),
  }
  const router = {
    push: vi.fn(async () => undefined),
  }
  const locale = ref('zh-CN')
  const theme = {
    theme: options.theme ?? 'system',
    appearancePreset: 'minimal-editorial' as const,
    appearancePresetMeta: hmrAppearancePresetMeta['minimal-editorial'],
    resolvedTheme: options.resolvedTheme ?? 'light',
    setTheme: vi.fn(),
    setAppearancePreset: vi.fn(),
    initializeTheme: vi.fn(),
  }
  const markSettingsReady = vi.fn()
  const refreshSettingsResource = vi.fn(async () => undefined)
  const workspace = useHmrSettingsWorkspace({
    auth,
    content,
    markSettingsReady,
    refreshSettingsResource,
    router,
    theme,
    locale,
    t: (key: string) =>
      (
        ({
          'settings.themeModes.light': '浅色',
          'settings.themeModes.dark': '深色',
          'settings.themeModes.system': '跟随系统',
          'settings.cacheReady': '可清理',
          'settings.cacheClearing': '清理中',
          'settings.cacheDone': '已清理',
          'settings.cacheRetry': '重试',
          'settings.clearPublicCache': '清理公开缓存',
          'settings.cacheClearingAction': '正在清理公开缓存…',
          'settings.clearPublicCacheAgain': '再次清理公开缓存',
          'settings.cacheRetryAction': '重新尝试清理',
          'settings.cacheClearingMessage': '正在移除此浏览器中的公开内容缓存…',
          'settings.cacheDoneMessage': '公开内容缓存已清理。下次请求将加载最新数据。',
          'settings.cacheErrorMessage': '缓存清理失败。账号数据未受影响，请重试。',
          'settings.presets.minimal-editorial': '极简编辑',
        }) as Record<string, string>
      )[key] ?? key,
    resetDelayMs: 1,
  })

  return {
    auth,
    content,
    locale,
    markSettingsReady,
    refreshSettingsResource,
    router,
    theme,
    workspace,
  }
}

describe('hmr settings workspace options', () => {
  it('exposes stable theme and locale option sets', () => {
    expect(hmrSettingsThemeOptions.map((item) => item.value)).toEqual(['light', 'dark', 'system'])
    expect(hmrSettingsThemeOptions.map((item) => item.labelKey)).toEqual([
      'settings.themeModes.light',
      'settings.themeModes.dark',
      'settings.themeModes.system',
    ])
    expect(hmrSettingsAppearanceOptions.map((item) => item.value)).toEqual(hmrAppearancePresets)
    expect(
      hmrSettingsAppearanceOptions.find((item) => item.value === 'clay-playful')
    ).toMatchObject({
      enhancer: 'clay',
      family: 'rounded',
      sceneRoles: expect.arrayContaining(['playful', 'immersive']),
    })
    expect(
      hmrSettingsAppearanceOptions.find((item) => item.value === 'sketch-doodle')
    ).toMatchObject({
      enhancer: 'sketch',
      family: 'sharp',
      sceneRoles: expect.arrayContaining(['discussion', 'editorial']),
    })
    expect(hmrSettingsLocaleOptions).toEqual(
      supportedLocales.map((id) => ({
        id,
        label: localeLabels[id],
      }))
    )
  })
})

describe('useHmrSettingsWorkspace', () => {
  beforeEach(() => {
    mocks.applyLocale.mockReset()
    mocks.applyLocale.mockImplementation((locale: string) => locale)
    mocks.clearPublicContentCache.mockReset()
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('builds auth targets and derives theme/cache labels', () => {
    const { workspace } = makeWorkspace({ theme: 'system', resolvedTheme: 'dark' })

    expect(workspace.settingsLoginTarget.value).toEqual({
      path: '/login',
      query: { redirect: '/settings' },
    })
    expect(workspace.settingsRegisterTarget.value).toEqual({
      path: '/register',
      query: { redirect: '/settings' },
    })
    expect(workspace.securityLoginTarget.value).toEqual({
      path: '/login',
      query: { redirect: '/profile/security' },
    })
    expect(workspace.inboxLoginTarget.value).toEqual({
      path: '/login',
      query: { redirect: '/profile/inbox' },
    })
    expect(workspace.themeLabel.value).toBe('跟随系统 / 深色')
    expect(workspace.appearanceLabel.value).toBe('极简编辑')
    expect(workspace.cacheClearActionLabel.value).toBe('清理公开缓存')
    expect(workspace.cacheClearLabel.value).toBe('可清理')
    expect(workspace.cacheClearMessage.value).toBe('')
  })

  it('marks guest settings ready without fetching private settings', async () => {
    const { content, markSettingsReady, refreshSettingsResource, workspace } = makeWorkspace()

    await workspace.refreshSettings()

    expect(markSettingsReady).toHaveBeenCalledExactlyOnceWith(content.value)
    expect(refreshSettingsResource).not.toHaveBeenCalled()
  })

  it('refreshes private settings for authenticated users', async () => {
    const { markSettingsReady, refreshSettingsResource, workspace } = makeWorkspace({
      authenticated: true,
    })

    await workspace.refreshSettings()

    expect(markSettingsReady).not.toHaveBeenCalled()
    expect(refreshSettingsResource).toHaveBeenCalledOnce()
  })

  it('logs out authenticated users before routing to login', async () => {
    const { auth, router, workspace } = makeWorkspace({ authenticated: true })

    await workspace.logout()

    expect(auth.logout).toHaveBeenCalledOnce()
    expect(router.push).toHaveBeenCalledExactlyOnceWith('/login')
  })

  it('routes guests to login without calling logout', async () => {
    const { auth, router, workspace } = makeWorkspace()

    await workspace.logout()

    expect(auth.logout).not.toHaveBeenCalled()
    expect(router.push).toHaveBeenCalledExactlyOnceWith('/login')
  })

  it('updates locale and public cache state through workspace actions', async () => {
    vi.useFakeTimers()
    mocks.clearPublicContentCache.mockResolvedValue(undefined)
    const { workspace } = makeWorkspace()

    workspace.handleLocaleChange({ target: { value: 'en-US' } } as unknown as Event)
    expect(mocks.applyLocale).toHaveBeenCalledExactlyOnceWith('en-US')

    await workspace.clearCache()
    expect(mocks.clearPublicContentCache).toHaveBeenCalledOnce()
    expect(workspace.cacheClearState.value).toBe('done')
    expect(workspace.cacheClearActionLabel.value).toBe('再次清理公开缓存')
    expect(workspace.cacheClearLabel.value).toBe('已清理')
    expect(workspace.cacheClearMessage.value).toBe('公开内容缓存已清理。下次请求将加载最新数据。')

    vi.runOnlyPendingTimers()
    await nextTick()
    expect(workspace.cacheClearState.value).toBe('idle')
    vi.useRealTimers()
  })

  it('exposes clearing feedback immediately and ignores duplicate requests', async () => {
    let finishClear: (() => void) | undefined
    mocks.clearPublicContentCache.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishClear = resolve
        })
    )
    const { workspace } = makeWorkspace()

    const pendingClear = workspace.clearCache()
    void workspace.clearCache()

    expect(mocks.clearPublicContentCache).toHaveBeenCalledOnce()
    expect(workspace.cacheClearState.value).toBe('clearing')
    expect(workspace.cacheClearActionLabel.value).toBe('正在清理公开缓存…')
    expect(workspace.cacheClearMessage.value).toBe('正在移除此浏览器中的公开内容缓存…')

    finishClear?.()
    await pendingClear
  })

  it('exposes persistent retry feedback when public cache clearing fails', async () => {
    mocks.clearPublicContentCache.mockRejectedValueOnce(new Error('cache unavailable'))
    const { workspace } = makeWorkspace()

    await workspace.clearCache()

    expect(workspace.cacheClearState.value).toBe('error')
    expect(workspace.cacheClearLabel.value).toBe('重试')
    expect(workspace.cacheClearActionLabel.value).toBe('重新尝试清理')
    expect(workspace.cacheClearMessage.value).toBe('缓存清理失败。账号数据未受影响，请重试。')
  })

  it('writes resolved locale back to the active composer locale ref', () => {
    mocks.applyLocale.mockReturnValue('en-US')
    const { locale, workspace } = makeWorkspace()

    workspace.handleLocaleChange({ target: { value: 'en-US' } } as unknown as Event)

    expect(locale.value).toBe('en-US')
  })

  it('clears only public content cache without changing account storage or auth state', async () => {
    mocks.clearPublicContentCache.mockResolvedValue(undefined)
    window.localStorage.setItem('hmr.preview.auth', 'member')
    window.localStorage.setItem('momi_client_security', '{"token":"client"}')
    window.localStorage.setItem('momi_device_fingerprint_v1', '{"value":"fingerprint"}')
    const { auth, router, workspace } = makeWorkspace({ authenticated: true })

    await workspace.clearCache()

    expect(mocks.clearPublicContentCache).toHaveBeenCalledOnce()
    expect(auth.logout).not.toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()
    expect(window.localStorage.getItem('hmr.preview.auth')).toBe('member')
    expect(window.localStorage.getItem('momi_client_security')).toBe('{"token":"client"}')
    expect(window.localStorage.getItem('momi_device_fingerprint_v1')).toBe(
      '{"value":"fingerprint"}'
    )
  })
})
