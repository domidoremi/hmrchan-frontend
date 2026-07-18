import type {
  ScheduleCalendarItem,
  ScheduleCategory,
  ScheduleResponse,
} from '@/api/scheduleService'
import { STATIC_SCHEDULE_DETAILS, STATIC_SCHEDULE_EVENTS } from './generated/publicSnapshots'
import { clonePublicSnapshot, createPublicFallbackId, daysAgo } from './publicPageFallback'

export const SCHEDULE_FALLBACK_DETAILS: ScheduleResponse[] =
  clonePublicSnapshot(STATIC_SCHEDULE_DETAILS)
export const SCHEDULE_FALLBACK_EVENTS: ScheduleCalendarItem[] =
  clonePublicSnapshot(STATIC_SCHEDULE_EVENTS)

interface RuntimeScheduleTemplate {
  key: string
  title: string
  description: string
  category: ScheduleCategory
  dayOffset: number
  hour: number
  durationMinutes: number
  allDay?: boolean
  color: string
  venue?: string
}

const RUNTIME_SCHEDULE_TEMPLATES: RuntimeScheduleTemplate[] = [
  {
    key: 'official-evening-live',
    title: '公式チャンネルの夜配信',
    description: '籾山ひめりと高嶺のなでしこの近況を、みんなでゆっくり楽しむ配信です。',
    category: 'live',
    dayOffset: 2,
    hour: 19,
    durationMinutes: 75,
    color: '#f3c5d7',
  },
  {
    key: 'weekly-media-letter',
    title: '新しいお知らせとメディア便り',
    description: '今週公開された記事や映像を、ひとつの手帳にまとめました。',
    category: 'media',
    dayOffset: 3,
    hour: 20,
    durationMinutes: 60,
    color: '#c9e8f3',
  },
  {
    key: 'memory-anniversary',
    title: '一緒にお祝いしたい記念日',
    description: 'これまでの思い出を振り返りながら、やさしい言葉を贈る一日です。',
    category: 'birth',
    dayOffset: 4,
    hour: 0,
    durationMinutes: 24 * 60,
    allDay: true,
    color: '#f8e6ad',
  },
  {
    key: 'weekend-stage',
    title: '週末のステージ',
    description: '会場で出会える時間と、応援の気持ちを一緒に準備しましょう。',
    category: 'other',
    dayOffset: 5,
    hour: 17,
    durationMinutes: 120,
    color: '#ddd2f3',
    venue: 'イベント会場',
  },
  {
    key: 'after-stage-talk',
    title: 'ステージ後のゆるやかトーク',
    description: '公演の余韻や好きだった場面を、ファンのみんなと分かち合う配信です。',
    category: 'live',
    dayOffset: 6,
    hour: 21,
    durationMinutes: 60,
    color: '#f3c5d7',
  },
]

const runtimeScheduleDetails = new Map<string, ScheduleResponse>()

function parseRangeBoundary(value: string | undefined): number | null {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

function resolveProjectionAnchor(start?: string, end?: string): Date {
  const startTime = parseRangeBoundary(start)
  const endTime = parseRangeBoundary(end)
  const now = Date.now()

  if ((startTime === null || now >= startTime) && (endTime === null || now <= endTime)) {
    return new Date(now)
  }

  if (startTime !== null && endTime !== null && endTime >= startTime) {
    return new Date(startTime + (endTime - startTime) / 2)
  }

  return new Date(startTime ?? endTime ?? now)
}

function startOfLocalWeek(value: Date): Date {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate())
  const mondayOffset = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - mondayOffset)
  return date
}

function buildRuntimeScheduleCalendar(start?: string, end?: string): ScheduleCalendarItem[] {
  const weekStart = startOfLocalWeek(resolveProjectionAnchor(start, end))

  return RUNTIME_SCHEDULE_TEMPLATES.map((template) => {
    const eventStart = new Date(weekStart)
    eventStart.setDate(weekStart.getDate() + template.dayOffset)
    eventStart.setHours(template.hour, 0, 0, 0)

    const eventEnd = new Date(eventStart.getTime() + template.durationMinutes * 60 * 1000)
    const dateKey = [
      eventStart.getFullYear(),
      String(eventStart.getMonth() + 1).padStart(2, '0'),
      String(eventStart.getDate()).padStart(2, '0'),
    ].join('-')
    const id = createPublicFallbackId('schedule', `${template.key}-${dateKey}`)
    const item: ScheduleCalendarItem = {
      id,
      title: template.title,
      start: eventStart.toISOString(),
      end: eventEnd.toISOString(),
      allDay: Boolean(template.allDay),
      category: template.category,
      color: template.color,
      venue: template.venue ?? null,
      description: template.description,
    }

    runtimeScheduleDetails.set(id, {
      id,
      title: template.title,
      description: template.description,
      category: template.category,
      start_date: item.start,
      end_date: item.end ?? null,
      is_all_day: item.allDay,
      venue: item.venue ?? null,
      venue_address: null,
      event_url: null,
      ticket_url: null,
      author: null,
      source_url: null,
      source_platform: 'Momichan',
      color: item.color ?? null,
      is_published: true,
      created_at: daysAgo(7),
      updated_at: daysAgo(1),
    })

    return item
  })
}

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
  const sourceItems =
    SCHEDULE_FALLBACK_EVENTS.length > 0
      ? SCHEDULE_FALLBACK_EVENTS
      : buildRuntimeScheduleCalendar(params.start, params.end)

  return sourceItems
    .filter((item) => {
      if (params.category && item.category !== params.category) return false
      return overlapsRange(item, params.start, params.end)
    })
    .sort((left, right) => {
      const leftTime = Date.parse(left.start) || 0
      const rightTime = Date.parse(right.start) || 0
      return leftTime - rightTime
    })
}

export function getFallbackScheduleById(scheduleId: string): ScheduleResponse | null {
  const staticDetail = SCHEDULE_FALLBACK_DETAILS.find((item) => item.id === scheduleId)
  if (staticDetail) return staticDetail

  if (!runtimeScheduleDetails.has(scheduleId)) {
    buildRuntimeScheduleCalendar()
  }

  return runtimeScheduleDetails.get(scheduleId) ?? null
}
