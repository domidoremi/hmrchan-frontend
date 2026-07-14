import { beforeEach, describe, expect, it, vi } from 'vitest'

const { matchAll } = vi.hoisted(() => ({ matchAll: vi.fn() }))

vi.mock('../types', () => ({
  sw: {
    clients: { matchAll },
  },
}))

import { triggerClientSync } from '../sync'

class MockMessageChannel {
  port1: { onmessage: ((event: MessageEvent) => void) | null } = { onmessage: null }
  port2 = {
    reply: (data: unknown) => {
      this.port1.onmessage?.({ data } as MessageEvent)
    },
  }
}

describe('triggerClientSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('MessageChannel', MockMessageChannel)
  })

  it('rejects when no controlled window can perform authenticated synchronization', async () => {
    matchAll.mockResolvedValue([])

    await expect(triggerClientSync()).rejects.toThrow('No window client')
  })

  it('rejects when every client reports a synchronization failure', async () => {
    matchAll.mockResolvedValue([
      {
        postMessage: (_message: unknown, ports: Array<MockMessageChannel['port2']>) => {
          ports[0]?.reply({ ok: false, error: 'queue failed' })
        },
      },
    ])

    await expect(triggerClientSync()).rejects.toThrow('queue failed')
  })

  it('resolves only after at least one client acknowledges successful synchronization', async () => {
    matchAll.mockResolvedValue([
      {
        postMessage: (_message: unknown, ports: Array<MockMessageChannel['port2']>) => {
          ports[0]?.reply({ ok: true })
        },
      },
    ])

    await expect(triggerClientSync()).resolves.toBeUndefined()
  })
})
