import { describe, expect, it } from 'vitest'
import { journalDateLabel } from '../localizedDate'

describe('generated Journal calendar dates', () => {
  it('keeps the Taipei calendar day at year and leap-day boundaries', () => {
    expect(journalDateLabel('2026-01-01', 'en')).toContain('January 1, 2026')
    expect(journalDateLabel('2024-02-29', 'en')).toContain('February 29, 2024')
    expect(journalDateLabel('2026-11-11', 'en')).toContain('November 11, 2026')
    expect(journalDateLabel('2026-11-11', 'en')).toContain('Wed')
    expect(journalDateLabel('2026-11-11', 'en', true)).toContain('Nov 11')
  })

  it.each(['2026-02-30', '2026-13-01', '2026-00-11', '作者原日期', '2026-11-11T23:30:00Z'])(
    'keeps an invalid or legacy date source unchanged: %s',
    (value) => {
      expect(journalDateLabel(value, 'en')).toBe(value)
    }
  )

  it('uses locale-specific calendar labels and returns to the original locale consistently', () => {
    const value = '2026-11-11'
    const english = journalDateLabel(value, 'en')
    expect(journalDateLabel(value, 'ja')).toContain('2026年11月11日')
    expect(journalDateLabel(value, 'zh-CN')).toContain('2026年11月11日')
    expect(journalDateLabel(value, 'zh-TW')).toContain('2026年11月11日')
    expect(journalDateLabel(value, 'en')).toBe(english)
  })
})
