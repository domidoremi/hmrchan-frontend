import { beforeEach, describe, expect, it, vi } from 'vitest'

const clientMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}))

const verificationMocks = vi.hoisted(() => ({
  ensureVerificationToken: vi.fn(),
}))

vi.mock('../client', () => ({
  apiClient: {
    get: clientMocks.get,
    post: clientMocks.post,
    delete: clientMocks.delete,
  },
}))

vi.mock('../verificationBridge', () => ({
  ensureVerificationToken: verificationMocks.ensureVerificationToken,
}))

import { deviceService } from '../deviceService'

describe('deviceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verificationMocks.ensureVerificationToken.mockResolvedValue('verification-token')
  })

  it('sends device_id in trust and untrust requests', async () => {
    vi.mocked(clientMocks.post).mockResolvedValue({ success: true })

    await deviceService.trustDevice('0195fe30-6f9d-7f31-9e6f-c9a5c478a001')
    await deviceService.untrustDevice('0195fe30-6f9d-7f31-9e6f-c9a5c478a001')

    expect(clientMocks.post).toHaveBeenNthCalledWith(
      1,
      '/devices/trust',
      { device_id: '0195fe30-6f9d-7f31-9e6f-c9a5c478a001' },
      expect.objectContaining({
        securityPolicy: 'sensitive',
        verificationAction: 'update_security_settings',
      })
    )
    expect(clientMocks.post).toHaveBeenNthCalledWith(2, '/devices/untrust', {
      device_id: '0195fe30-6f9d-7f31-9e6f-c9a5c478a001',
    })
  })

  it('uses UUIDv7 device ids for revoke and rename requests', async () => {
    vi.mocked(clientMocks.delete).mockResolvedValue(undefined)
    vi.mocked(clientMocks.post).mockResolvedValue({ success: true })

    await deviceService.revokeDevice('0195fe30-6f9d-7f31-9e6f-c9a5c478a001')
    await deviceService.updateDeviceName('0195fe30-6f9d-7f31-9e6f-c9a5c478a001', 'My browser')

    expect(clientMocks.delete).toHaveBeenCalledWith(
      '/devices/0195fe30-6f9d-7f31-9e6f-c9a5c478a001',
      {
        securityPolicy: 'sensitive',
        headers: {
          'X-Verification-Token': 'verification-token',
        },
      }
    )
    expect(clientMocks.post).toHaveBeenCalledWith(
      '/devices/rename',
      {
        device_id: '0195fe30-6f9d-7f31-9e6f-c9a5c478a001',
        device_name: 'My browser',
      },
      {
        securityPolicy: 'sensitive',
      }
    )
  })
})
