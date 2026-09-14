import { afterEach, describe, expect, it, vi } from 'vitest'

describe('locale storage resilience', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('can initialize when storage reads are denied', async () => {
    vi.resetModules()
    const getItem = vi.fn(() => {
      throw new DOMException('Storage denied', 'SecurityError')
    })
    vi.stubGlobal('localStorage', { getItem })
    await expect(import('../index')).resolves.toHaveProperty('default')
    expect(getItem).toHaveBeenCalledWith('locale')
  })

  it('applies a locale even when persistence fails', async () => {
    const { setLocale } = await import('../index')
    const setItem = vi.fn(() => {
      throw new DOMException('Storage full', 'QuotaExceededError')
    })
    vi.stubGlobal('localStorage', { setItem })
    document.documentElement.lang = 'ja'
    await expect(setLocale('en')).resolves.toBeUndefined()
    expect(document.documentElement.lang).toBe('en')
    expect(setItem).toHaveBeenCalledWith('locale', 'en')
  })
})
