import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
    expect(normalizeAvatarUrl('https://momichan.com/uploads/avatars/test.jpg')).toBeNull()
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

  it('preserves default account-restoration request policies', async () => {
    const data = { identifier: 'fixture', password: 'fixture-password' }

    await userService.restoreAccount(data)

    expect(apiClient.post).toHaveBeenCalledExactlyOnceWith('/account/restore', data, {})
  })

  it('forwards account-restoration cancellation and caller-owned feedback', async () => {
    const data = { identifier: 'fixture', password: 'fixture-password' }
    const options = { signal: new AbortController().signal, skipErrorToast: true }

    await userService.restoreAccount(data, options)

    expect(apiClient.post).toHaveBeenCalledExactlyOnceWith('/account/restore', data, options)
  })

  it('requests the account export as a file with a verification header', async () => {
    vi.mocked(ensureVerificationToken).mockResolvedValueOnce('export-token')
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('export unavailable'))

    await expect(userService.exportData()).rejects.toThrow('export unavailable')

    expect(ensureVerificationToken).toHaveBeenCalledWith('export_data')
    expect(apiClient.post).toHaveBeenCalledWith('/account/export-data', null, {
      headers: {
        'X-Verification-Token': 'export-token',
      },
      verificationAction: 'export_data',
      responseType: 'blob',
    })
  })
})

describe('account data download', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:account-export'),
      revokeObjectURL: vi.fn(),
    })
    vi.mocked(ensureVerificationToken).mockResolvedValue('export-token')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('downloads the returned file and releases its URL', async () => {
    const exportedFile = new Blob(['{"truncated":false,"favorites":[]}'], {
      type: 'application/json',
    })
    vi.mocked(apiClient.post).mockResolvedValueOnce(exportedFile)
    const clickedFiles: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      clickedFiles.push(this)
    })

    await userService.exportData()

    expect(URL.createObjectURL).toHaveBeenCalledExactlyOnceWith(exportedFile)
    expect(clickedFiles).toHaveLength(1)
    expect(clickedFiles[0]?.download).toBe('user_data.json')
    expect(clickedFiles[0]?.href).toBe('blob:account-export')
    expect(document.querySelector('a[download="user_data.json"]')).toBeNull()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    await vi.runAllTimersAsync()
    expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:account-export')
  })

  it('does not offer a file when the export request fails', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('export unavailable'))
    const clickDownload = vi.spyOn(HTMLAnchorElement.prototype, 'click')

    await expect(userService.exportData()).rejects.toThrow('export unavailable')

    expect(URL.createObjectURL).not.toHaveBeenCalled()
    expect(clickDownload).not.toHaveBeenCalled()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  })
})
