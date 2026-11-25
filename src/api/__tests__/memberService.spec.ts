import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/client'
import { memberService } from '@/api/memberService'

describe('public member directory', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns the static array in API order, including nullable fields', async () => {
    const profiles = [
      { id: 'second', name_ja: 'Second', blood_type: null },
      { id: 'first', name_ja: 'First', blood_type: 'A' },
    ]
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue(profiles)
    expect(await memberService.list()).toEqual(profiles)
    expect(get).toHaveBeenCalledWith('/members', { skipAuth: true })
  })

  it('preserves an empty directory', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue([])
    expect(await memberService.list()).toEqual([])
  })

  it('treats an unknown identifier as one path segment and propagates the error', async () => {
    const missing = new Error('Member not found')
    const get = vi.spyOn(apiClient, 'get').mockRejectedValue(missing)
    await expect(memberService.getById('missing/profile')).rejects.toBe(missing)
    expect(get).toHaveBeenCalledWith('/members/missing%2Fprofile', { skipAuth: true })
  })
})
