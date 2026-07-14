import { beforeEach, describe, expect, it, vi } from 'vitest'

const swMocks = vi.hoisted(() => ({
  matchAll: vi.fn(),
  openWindow: vi.fn(),
}))

vi.mock('../types', () => ({
  sw: {
    location: new URL('https://momichan.com/'),
    clients: {
      matchAll: swMocks.matchAll,
      openWindow: swMocks.openWindow,
    },
  },
}))
vi.mock('../runtime', () => ({ swLog: vi.fn() }))

import { handleNotificationClick, normalizePushActionUrl } from '../push'

describe('push action URL policy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    swMocks.matchAll.mockResolvedValue([])
    swMocks.openWindow.mockResolvedValue(undefined)
  })

  it('keeps same-origin paths and rejects external or active-content URLs', () => {
    expect(normalizePushActionUrl('/inbox?tab=security#latest')).toBe('/inbox?tab=security#latest')
    expect(normalizePushActionUrl('https://momichan.com/post/1')).toBe('/post/1')

    for (const unsafe of [
      'https://evil.example/phish',
      '//evil.example/phish',
      'javascript:alert(1)',
      'data:text/html,phish',
    ]) {
      expect(normalizePushActionUrl(unsafe)).toBe('/')
    }
  })

  it('revalidates notification data at click time', async () => {
    let completion: Promise<unknown> | undefined
    handleNotificationClick({
      action: 'open',
      notification: {
        data: 'javascript:alert(1)',
        close: vi.fn(),
      } as unknown as Notification,
      waitUntil(promise: Promise<unknown>) {
        completion = promise
      },
    } as never)

    await completion
    expect(swMocks.openWindow).toHaveBeenCalledWith('/')
  })
})
