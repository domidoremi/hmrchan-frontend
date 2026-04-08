import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAuthService, mockClientSecurityService, mockReportClientEvent } = vi.hoisted(() => ({
  mockAuthService: {
    getTurnstileConfig: vi.fn(),
  },
  mockClientSecurityService: {
    init: vi.fn(),
  },
  mockReportClientEvent: vi.fn(),
}))

vi.mock('@/api/authService', () => ({
  authService: mockAuthService,
}))

vi.mock('@/api/clientSecurityService', () => ({
  clientSecurityService: mockClientSecurityService,
}))

vi.mock('@/utils/clientReporter', () => ({
  reportClientEvent: mockReportClientEvent,
}))

import { prepareGoogleAuthHandoff } from '../googleAuthService'

describe('prepareGoogleAuthHandoff', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthService.getTurnstileConfig.mockResolvedValue({
      enabled: true,
      site_key: 'site-key',
    })
  })

  it('force reissues client init before showing the Google challenge when init omits client_token', async () => {
    mockClientSecurityService.init
      .mockResolvedValueOnce({
        challenge_required: true,
        client_token: '',
        trust_level: 'untrusted',
        turnstile_site_key: 'site-key',
      })
      .mockResolvedValueOnce({
        challenge_required: true,
        client_token: 'reissued-token',
        client_secret: 'reissued-secret',
        trust_level: 'untrusted',
        turnstile_site_key: 'site-key',
      })

    const result = await prepareGoogleAuthHandoff('handoff-code', '')

    expect(result).toEqual({
      status: 'challenge-required',
      handoffCode: 'handoff-code',
      siteKey: 'site-key',
    })
    expect(mockClientSecurityService.init).toHaveBeenNthCalledWith(1, false, {
      promptChallenge: false,
    })
    expect(mockClientSecurityService.init).toHaveBeenNthCalledWith(2, true, {
      promptChallenge: false,
    })
    expect(mockReportClientEvent).toHaveBeenCalledWith(
      'google.challenge.init_missing_client_token',
      expect.objectContaining({
        challengeRequired: true,
      }),
      expect.objectContaining({
        category: 'security',
        severity: 'warn',
      })
    )
  })

  it('fails with a client-token-specific error when force reissue still cannot provide a challenge token', async () => {
    mockClientSecurityService.init
      .mockResolvedValueOnce({
        challenge_required: true,
        client_token: '',
        trust_level: 'untrusted',
        turnstile_site_key: 'site-key',
      })
      .mockResolvedValueOnce({
        challenge_required: true,
        client_token: '',
        trust_level: 'untrusted',
        turnstile_site_key: 'site-key',
      })

    const result = await prepareGoogleAuthHandoff('handoff-code', '')

    expect(result).toEqual({
      status: 'error',
      messageKey: 'error.server.invalidClientToken',
      detail: 'Missing client token for Google auth challenge.',
    })
  })
})
