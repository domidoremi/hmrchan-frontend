import { expect, it, vi } from 'vitest'

const workerMocks = vi.hoisted(() => ({
  listeners: new Map<string, (event: unknown) => void>(),
  precacheStaticAssets: vi.fn(),
  skipWaiting: vi.fn(),
}))

vi.mock('../types', () => ({
  sw: {
    addEventListener: vi.fn((type: string, listener: (event: unknown) => void) => {
      workerMocks.listeners.set(type, listener)
    }),
    clients: { claim: vi.fn() },
    registration: {},
    skipWaiting: workerMocks.skipWaiting,
  },
}))
vi.mock('../strategies', () => ({
  cleanupOutdatedCaches: vi.fn(),
  precacheStaticAssets: workerMocks.precacheStaticAssets,
}))
vi.mock('../fetch', () => ({ handleFetch: vi.fn() }))
vi.mock('../messages', () => ({ handleMessage: vi.fn() }))
vi.mock('../push', () => ({ handleNotificationClick: vi.fn(), handlePush: vi.fn() }))
vi.mock('../runtime', () => ({ swLog: vi.fn() }))
vi.mock('../sync', () => ({ triggerClientSync: vi.fn() }))

it('does not activate a service worker whose essential precache failed', async () => {
  workerMocks.precacheStaticAssets.mockRejectedValue(new Error('essential asset missing'))
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  await import('../index')
  let installPromise: Promise<unknown> | undefined

  workerMocks.listeners.get('install')?.({
    waitUntil(promise: Promise<unknown>) {
      installPromise = promise
    },
  })

  await expect(installPromise).rejects.toThrow('essential asset missing')
  expect(workerMocks.skipWaiting).not.toHaveBeenCalled()
  consoleError.mockRestore()
})
