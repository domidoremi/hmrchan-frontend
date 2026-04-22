import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../client', () => ({
  apiClient: {
    post: vi.fn(),
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

  it('drops retired legacy relative avatar paths', () => {
    expect(normalizeAvatarUrl('/uploads/avatars/test.jpg')).toBeNull()
  })

  it('drops retired legacy absolute avatar paths on the site origin', () => {
    expect(normalizeAvatarUrl('https://momichan.xyz/uploads/avatars/test.jpg')).toBeNull()
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

  it('starts asynchronous account exports with a verification header', async () => {
    vi.mocked(ensureVerificationToken).mockResolvedValueOnce('export-token')
    vi.mocked(apiClient.post).mockResolvedValueOnce(undefined)

    await userService.exportData()

    expect(ensureVerificationToken).toHaveBeenCalledWith('export_data')
    expect(apiClient.post).toHaveBeenCalledWith('/account/export-data', null, {
      headers: {
        'X-Verification-Token': 'export-token',
      },
      verificationAction: 'export_data',
    })
  })
})
