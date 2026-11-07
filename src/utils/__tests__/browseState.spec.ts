import { describe, expect, it } from 'vitest'
import { parseLocalDate, readBrowseState, readScheduleState } from '../browseState'

describe('browse address state', () => {
  it('restores a combined feed address and bounds text input', () => {
    expect(
      readBrowseState({ source: 'youtube', sort: 'popular', layout: 'list', q: '舞台' })
    ).toEqual({ source: 'youtube', sort: 'popular', layout: 'list', q: '舞台' })
    expect(readBrowseState({ q: 'x'.repeat(300) }).q).toHaveLength(160)
  })
  it('rejects repeated and unknown values', () => {
    expect(
      readBrowseState({ source: ['x', 'youtube'], sort: 'random', layout: 'unknown', q: ['one'] })
    ).toEqual({ source: 'latest', sort: 'latest', layout: 'grid', q: '' })
  })
  it('rejects rollover dates and accepts leap days in local time', () => {
    expect(parseLocalDate('2026-02-29')).toBeNull()
    expect(parseLocalDate('2026-13-01')).toBeNull()
    expect(parseLocalDate('0026-02-01')).toBeNull()
    expect(parseLocalDate('2028-02-29')?.getDate()).toBe(29)
  })
  it('restores the displayed month independently of the selected date', () => {
    const state = readScheduleState({
      month: '2026-11',
      date: '2026-12-01',
      view: 'month',
      category: 'live',
    })
    expect(state).toMatchObject({ year: 2026, month: 10, view: 'month', category: 'live' })
    expect(state.date?.getMonth()).toBe(11)
  })
  it('uses the current month for malformed addresses', () => {
    expect(
      readScheduleState(
        { month: '../invalid', date: 'today', view: ['day'], category: 'oops' },
        new Date(2026, 10, 7)
      )
    ).toMatchObject({ year: 2026, month: 10, date: null, view: 'week', category: 'all' })
  })
})
