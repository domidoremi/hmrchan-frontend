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

  it('reserves stable space for detail content to reduce route hydration layout shift', () => {
    expect(schedulePageSource).toContain('.schedule-detail-shell')
    expect(schedulePageSource).toContain('overflow-anchor: none')
    expect(schedulePageSource).toContain(
      'grid-template-rows: minmax(10rem, auto) auto minmax(7.5rem, auto) minmax(8rem, auto) auto'
    )
    expect(schedulePageSource).toContain('min-block-size: 10rem')
    expect(schedulePageSource).toContain('min-block-size: 7.5rem')
    expect(schedulePageSource).toContain('min-block-size: 8rem')
  })
})
