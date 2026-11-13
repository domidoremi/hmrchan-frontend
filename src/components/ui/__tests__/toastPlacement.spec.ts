import { describe, expect, it } from 'vitest'
import { findToastShift } from '../toastPlacement'

const bounds = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
  height,
})

describe('toast placement around page controls', () => {
  it('keeps the editorial notice in its existing clear space', () => {
    const notice = bounds(1046, 92, 360, 62)
    expect(findToastShift(notice, [bounds(1262, 193, 111, 20)], 'top', 1000, 8)).toBe(0)
  })

  it('preserves access to both archive navigation and saved events', () => {
    const notice = bounds(1046, 24, 360, 62)
    const controls = [bounds(1300, 14, 44, 44), bounds(1244, 104, 154, 42)]
    expect(findToastShift(notice, controls, 'top', 1000, 8)).toBe(130)
  })

  it('moves a phone notice past the title and calendar toolbar', () => {
    const notice = bounds(12, 80, 356, 62)
    const controls = [
      bounds(240, 96.5, 122, 38),
      bounds(18, 176, 44, 44),
      bounds(230, 238, 132, 20),
      bounds(18, 345, 49, 99),
    ]
    expect(findToastShift(notice, controls, 'top', 1000, 8)).toBe(186)
  })

  it('keeps both the reminder and event opener reachable near the footer', () => {
    const notice = bounds(12, 922, 356, 62)
    const controls = [bounds(39, 921.5, 126, 23.8), bounds(315, 885.5, 26, 26)]
    expect(findToastShift(notice, controls, 'bottom', 1000, 8)).toBe(-106.5)
  })

  it('ignores controls beside the notice and hidden zero-height controls', () => {
    const notice = bounds(1046, 92, 360, 62)
    const controls = [bounds(100, 92, 80, 44), bounds(1200, 100, 44, 0)]
    expect(findToastShift(notice, controls, 'top', 1000, 8)).toBe(0)
  })

  it('reports when the preferred half has no clear space', () => {
    const notice = bounds(12, 80, 356, 62)
    expect(findToastShift(notice, [bounds(12, 80, 356, 430)], 'top', 1000, 8)).toBeNull()
  })
})
