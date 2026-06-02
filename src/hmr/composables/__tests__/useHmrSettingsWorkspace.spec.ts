import { nextTick, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  hmrSettingsLocaleOptions,
  hmrSettingsThemeOptions,
  useHmrSettingsWorkspace,
} from '@/hmr/composables/useHmrSettingsWorkspace'
import { localeLabels, supportedLocales } from '@/i18n/locales'

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
  const theme = {
    theme: options.theme ?? 'system',
    resolvedTheme: options.resolvedTheme ?? 'light',
    setTheme: vi.fn(),
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
    resetDelayMs: 1,
  })

  return {
    auth,
    content,
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
    expect(workspace.themeLabel.value).toBe('系统 / 深色')
    expect(workspace.cacheClearLabel.value).toBe('可清理')
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
    expect(workspace.cacheClearLabel.value).toBe('已清理')

    vi.runOnlyPendingTimers()
    await nextTick()
    expect(workspace.cacheClearState.value).toBe('idle')
    vi.useRealTimers()
  })

  it('clears only public content cache without changing account storage or auth state', async () => {
    mocks.clearPublicContentCache.mockResolvedValue(undefined)
    window.localStorage.setItem('hmr.preview.auth', 'member')
    window.localStorage.setItem('momi_client_security', '{"token":"client"}')
    window.localStorage.setItem('momi_device_fingerprint_v1', '{"value":"fingerprint"}')
    window.sessionStorage.setItem('momichan.preloader.seen', 'true')
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
    expect(window.sessionStorage.getItem('momichan.preloader.seen')).toBe('true')
  })
})
