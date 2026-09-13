import { createApp, nextTick } from 'vue'
import { createPinia, defineStore } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { optionalLocalStorage } from '../optionalStorage'

describe('optional preference persistence', () => {
  afterEach(() => vi.restoreAllMocks())

  it('can import and clear fingerprint metadata when the storage getter throws', async () => {
    vi.resetModules()
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Storage denied', 'SecurityError')
    })
    const { clearFingerprintCache } = await import('../fingerprint')
    expect(() => clearFingerprintCache()).not.toThrow()
  })

  it('keeps a persisted store usable when the storage getter throws', async () => {
    const getter = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Storage denied', 'SecurityError')
    })
    const pinia = createPinia().use(createPersistedState({ storage: optionalLocalStorage }))
    createApp({}).use(pinia)
    const store = defineStore('optional-storage-test', {
      state: () => ({ preference: 'light' }),
      persist: true,
    })(pinia)
    expect(store.preference).toBe('light')
    store.preference = 'dark'
    await nextTick()
    expect(store.preference).toBe('dark')
    expect(getter).toHaveBeenCalled()
    store.$dispose()
  })

  it('continues to read and persist preferences when storage works', () => {
    const storage = { getItem: vi.fn(() => 'saved'), setItem: vi.fn() }
    vi.spyOn(window, 'localStorage', 'get').mockReturnValue(storage as unknown as Storage)
    expect(optionalLocalStorage.getItem('theme')).toBe('saved')
    optionalLocalStorage.setItem('theme', 'dark')
    expect(storage.setItem).toHaveBeenCalledWith('theme', 'dark')
  })
})
