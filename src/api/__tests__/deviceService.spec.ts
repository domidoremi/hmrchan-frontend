import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listDevices, revokeDevice } from '@/api/deviceService'

const mockGet = vi.hoisted(() => vi.fn())
const mockDelete = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  apiClient: {
    delete: mockDelete,
    get: mockGet,
  },
}))

const DEVICE_ID = '018f6d22-3cc7-7a1d-a456-4d2c59b6f4f1'

describe('deviceService', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockDelete.mockReset()
  })

  it('uses authenticated device facade endpoints', async () => {
    mockGet.mockResolvedValue({})
    mockDelete.mockResolvedValue({})

    await listDevices()
    await revokeDevice(DEVICE_ID)

    expect(mockGet).toHaveBeenCalledWith('/devices')
    expect(mockDelete).toHaveBeenCalledWith(`/devices/${DEVICE_ID}`)
  })

  it('rejects non-UUIDv7 device identifiers before calling the facade', () => {
    expect(() => revokeDevice('not-a-v7-id')).toThrow('device id')

    expect(mockDelete).not.toHaveBeenCalled()
  })
})
