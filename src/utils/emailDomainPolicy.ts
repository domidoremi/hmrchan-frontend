const MAINSTREAM_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'me.com',
  'yahoo.com',
  'proton.me',
  'protonmail.com',
  'qq.com',
  '163.com',
  '126.com',
])

const BASIC_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type EmailDomainValidationResult = {
  valid: boolean
  normalizedEmail: string
  reason?: 'format' | 'domain'
}

export function validateMainstreamEmailDomain(email: string): EmailDomainValidationResult {
  const normalizedEmail = email.trim().toLowerCase()
  if (!BASIC_EMAIL_REGEX.test(normalizedEmail)) {
    return {
      valid: false,
      normalizedEmail,
      reason: 'format',
    }
  }

  const [, domain = ''] = normalizedEmail.split('@')
  if (!MAINSTREAM_EMAIL_DOMAINS.has(domain)) {
    return {
      valid: false,
      normalizedEmail,
      reason: 'domain',
    }
  }

  return {
    valid: true,
    normalizedEmail,
  }
}

export function isMainstreamEmailDomain(email: string): boolean {
  return validateMainstreamEmailDomain(email).valid
}
