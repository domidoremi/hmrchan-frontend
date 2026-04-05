import type {
  ScheduleCalendarItem,
  ScheduleCategory,
  ScheduleResponse,
} from '@/api/scheduleService'
import { STATIC_SCHEDULE_DETAILS, STATIC_SCHEDULE_EVENTS } from './generated/publicSnapshots'
import { clonePublicSnapshot } from './publicPageFallback'

export const SCHEDULE_FALLBACK_DETAILS: ScheduleResponse[] =
  clonePublicSnapshot(STATIC_SCHEDULE_DETAILS)
export const SCHEDULE_FALLBACK_EVENTS: ScheduleCalendarItem[] =
  clonePublicSnapshot(STATIC_SCHEDULE_EVENTS)

function overlapsRange(item: ScheduleCalendarItem, start?: string, end?: string): boolean {
  const rangeStart = start ? Date.parse(start) : Number.NEGATIVE_INFINITY
  const rangeEnd = end ? Date.parse(end) : Number.POSITIVE_INFINITY
  const itemStart = Date.parse(item.start)
  const itemEnd = Date.parse(item.end ?? item.start)

  return itemEnd >= rangeStart && itemStart <= rangeEnd
}

export function getFallbackScheduleCalendar(
  params: {
    start?: string
    end?: string
    category?: ScheduleCategory
  } = {}
): ScheduleCalendarItem[] {
  return SCHEDULE_FALLBACK_EVENTS.filter((item) => {
    if (params.category && item.category !== params.category) return false
    return overlapsRange(item, params.start, params.end)
  }).sort((left, right) => {
    const leftTime = Date.parse(left.start) || 0
    const rightTime = Date.parse(right.start) || 0
    return leftTime - rightTime
  })
}

export function getFallbackScheduleById(scheduleId: string): ScheduleResponse | null {
  return SCHEDULE_FALLBACK_DETAILS.find((item) => item.id === scheduleId) ?? null
}
