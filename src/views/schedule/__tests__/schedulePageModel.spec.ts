import { describe, expect, it } from 'vitest'

import type { ScheduleCalendarItem } from '@/api/scheduleService'
import {
  buildCalendarDay,
  buildCalendarDays,
  buildCategoryBreakdown,
  buildEventsByDate,
  buildWeekDays,
  buildScheduleDetailSharePayload,
  canShareScheduleDetail,
  filterScheduleEvents,
  formatCalendarDateKey,
  formatEventDateTimeLabel,
  getScheduleCategoryColor,
  getTodayScheduleEvents,
  getUpcomingScheduleEvents,
  hasScheduleDetailLinks,
  isSameScheduleDate,
  linkifyScheduleDescriptionLine,
  normalizeScheduleDetailHtml,
  parseScheduleDateJumpValue,
  parseScheduleDescription,
  resolveScheduleAgendaJumpTargetDate,
  resolveScheduleAgendaSummaryLabel,
  resolveScheduleCalendarNavigationIndex,
  resolveScheduleDateJumpValue,
  resolveScheduleDayAriaLabel,
  resolveScheduleDetailHostLabel,
  resolveScheduleDetailLead,
  resolveScheduleDetailPermalink,
  resolveScheduleDetailRecoverySource,
  resolveScheduleEventMetaLabel,
  resolveScheduleEventTitleLabel,
  resolveScheduleMonthStep,
  resolveScheduleMonthSwipeDirection,
  resolveScheduleNextHighlightLabel,
  resolveSchedulePlannerSummaryLabel,
  resolveSchedulePlannerStepTarget,
  resolveScheduleTodayTransition,
  resolveScheduleWeekdays,
} from '../schedulePageModel'

const events: ScheduleCalendarItem[] = [
  {
    id: 'live-1',
    title: 'Live 1',
    start: '2026-05-03T10:00:00.000Z',
    end: null,
    allDay: false,
    category: 'live',
  },
  {
    id: 'media-1',
    title: 'Media',
    start: '2026-05-03T12:00:00.000Z',
    end: null,
    allDay: false,
    category: 'media',
  },
  {
    id: 'live-2',
    title: 'Live 2',
    start: '2026-05-06T12:00:00.000Z',
    end: null,
    allDay: false,
    category: 'live',
  },
]

describe('schedulePageModel', () => {
  it('resolves category colors and weekday labels', () => {
    expect(getScheduleCategoryColor('live')).toBe('#ef4444')
    expect(getScheduleCategoryColor('unknown')).toBe('#22c55e')
    expect(resolveScheduleWeekdays('en')).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
    expect(resolveScheduleWeekdays('ja')).toEqual(['日', '月', '火', '水', '木', '金', '土'])
    expect(resolveScheduleWeekdays('zh-CN')).toEqual(['日', '一', '二', '三', '四', '五', '六'])
  })

  it('filters events and indexes them by calendar date', () => {
    const filtered = filterScheduleEvents(events, 'live')
    expect(filtered.map((event) => event.id)).toEqual(['live-1', 'live-2'])

    const byDate = buildEventsByDate(events)
    expect(byDate.get('2026-05-03')?.map((event) => event.id)).toEqual(['live-1', 'media-1'])
    expect(formatCalendarDateKey(new Date(2026, 4, 3))).toBe('2026-05-03')
  })

  it('builds a stable six-week month grid with event hydration', () => {
    const byDate = buildEventsByDate(events)
    const days = buildCalendarDays({
      year: 2026,
      month: 4,
      eventsByDate: byDate,
      today: new Date(2026, 4, 3),
    })

    expect(days).toHaveLength(42)
    expect(days[0]?.key).toBe('2026-04-26')
    expect(days[0]?.currentMonth).toBe(false)
    expect(days[7]?.key).toBe('2026-05-03')
    expect(days[7]?.isToday).toBe(true)
    expect(days[7]?.events.map((event) => event.id)).toEqual(['live-1', 'media-1'])
  })

  it('builds single days and planner weeks from the same event index', () => {
    const byDate = buildEventsByDate(events)
    const day = buildCalendarDay({
      date: new Date(2026, 4, 6, 22),
      currentMonth: 4,
      eventsByDate: byDate,
      today: new Date(2026, 4, 3),
    })
    expect(day.key).toBe('2026-05-06')
    expect(day.events.map((event) => event.id)).toEqual(['live-2'])

    const week = buildWeekDays({
      anchor: new Date(2026, 4, 6),
      currentMonth: 4,
      eventsByDate: byDate,
      today: new Date(2026, 4, 3),
    })
    expect(week.map((entry) => entry.key)).toEqual([
      '2026-05-03',
      '2026-05-04',
      '2026-05-05',
      '2026-05-06',
      '2026-05-07',
      '2026-05-08',
      '2026-05-09',
    ])
  })

  it('sorts upcoming, today, and category summary data', () => {
    expect(
      getUpcomingScheduleEvents(events, new Date('2026-05-03T11:00:00.000Z')).map(
        (event) => event.id
      )
    ).toEqual(['media-1', 'live-2'])
    expect(getTodayScheduleEvents(events, new Date(2026, 4, 3)).map((event) => event.id)).toEqual([
      'live-1',
      'media-1',
    ])
    expect(buildCategoryBreakdown(events)).toEqual([
      { category: 'live', count: 2 },
      { category: 'media', count: 1 },
    ])
  })

  it('resolves agenda and planner summary labels from prepared counts', () => {
    expect(
      resolveScheduleNextHighlightLabel({
        event: events[2],
        emptyLabel: 'No upcoming',
        dateLabel: 'May 6',
      })
    ).toBe('May 6 · Live 2')
    expect(
      resolveScheduleNextHighlightLabel({
        event: null,
        emptyLabel: 'No upcoming',
        dateLabel: '',
      })
    ).toBe('No upcoming')
    expect(
      resolveScheduleAgendaSummaryLabel({
        todayCount: 2,
        upcomingCount: 4,
        eventsCountLabel: 'events',
        activeCategoryLabel: 'Live',
        nextHighlightLabel: 'May 6 · Live 2',
        noUpcomingLabel: 'No upcoming',
      })
    ).toBe('2 events · Live')
    expect(
      resolveScheduleAgendaSummaryLabel({
        todayCount: 0,
        upcomingCount: 4,
        eventsCountLabel: 'events',
        activeCategoryLabel: 'Live',
        nextHighlightLabel: 'May 6 · Live 2',
        noUpcomingLabel: 'No upcoming',
      })
    ).toBe('4 events · May 6 · Live 2')
    expect(
      resolveScheduleAgendaSummaryLabel({
        todayCount: 0,
        upcomingCount: 0,
        eventsCountLabel: 'events',
        activeCategoryLabel: 'Live',
        nextHighlightLabel: 'May 6 · Live 2',
        noUpcomingLabel: 'No upcoming',
      })
    ).toBe('No upcoming')

    expect(
      resolveSchedulePlannerSummaryLabel({
        view: 'month',
        monthLabel: 'May 2026',
        activeCategoryLabel: 'All',
        selectedDayLabel: null,
        selectedDayEventCount: 0,
        eventsCountLabel: 'events',
        noEventsLabel: 'No events',
        plannerPeriodLabel: 'May 3 - May 9',
      })
    ).toBe('May 2026 · All')
    expect(
      resolveSchedulePlannerSummaryLabel({
        view: 'week',
        monthLabel: 'May 2026',
        activeCategoryLabel: 'All',
        selectedDayLabel: 'May 3',
        selectedDayEventCount: 2,
        eventsCountLabel: 'events',
        noEventsLabel: 'No events',
        plannerPeriodLabel: 'May 3 - May 9',
      })
    ).toBe('May 3 · 2 events')
    expect(
      resolveSchedulePlannerSummaryLabel({
        view: 'day',
        monthLabel: 'May 2026',
        activeCategoryLabel: 'All',
        selectedDayLabel: 'May 4',
        selectedDayEventCount: 0,
        eventsCountLabel: 'events',
        noEventsLabel: 'No events',
        plannerPeriodLabel: 'May 3 - May 9',
      })
    ).toBe('May 4 · No events')
  })

  it('resolves agenda card title and meta fallback labels', () => {
    const formatEvent = (start: string, allDay: boolean) => `${start.slice(0, 10)}:${allDay}`

    expect(resolveScheduleEventTitleLabel({ event: events[0], fallbackLabel: 'Empty' })).toBe(
      'Live 1'
    )
    expect(resolveScheduleEventTitleLabel({ event: null, fallbackLabel: 'Empty' })).toBe('Empty')
    expect(
      resolveScheduleEventMetaLabel({
        event: events[0],
        fallbackLabel: 'All',
        formatEvent,
      })
    ).toBe('2026-05-03:false')
    expect(
      resolveScheduleEventMetaLabel({
        event: null,
        fallbackLabel: 'All',
        formatEvent,
      })
    ).toBe('All')
  })

  it('resolves calendar keyboard navigation within rendered cell bounds', () => {
    expect(resolveScheduleCalendarNavigationIndex('ArrowRight', 4, 42)).toBe(5)
    expect(resolveScheduleCalendarNavigationIndex('ArrowLeft', 0, 42)).toBe(0)
    expect(resolveScheduleCalendarNavigationIndex('ArrowDown', 38, 42)).toBe(41)
    expect(resolveScheduleCalendarNavigationIndex('ArrowUp', 3, 42)).toBe(0)
    expect(resolveScheduleCalendarNavigationIndex('Enter', 3, 42)).toBeNull()
  })

  it('resolves horizontal month swipe direction with threshold protection', () => {
    expect(resolveScheduleMonthSwipeDirection(-80, 10)).toBe('next')
    expect(resolveScheduleMonthSwipeDirection(80, 10)).toBe('previous')
    expect(resolveScheduleMonthSwipeDirection(60, 0)).toBeNull()
    expect(resolveScheduleMonthSwipeDirection(80, 60)).toBeNull()
  })

  it('resolves planner step targets and month transitions', () => {
    expect(
      formatCalendarDateKey(
        resolveSchedulePlannerStepTarget('week', 1, new Date(2026, 4, 3)) as Date
      )
    ).toBe('2026-05-10')
    expect(
      formatCalendarDateKey(
        resolveSchedulePlannerStepTarget('day', -1, new Date(2026, 4, 3)) as Date
      )
    ).toBe('2026-05-02')
    expect(resolveSchedulePlannerStepTarget('month', 1, new Date(2026, 4, 3))).toBeNull()

    expect(
      resolveScheduleDateJumpValue({
        view: 'month',
        year: 2026,
        month: 4,
        anchor: new Date(2026, 4, 20),
      })
    ).toBe('2026-05-01')
    expect(
      resolveScheduleDateJumpValue({
        view: 'week',
        year: 2026,
        month: 4,
        anchor: new Date(2026, 4, 20),
      })
    ).toBe('2026-05-20')

    expect(resolveScheduleMonthStep(2026, 0, -1)).toEqual({
      year: 2025,
      month: 11,
      transition: 'month-slide-right',
    })
    expect(resolveScheduleMonthStep(2026, 11, 1)).toEqual({
      year: 2027,
      month: 0,
      transition: 'month-slide-left',
    })
  })

  it('parses schedule date jump input values', () => {
    expect(formatCalendarDateKey(parseScheduleDateJumpValue('2026-05-20') as Date)).toBe(
      '2026-05-20'
    )
    expect(parseScheduleDateJumpValue('')).toBeNull()
    expect(parseScheduleDateJumpValue(undefined)).toBeNull()
    expect(parseScheduleDateJumpValue('not-a-date')).toBeNull()
  })

  it('resolves agenda jump target dates with invalid-event protection', () => {
    expect(
      formatCalendarDateKey(
        resolveScheduleAgendaJumpTargetDate({
          target: 'today',
          now: new Date(2026, 4, 3),
        }) as Date
      )
    ).toBe('2026-05-03')
    expect(
      formatCalendarDateKey(
        resolveScheduleAgendaJumpTargetDate({
          target: 'next',
          upcomingEvent: events[2],
        }) as Date
      )
    ).toBe('2026-05-06')
    expect(resolveScheduleAgendaJumpTargetDate({ target: 'next', upcomingEvent: null })).toBeNull()
    expect(
      resolveScheduleAgendaJumpTargetDate({
        target: 'next',
        upcomingEvent: { start: 'not-a-date' },
      })
    ).toBeNull()
  })

  it('builds calendar day aria labels from locale and event count inputs', () => {
    const byDate = buildEventsByDate(events)
    const dayWithEvents = buildCalendarDay({
      date: new Date(2026, 4, 3),
      currentMonth: 4,
      eventsByDate: byDate,
      today: new Date(2026, 4, 3),
    })
    const emptyDay = buildCalendarDay({
      date: new Date(2026, 4, 4),
      currentMonth: 4,
      eventsByDate: byDate,
      today: new Date(2026, 4, 3),
    })

    expect(
      resolveScheduleDayAriaLabel({
        day: dayWithEvents,
        locale: 'en',
        eventsCountLabel: 'events',
      })
    ).toBe('May 3, 2 events')
    expect(
      resolveScheduleDayAriaLabel({
        day: emptyDay,
        locale: 'en',
        eventsCountLabel: 'events',
      })
    ).toBe('May 4')
  })

  it('resolves today transition direction against current calendar month', () => {
    const today = new Date(2026, 4, 3)
    expect(resolveScheduleTodayTransition(2026, 5, today)).toBe('month-slide-right')
    expect(resolveScheduleTodayTransition(2026, 3, today)).toBe('month-slide-left')
  })

  it('formats all-day and timed event labels', () => {
    expect(
      formatEventDateTimeLabel({
        dateStr: '2026-05-03T10:00:00.000Z',
        allDay: true,
        locale: 'en',
        allDayLabel: 'All day',
      })
    ).toContain('All day')
    expect(
      formatEventDateTimeLabel({
        dateStr: '2026-05-03T10:00:00',
        allDay: false,
        locale: 'en',
        allDayLabel: 'All day',
      })
    ).toContain('10:00')
  })

  it('resolves schedule detail content helpers', () => {
    expect(hasScheduleDetailLinks(null)).toBe(false)
    expect(hasScheduleDetailLinks({ event_url: 'https://example.com' } as never)).toBe(true)
    expect(
      resolveScheduleDetailLead({ description: '<br>&nbsp;Opening line<br>Second line' })
    ).toBe('Opening line')
    expect(
      resolveScheduleDetailHostLabel({
        author: { display_name: 'Host', username: 'host' },
        source_platform: 'YouTube',
      } as never)
    ).toBe('Host · YouTube')
    expect(
      resolveScheduleDetailHostLabel({
        author: { display_name: '', username: 'host' },
        source_platform: '',
      } as never)
    ).toBe('host')
    expect(isSameScheduleDate('2026-05-03T10:00:00Z', '2026-05-03T12:00:00Z')).toBe(true)
    expect(isSameScheduleDate('2026-05-03T10:00:00Z', '2026-05-04T10:00:00Z')).toBe(false)
  })

  it('resolves schedule detail recovery sources from failure state', () => {
    expect(
      resolveScheduleDetailRecoverySource({
        serviceUnavailable: true,
        notFound: false,
        hasCachedDetail: true,
        hasFallbackDetail: true,
      })
    ).toBe('cached')

    expect(
      resolveScheduleDetailRecoverySource({
        serviceUnavailable: true,
        notFound: false,
        hasCachedDetail: false,
        hasFallbackDetail: true,
      })
    ).toBe('fallback')

    expect(
      resolveScheduleDetailRecoverySource({
        serviceUnavailable: true,
        notFound: true,
        hasCachedDetail: false,
        hasFallbackDetail: false,
      })
    ).toBe('not-found')

    expect(
      resolveScheduleDetailRecoverySource({
        serviceUnavailable: false,
        notFound: false,
        hasCachedDetail: true,
        hasFallbackDetail: true,
      })
    ).toBe('error')
  })

  it('resolves schedule detail share permalink, capability, and payload', () => {
    expect(
      resolveScheduleDetailPermalink({
        href: '/schedule/event-1',
        origin: 'https://hmr.example',
      })
    ).toBe('https://hmr.example/schedule/event-1')
    expect(resolveScheduleDetailPermalink({ href: '/schedule/event-1', origin: null })).toBe(
      '/schedule/event-1'
    )

    expect(
      canShareScheduleDetail({
        hasDetail: true,
        permalink: 'https://hmr.example/schedule/event-1',
        shareAvailable: true,
      })
    ).toBe(true)
    expect(
      canShareScheduleDetail({
        hasDetail: true,
        permalink: '',
        shareAvailable: true,
      })
    ).toBe(false)

    expect(
      buildScheduleDetailSharePayload({
        title: 'Live',
        lead: '',
        venue: 'Tokyo',
        url: 'https://hmr.example/schedule/event-1',
      })
    ).toEqual({
      title: 'Live',
      text: 'Tokyo',
      url: 'https://hmr.example/schedule/event-1',
    })
  })

  it('parses and linkifies schedule descriptions without leaking raw markup', () => {
    expect(normalizeScheduleDetailHtml('A<br>B&nbsp;C')).toBe('A\nB C')
    expect(parseScheduleDescription('Intro<br>Line▼Details<br>https://example.com')).toEqual([
      { heading: null, lines: ['Intro', 'Line'] },
      { heading: 'Details', lines: ['https://example.com'] },
    ])
    expect(linkifyScheduleDescriptionLine('Open <tag> & https://example.com')).toBe(
      'Open &lt;tag&gt; &amp; <a href="https://example.com" target="_blank" rel="noopener noreferrer" class="desc-link">https://example.com</a>'
    )
  })
})
