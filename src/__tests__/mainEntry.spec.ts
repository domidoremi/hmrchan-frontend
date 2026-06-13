import { afterEach, describe, expect, it, vi } from 'vitest'

const mainModule = vi.hoisted(() => ({
  load: vi.fn(),
}))

async function importMainEntry(): Promise<void> {
  vi.resetModules()
  vi.doMock('../main', () => {
    mainModule.load()
    return {}
  })
  await import('../main.entry')
}

describe('main entry client init gate', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.doUnmock('../main')
    mainModule.load.mockReset()
    document.documentElement.removeAttribute('data-client-init')
  })

  it('loads the application bootstrap when client init is enabled', async () => {
    vi.stubEnv('VITE_ENABLE_CLIENT_INIT', 'true')

    await importMainEntry()

    expect(mainModule.load).toHaveBeenCalledOnce()
    expect(document.documentElement.dataset.clientInit).toBeUndefined()
  })

  it('marks client init disabled while still loading the application bootstrap', async () => {
    vi.stubEnv('VITE_ENABLE_CLIENT_INIT', 'false')

    await importMainEntry()

    expect(mainModule.load).toHaveBeenCalledOnce()
    expect(document.documentElement.dataset.clientInit).toBe('disabled')
  })
})
