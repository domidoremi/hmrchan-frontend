import { describe, expect, it, vi } from 'vitest'
import type { Page } from 'puppeteer'
import {
  createLoginShellSelectorWaiter,
  waitForLoginShellSelector,
  waitForRoutePath,
} from '../../../scripts/lib/browser-route-assertions.js'

function createPage(overrides: Partial<Page> = {}): Page {
  return {
    evaluate: vi.fn().mockResolvedValue('/login'),
    title: vi.fn().mockResolvedValue('Login'),
    url: vi.fn().mockReturnValue('http://127.0.0.1:5173/login'),
    waitForFunction: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as Page
}

describe('browser route assertions', () => {
  it('waits for the expected path with the configured timeout', async () => {
    const page = createPage()

    await waitForRoutePath(page, '/login', 'login route', 321)

    expect(page.waitForFunction).toHaveBeenCalledWith(
      expect.any(Function),
      { timeout: 321 },
      '/login'
    )
  })

  it('reports the observed route when the expected path never arrives', async () => {
    const page = createPage({
      evaluate: vi.fn().mockResolvedValue('/settings'),
      title: vi.fn().mockResolvedValue('Settings'),
      url: vi.fn().mockReturnValue('http://127.0.0.1:5173/settings'),
      waitForFunction: vi.fn().mockRejectedValue(new Error('timeout')),
    })

    await expect(waitForRoutePath(page, '/login', 'login route')).rejects.toThrow(
      'login route: expected browser path /login, got /settings (http://127.0.0.1:5173/settings, title: Settings)'
    )
  })

  it('distinguishes route drift from a login shell render failure', async () => {
    const page = createPage({
      evaluate: vi.fn().mockResolvedValue('/'),
      title: vi.fn().mockResolvedValue('Home'),
      url: vi.fn().mockReturnValue('http://127.0.0.1:5173/'),
      waitForSelector: vi.fn().mockRejectedValue(new Error('timeout')),
    })

    await expect(waitForLoginShellSelector(page, 'form.hmr-form', 'auth smoke')).rejects.toThrow(
      'auth smoke: login route left /login before auth shell rendered; current path /'
    )
  })

  it('supports caller-specific route-drift context without duplicating the assertion', async () => {
    const page = createPage({
      evaluate: vi.fn().mockResolvedValue('/'),
      waitForSelector: vi.fn().mockRejectedValue(new Error('timeout')),
    })
    const waitForHealthLoginShell = createLoginShellSelectorWaiter({
      routeDriftPrefix: 'auth guard/session state drift; ',
    })

    await expect(waitForHealthLoginShell(page, 'form.hmr-form', 'health check')).rejects.toThrow(
      'health check: auth guard/session state drift; login route left /login before auth shell rendered; current path /'
    )
  })

  it('preserves selector timeout evidence while the browser remains on the login route', async () => {
    const page = createPage({
      waitForSelector: vi.fn().mockRejectedValue(new Error('selector timeout')),
    })

    await expect(
      waitForLoginShellSelector(page, 'form.hmr-form', 'auth smoke', 123)
    ).rejects.toThrow(
      'auth smoke: LoginPage mount/runtime failure; selector form.hmr-form was not found on /login (title: Login) after 123ms. Original error: selector timeout'
    )
  })
})
