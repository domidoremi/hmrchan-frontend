import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const schedulePageSource = readFileSync(
  resolve(process.cwd(), 'src/views/SchedulePage.vue'),
  'utf8'
)

describe('SchedulePage event card styles', () => {
  it('keeps agenda event cards content-sized instead of allowing flex-column shrink collapse', () => {
    expect(schedulePageSource).toContain('.event-card {')
    expect(schedulePageSource).toContain('flex-shrink: 0;')
    expect(schedulePageSource).toContain('.event-body {')
    expect(schedulePageSource).toContain('display: flex;')
    expect(schedulePageSource).toContain('flex-direction: column;')
    expect(schedulePageSource).toContain('align-items: flex-start;')
  })

  it('lets title, copy, venue, and hint wrap within the event body instead of overflowing it', () => {
    expect(schedulePageSource).toContain('.event-title {')
    expect(schedulePageSource).toContain('inline-size: 100%;')
    expect(schedulePageSource).toContain('overflow-wrap: anywhere;')
    expect(schedulePageSource).toContain('.event-desc {')
    expect(schedulePageSource).toContain('.event-venue {')
    expect(schedulePageSource).toContain('flex-wrap: wrap;')
    expect(schedulePageSource).toContain('.event-card-hint {')
    expect(schedulePageSource).toContain('align-self: stretch;')
  })
})
