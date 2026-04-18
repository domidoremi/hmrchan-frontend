import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../client', () => ({
  apiClient: {
    post: vi.fn(),
    response: vi.fn(),
  },
}))

vi.mock('../verificationBridge', () => ({
  ensureVerificationToken: vi.fn(),
}))

import { apiClient } from '../client'
import { ensureVerificationToken } from '../verificationBridge'
import { normalizeAvatarUrl, userService } from '../userService'

describe('normalizeAvatarUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps proxied relative avatar paths accessible', () => {
    expect(normalizeAvatarUrl('/uploads/avatars/test.jpg')).toBe('/uploads/avatars/test.jpg')
  })

  it('falls back YouTube maxres avatars to hqdefault before request', () => {
    expect(normalizeAvatarUrl('https://i.ytimg.com/vi/demo/maxresdefault.jpg')).toBe(
      'https://i.ytimg.com/vi/demo/hqdefault.jpg'
    )
  })

  it('drops tiktok avatar urls that cannot be proxied safely', () => {
    expect(normalizeAvatarUrl('https://p16-sign-sg.tiktokcdn.com/avatar.jpeg')).toBeNull()
  })

  it('drops twitter avatar urls that cannot be proxied safely', () => {
    expect(normalizeAvatarUrl('https://pbs.twimg.com/profile_images/demo/avatar.jpg')).toBeNull()
  })

  it('leaves other absolute avatar urls untouched', () => {
    expect(normalizeAvatarUrl('https://cdn.example.com/avatar.jpg')).toBe(
      'https://cdn.example.com/avatar.jpg'
    )
  })

  it('sends delete-account verification tokens in the verification header', async () => {
    vi.mocked(ensureVerificationToken).mockResolvedValueOnce('delete-token')

    await userService.deleteAccount('cleanup')

    expect(ensureVerificationToken).toHaveBeenCalledWith('delete_account')
    expect(apiClient.post).toHaveBeenCalledWith(
      '/account/delete',
      {
        confirm: true,
        reason: 'cleanup',
      },
      {
        headers: {
          'X-Verification-Token': 'delete-token',
        },
        verificationAction: 'delete_account',
      }
    )
  })

  it('converts JSON export envelopes into downloadable JSON blobs', async () => {
    vi.mocked(ensureVerificationToken).mockResolvedValueOnce('export-token')
    vi.mocked(apiClient.response).mockResolvedValueOnce({
      headers: new Headers({
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="user_data.json"',
      }),
      json: vi.fn().mockResolvedValue({
        success: true,
        data: { profile: { username: 'momichan' } },
      }),
    } as unknown as Response)

    const result = await userService.exportData()

    expect(ensureVerificationToken).toHaveBeenCalledWith('export_data')
    expect(apiClient.response).toHaveBeenCalledWith('/account/export-data', {
      method: 'POST',
      headers: {
        'X-Verification-Token': 'export-token',
      },
      verificationAction: 'export_data',
    })
    expect(result.filename).toBe('user_data.json')
    await expect(result.blob.text()).resolves.toBe(
      JSON.stringify({ profile: { username: 'momichan' } }, null, 2)
    )
  })
})
