import { describe, expect, it } from 'vitest'
import { validateMainstreamEmailDomain } from '../emailDomainPolicy'

describe('validateMainstreamEmailDomain', () => {
  it('accepts supported mainstream email domains', () => {
    expect(validateMainstreamEmailDomain('User.Name+tag@gmail.com')).toEqual({
      valid: true,
      normalizedEmail: 'user.name+tag@gmail.com',
    })
    expect(validateMainstreamEmailDomain('demo@outlook.com').valid).toBe(true)
    expect(validateMainstreamEmailDomain('sample@proton.me').valid).toBe(true)
  })

  it('rejects malformed email addresses', () => {
    expect(validateMainstreamEmailDomain('not-an-email')).toEqual({
      valid: false,
      normalizedEmail: 'not-an-email',
      reason: 'format',
    })
  })

  it('rejects custom or unsupported domains', () => {
    expect(validateMainstreamEmailDomain('user@company.dev')).toEqual({
      valid: false,
      normalizedEmail: 'user@company.dev',
      reason: 'domain',
    })
  })
})
