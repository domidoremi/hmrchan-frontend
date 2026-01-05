/**
 * Filters 配置单元测试
 */

import { describe, it, expect } from 'vitest'
import { FILTERED_AUTHORS, isFilteredAuthor } from '../filters'

describe('Filters Config', () => {
  describe('FILTERED_AUTHORS', () => {
    it('should contain expected filtered authors', () => {
      expect(FILTERED_AUTHORS).toContain('twitter_unknown_unknown')
    })

    it('should be a readonly array', () => {
      expect(Array.isArray(FILTERED_AUTHORS)).toBe(true)
    })
  })

  describe('isFilteredAuthor', () => {
    it('should return true for filtered author', () => {
      expect(isFilteredAuthor('twitter_unknown_unknown')).toBe(true)
    })

    it('should be case insensitive', () => {
      expect(isFilteredAuthor('TWITTER_UNKNOWN_UNKNOWN')).toBe(true)
      expect(isFilteredAuthor('Twitter_Unknown_Unknown')).toBe(true)
    })

    it('should return false for valid author', () => {
      expect(isFilteredAuthor('valid_author')).toBe(false)
      expect(isFilteredAuthor('another_author')).toBe(false)
    })

    it('should return false for null', () => {
      expect(isFilteredAuthor(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isFilteredAuthor(undefined)).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isFilteredAuthor('')).toBe(false)
    })
  })
})
