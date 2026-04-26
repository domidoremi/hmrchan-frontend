import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const schedulePageSource = readFileSync(
  resolve(process.cwd(), 'src/views/SchedulePage.vue'),
  'utf8'
)

describe('SchedulePage mobile styles', () => {
  it('stacks hero controls within the mobile viewport instead of laying them out horizontally', () => {
    expect(schedulePageSource).toContain('@media (max-width: 640px)')
    expect(schedulePageSource).toContain('.schedule-hero__actions')
    expect(schedulePageSource).toContain('flex-direction: column')
    expect(schedulePageSource).toContain('overflow: hidden')
    expect(schedulePageSource).toContain('.planner-view-switch .page-control')
    expect(schedulePageSource).toContain('flex: 1 1 0')
  })
})
