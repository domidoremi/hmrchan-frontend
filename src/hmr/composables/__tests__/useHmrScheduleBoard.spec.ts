import { ref } from 'vue'
import { describe, expect, it } from 'vitest'

import type { HmrScheduleContent } from '@/api/hmrContent'
import { useHmrScheduleBoard } from '@/hmr/composables/useHmrScheduleBoard'

const locale = ref('zh-CN')
const labels: Record<string, string> = {
  'schedule.all': '全部',
  'schedule.today': '今天',
  'schedule.week': '本周',
  'schedule.month': '本月',
  'schedule.performance': '演出',
  'schedule.itemCount': '项',
  'schedule.noItems': '暂无',
}
const t = (key: string) => labels[key] ?? key
const now = () => new Date('2026-05-28T10:00:00.000Z')

function makeContent(): HmrScheduleContent {
  return {
    items: [
      {
        id: 'today-live',
        title: 'Live stage',
        phase: '直播',
        time: '20:30',
        description: 'Main performance',
      },
      {
        id: 'tomorrow-note',
        title: 'Planning note',
        phase: '安排',
        time: '2026-05-29T09:00:00.000Z',
        description: 'Morning work',
      },
      {
        id: 'next-month',
        title: 'June release',
        phase: '发布',
        time: '2026-06-02T12:00:00.000Z',
        description: 'Release window',
      },
    ],
    calendar: [],
    highlights: [],
  }
}

describe('useHmrScheduleBoard', () => {
  it('normalizes event dates and counts the visible day window', () => {
    const board = useHmrScheduleBoard(ref(makeContent()), { locale, t, now })

    expect(board.selectedDayKey.value).toBe('2026-05-28')
    expect(board.selectedDayEvents.value.map((item) => item.id)).toEqual(['today-live'])
    expect(board.dayOptions.value[0]).toMatchObject({
      key: '2026-05-28',
      count: 1,
    })
    expect(board.selectedSummary.value).toBe('1 项 · 20:30')
  })

  it('filters performance events across the active event set', () => {
    const board = useHmrScheduleBoard(ref(makeContent()), { locale, t, now })

    board.setFilter('performance')

    expect(board.upcomingEvents.value.map((item) => item.id)).toEqual(['today-live', 'next-month'])
  })

  it('switches to month mode and exposes a 42-cell month grid', () => {
    const board = useHmrScheduleBoard(ref(makeContent()), { locale, t, now })

    board.shiftMonth(1)

    expect(board.activeFilter.value).toBe('month')
    expect(board.selectedDayKey.value).toBe('2026-06-01')
    expect(board.monthDays.value).toHaveLength(42)
    expect(board.monthDays.value.find((day) => day.key === '2026-06-02')).toMatchObject({
      count: 1,
      inMonth: true,
    })
  })
})
