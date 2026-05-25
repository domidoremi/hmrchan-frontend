import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const schedulePageSource = readFileSync(
  resolve(process.cwd(), 'src/styles/page-systems/schedule-page-view.css'),
  'utf8'
)

describe('SchedulePage mobile styles', () => {
  it('stacks hero controls within the mobile viewport instead of laying them out horizontally', () => {
    expect(schedulePageSource).toContain('@media (max-width: 640px)')
    expect(schedulePageSource).toContain('.schedule-hero__actions')
    expect(schedulePageSource).toContain('flex-direction: column')
    expect(schedulePageSource).toContain('overflow: hidden')
    expect(schedulePageSource).toContain(
      '.category-filters.page-control-group-shell.page-control-group-shell--comfortable'
    )
    expect(schedulePageSource).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))')
    expect(schedulePageSource).toContain('.schedule-filter-pill.page-control')
    expect(schedulePageSource).toContain('inline-size: 100%')
    expect(schedulePageSource).toContain('.planner-view-switch .page-control')
    expect(schedulePageSource).toContain('flex: 1 1 0')
  })

  it('stacks the agenda and planner overview into a single mobile column', () => {
    expect(schedulePageSource).toContain('.schedule-overview')
    expect(schedulePageSource).toContain('.agenda-shell__actions')
    expect(schedulePageSource).toContain('.agenda-shell__action')
    expect(schedulePageSource).toContain('justify-content: stretch')
    expect(schedulePageSource).toContain('flex: 1 1 100%')
    expect(schedulePageSource).toContain('.agenda-events-list')
    expect(schedulePageSource).toContain('max-block-size: none')
    expect(schedulePageSource).toContain('overflow: visible')
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
