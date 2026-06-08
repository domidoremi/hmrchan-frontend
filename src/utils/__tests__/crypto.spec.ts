import { afterEach, describe, expect, it, vi } from 'vitest'

import { generateUUID, getRandomBytes, getRandomHex, hmacSha256 } from '@/utils/crypto'

describe('crypto utilities', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fills the requested byte length with Web Crypto randomness', () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.set([1, 2, 255])
      return bytes
    })
    vi.stubGlobal('crypto', { getRandomValues })

    const bytes = getRandomBytes(3)

    expect([...bytes]).toEqual([1, 2, 255])
    expect(getRandomValues).toHaveBeenCalledWith(bytes)
  })

  it('returns a trimmed hexadecimal nonce for odd requested lengths', () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.set([0xab, 0xcd])
      return bytes
    })
    vi.stubGlobal('crypto', { getRandomValues })

    expect(getRandomHex(3)).toBe('abc')
    expect(getRandomValues).toHaveBeenCalledWith(expect.objectContaining({ length: 2 }))
  })

  it('delegates UUID generation to Web Crypto', () => {
    const randomUUID = vi.fn(() => '018f6d22-3cc7-7a1d-a456-4d2c59b6f4f1')
    vi.stubGlobal('crypto', { randomUUID })

    expect(generateUUID()).toBe('018f6d22-3cc7-7a1d-a456-4d2c59b6f4f1')
    expect(randomUUID).toHaveBeenCalledTimes(1)
  })

  it('signs data with HMAC SHA-256 as a hex digest', async () => {
    await expect(hmacSha256('secret', 'message')).resolves.toBe(
      '8b5f48702995c1598c573db1e21866a9b825d4a794d169d7060a03605796360b'
    )
  })
})
