import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  escapeHtml,
  sanitizeHtml,
  validateComment,
  sanitizeComment,
  isValidUrl,
  RateLimiter,
} from '../security'

describe('escapeHtml', () => {
  it('should escape HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
    )
  })

  it('should escape ampersands', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry')
  })

  it('should escape single quotes', () => {
    expect(escapeHtml("It's a test")).toBe('It&#x27;s a test')
  })

  it('should handle empty string', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('should handle string without special characters', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World')
  })
})

describe('sanitizeHtml', () => {
  it('should remove script tags', () => {
    expect(sanitizeHtml('<script>alert(1)</script>Hello')).toBe('Hello')
  })

  it('should remove event handlers', () => {
    expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).toBe('<img src="x">')
  })

  it('should preserve safe HTML', () => {
    expect(sanitizeHtml('<b>Bold</b> <i>Italic</i>')).toBe('<b>Bold</b> <i>Italic</i>')
  })
})

describe('validateComment', () => {
  it('should return valid for normal comment', () => {
    const result = validateComment('This is a normal comment')
    expect(result.valid).toBe(true)
  })

  it('should return invalid for empty comment', () => {
    const result = validateComment('')
    expect(result.valid).toBe(false)
  })

  it('should return invalid for comment with only whitespace', () => {
    const result = validateComment('   ')
    expect(result.valid).toBe(false)
  })

  it('should return invalid for too long comment', () => {
    const longComment = 'a'.repeat(2001)
    const result = validateComment(longComment)
    expect(result.valid).toBe(false)
  })

  it('should detect script injection', () => {
    const result = validateComment('<script>alert(1)</script>Hello')
    expect(result.valid).toBe(false)
  })
})

describe('sanitizeComment', () => {
  it('should escape HTML in comment', () => {
    const result = sanitizeComment('<b>Bold</b>')
    expect(result).not.toContain('<b>')
  })

  it('should trim whitespace', () => {
    const result = sanitizeComment('  hello  ')
    expect(result).toBe('hello')
  })

  it('should handle empty string', () => {
    const result = sanitizeComment('')
    expect(result).toBe('')
  })
})

describe('isValidUrl', () => {
  it('should return true for valid HTTP URL', () => {
    expect(isValidUrl('http://example.com')).toBe(true)
  })

  it('should return true for valid HTTPS URL', () => {
    expect(isValidUrl('https://example.com/path?query=1')).toBe(true)
  })

  it('should return false for javascript URL', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(false)
  })

  it('should return false for data URL', () => {
    expect(isValidUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
  })

  it('should return false for invalid URL', () => {
    expect(isValidUrl('not a url')).toBe(false)
  })
})

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should allow requests within limit', () => {
    const limiter = new RateLimiter(5, 60000)

    expect(limiter.canProceed()).toBe(true)
    limiter.record()
    expect(limiter.canProceed()).toBe(true)
    limiter.record()
    expect(limiter.canProceed()).toBe(true)
  })

  it('should block requests exceeding limit', () => {
    const limiter = new RateLimiter(2, 60000)

    expect(limiter.canProceed()).toBe(true)
    limiter.record()
    expect(limiter.canProceed()).toBe(true)
    limiter.record()
    expect(limiter.canProceed()).toBe(false)
  })

  it('should reset after window expires', () => {
    const limiter = new RateLimiter(2, 1000)

    limiter.record()
    limiter.record()
    expect(limiter.canProceed()).toBe(false)

    vi.advanceTimersByTime(1100)

    expect(limiter.canProceed()).toBe(true)
  })

  it('should return remaining time correctly', () => {
    const limiter = new RateLimiter(2, 1000)

    limiter.record()
    const remaining = limiter.getRemainingTime()
    expect(remaining).toBeGreaterThan(0)
    expect(remaining).toBeLessThanOrEqual(1000)
  })
})
