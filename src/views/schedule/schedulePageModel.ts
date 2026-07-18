import type {
  ScheduleCalendarItem,
  ScheduleCategory,
  ScheduleResponse,
} from '@/api/scheduleService'

export type CalendarDay = {
  key: string
  date: number
  fullDate: Date
  currentMonth: boolean
  isToday: boolean
  events: ScheduleCalendarItem[]
}

export type ScheduleDescriptionSection = {
  heading: string | null
  lines: string[]
}

export type ScheduleCalendarNavigationKey = 'ArrowRight' | 'ArrowLeft' | 'ArrowDown' | 'ArrowUp'

export type ScheduleMonthSwipeDirection = 'next' | 'previous'

export type ScheduleMonthTransitionName = 'month-slide-left' | 'month-slide-right'

export type ScheduleAgendaJumpTarget = 'today' | 'next'

export type ScheduleDetailErrorStatus = 'not-found' | 'error'

export type ScheduleDetailRecoverySource = 'cached' | 'fallback' | ScheduleDetailErrorStatus

export type ScheduleDetailSharePayload = {
  title: string
  text?: string
  url: string
}

export const SCHEDULE_CATEGORY_COLORS: Record<string, string> = {
  live: '#ef4444',
  event: '#10b981',
  release: '#06b6d4',
  media: '#3b82f6',
  birth: '#f59e0b',
  other: '#22c55e',
}

export const DEFAULT_SCHEDULE_CATEGORY_COLOR = '#22c55e'

export function getScheduleCategoryColor(cat: string): string {
  return SCHEDULE_CATEGORY_COLORS[cat] ?? DEFAULT_SCHEDULE_CATEGORY_COLOR
}

export function resolveScheduleWeekdays(lang: string): string[] {
  if (lang === 'ja') return ['日', '月', '火', '水', '木', '金', '土']
  if (lang === 'en') return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return ['日', '一', '二', '三', '四', '五', '六']
}

export function filterScheduleEvents(
  events: ScheduleCalendarItem[],
  activeCategory: ScheduleCategory | 'all'
): ScheduleCalendarItem[] {
  if (activeCategory === 'all') return events
  return events.filter((event) => event.category === activeCategory)
}

export function formatCalendarDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildEventsByDate(
  events: ScheduleCalendarItem[]
): Map<string, ScheduleCalendarItem[]> {
  const map = new Map<string, ScheduleCalendarItem[]>()
  for (const event of events) {
    const parsedStart = new Date(event.start)
    if (Number.isNaN(parsedStart.getTime())) continue
    const dateStr = formatCalendarDateKey(parsedStart)
    const existing = map.get(dateStr)
    if (existing) {
      existing.push(event)
    } else {
      map.set(dateStr, [event])
    }
  }
  return map
}

export function getEventsForDate(
  date: Date,
  eventsByDate: Map<string, ScheduleCalendarItem[]>
): ScheduleCalendarItem[] {
  return eventsByDate.get(formatCalendarDateKey(date)) ?? []
}

export function buildCalendarDay({
  date,
  currentMonth,
  eventsByDate,
  today = new Date(),
}: {
  date: Date
  currentMonth: number
  eventsByDate: Map<string, ScheduleCalendarItem[]>
  today?: Date
}): CalendarDay {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  return {
    key: formatCalendarDateKey(normalized),
    date: normalized.getDate(),
    fullDate: normalized,
    currentMonth: normalized.getMonth() === currentMonth,
    isToday: formatCalendarDateKey(normalized) === formatCalendarDateKey(normalizedToday),
    events: getEventsForDate(normalized, eventsByDate),
  }
}

export function buildCalendarDays({
  year,
  month,
  eventsByDate,
  today = new Date(),
}: {
  year: number
  month: number
  eventsByDate: Map<string, ScheduleCalendarItem[]>
  today?: Date
}): CalendarDay[] {
  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()
  const days: CalendarDay[] = []

  for (let index = startOffset - 1; index >= 0; index--) {
    const day = prevMonthDays - index
    days.push(
      buildCalendarDay({
        date: new Date(year, month - 1, day),
        currentMonth: month,
        eventsByDate,
        today,
      })
    )
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(
      buildCalendarDay({
        date: new Date(year, month, day),
        currentMonth: month,
        eventsByDate,
        today,
      })
    )
  }

  const remaining = 42 - days.length
  for (let day = 1; day <= remaining; day++) {
    days.push(
      buildCalendarDay({
        date: new Date(year, month + 1, day),
        currentMonth: month,
        eventsByDate,
        today,
      })
    )
  }

  return days
}

export function buildWeekDays({
  anchor,
  currentMonth,
  eventsByDate,
  today = new Date(),
}: {
  anchor: Date
  currentMonth: number
  eventsByDate: Map<string, ScheduleCalendarItem[]>
  today?: Date
}): CalendarDay[] {
  const start = new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate() - anchor.getDay()
  )

  return Array.from({ length: 7 }, (_, index) =>
    buildCalendarDay({
      date: new Date(start.getFullYear(), start.getMonth(), start.getDate() + index),
      currentMonth,
      eventsByDate,
      today,
    })
  )
}

export function getUpcomingScheduleEvents(
  events: ScheduleCalendarItem[],
  now = new Date(),
  limit = 10
): ScheduleCalendarItem[] {
  return events
    .filter((event) => new Date(event.start) >= now)
    .sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime())
    .slice(0, limit)
}

export function getTodayScheduleEvents(
  events: ScheduleCalendarItem[],
  today = new Date()
): ScheduleCalendarItem[] {
  const todayKey = formatCalendarDateKey(today)
  return events
    .filter((event) => event.start.slice(0, 10) === todayKey)
    .sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime())
}

export function buildCategoryBreakdown(
  events: ScheduleCalendarItem[],
  limit = 4
): Array<{ category: ScheduleCategory; count: number }> {
  const counts = new Map<ScheduleCategory, number>()
  for (const event of events) {
    counts.set(event.category, (counts.get(event.category) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, limit)
}

export function resolveScheduleNextHighlightLabel({
  event,
  emptyLabel,
  dateLabel,
}: {
  event?: Pick<ScheduleCalendarItem, 'title'> | null
  emptyLabel: string
  dateLabel: string
}): string {
  if (!event) return emptyLabel
  return `${dateLabel} · ${event.title}`
}

export function resolveScheduleAgendaSummaryLabel({
  todayCount,
  upcomingCount,
  eventsCountLabel,
  activeCategoryLabel,
  nextHighlightLabel,
  noUpcomingLabel,
}: {
  todayCount: number
  upcomingCount: number
  eventsCountLabel: string
  activeCategoryLabel: string
  nextHighlightLabel: string
  noUpcomingLabel: string
}): string {
  if (todayCount > 0) {
    return `${todayCount} ${eventsCountLabel} · ${activeCategoryLabel}`
  }
  if (upcomingCount > 0) {
    return `${upcomingCount} ${eventsCountLabel} · ${nextHighlightLabel}`
  }
  return noUpcomingLabel
}

export function resolveSchedulePlannerSummaryLabel({
  view,
  monthLabel,
  activeCategoryLabel,
  selectedDayLabel,
  selectedDayEventCount,
  eventsCountLabel,
  noEventsLabel,
  plannerPeriodLabel,
}: {
  view: 'week' | 'day' | 'month'
  monthLabel: string
  activeCategoryLabel: string
  selectedDayLabel: string | null
  selectedDayEventCount: number
  eventsCountLabel: string
  noEventsLabel: string
  plannerPeriodLabel: string
}): string {
  if (view === 'month') {
    return `${monthLabel} · ${activeCategoryLabel}`
  }
  if (selectedDayLabel) {
    const eventLabel =
      selectedDayEventCount > 0 ? `${selectedDayEventCount} ${eventsCountLabel}` : noEventsLabel
    return `${selectedDayLabel} · ${eventLabel}`
  }
  return plannerPeriodLabel
}

export function resolveScheduleEventTitleLabel({
  event,
  fallbackLabel,
}: {
  event?: Pick<ScheduleCalendarItem, 'title'> | null
  fallbackLabel: string
}): string {
  return event?.title ?? fallbackLabel
}

export function resolveScheduleEventMetaLabel({
  event,
  fallbackLabel,
  formatEvent,
}: {
  event?: Pick<ScheduleCalendarItem, 'start' | 'allDay'> | null
  fallbackLabel: string
  formatEvent: (start: string, allDay: boolean) => string
}): string {
  if (!event) return fallbackLabel
  return formatEvent(event.start, event.allDay)
}

export function resolveScheduleCalendarNavigationIndex(
  key: string,
  currentIndex: number,
  cellCount: number
): number | null {
  if (currentIndex < 0 || currentIndex >= cellCount || cellCount <= 0) return null

  switch (key as ScheduleCalendarNavigationKey) {
    case 'ArrowRight':
      return Math.min(currentIndex + 1, cellCount - 1)
    case 'ArrowLeft':
      return Math.max(currentIndex - 1, 0)
    case 'ArrowDown':
      return Math.min(currentIndex + 7, cellCount - 1)
    case 'ArrowUp':
      return Math.max(currentIndex - 7, 0)
    default:
      return null
  }
}

export function resolveScheduleMonthSwipeDirection(
  deltaX: number,
  deltaY: number,
  minDistance = 60,
  horizontalRatio = 1.5
): ScheduleMonthSwipeDirection | null {
  if (Math.abs(deltaX) <= minDistance) return null
  if (Math.abs(deltaX) <= Math.abs(deltaY) * horizontalRatio) return null
  return deltaX < 0 ? 'next' : 'previous'
}

export function resolveSchedulePlannerStepTarget(
  view: 'week' | 'day' | 'month',
  direction: -1 | 1,
  anchor: Date
): Date | null {
  if (view === 'month') return null

  const offsetDays = view === 'week' ? 7 * direction : direction
  return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + offsetDays)
}

export function resolveScheduleDateJumpValue({
  view,
  year,
  month,
  anchor,
}: {
  view: 'week' | 'day' | 'month'
  year: number
  month: number
  anchor: Date
}): string {
  const target = view === 'month' ? new Date(year, month, 1) : anchor
  return formatCalendarDateKey(target)
}

export function parseScheduleDateJumpValue(value: string | null | undefined): Date | null {
  if (!value) return null

  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function resolveScheduleAgendaJumpTargetDate({
  target,
  upcomingEvent,
  now = new Date(),
}: {
  target: ScheduleAgendaJumpTarget
  upcomingEvent?: Pick<ScheduleCalendarItem, 'start'> | null
  now?: Date
}): Date | null {
  const targetDate = target === 'today' ? now : upcomingEvent ? new Date(upcomingEvent.start) : null
  if (!targetDate || Number.isNaN(targetDate.getTime())) return null

  return targetDate
}

export function resolveScheduleDayAriaLabel({
  day,
  locale,
  eventsCountLabel,
}: {
  day: CalendarDay
  locale: string
  eventsCountLabel: string
}): string {
  const normalizedLocale = locale === 'zh-CN' ? 'zh-CN' : locale
  const dateLabel = day.fullDate.toLocaleDateString(normalizedLocale, {
    month: 'long',
    day: 'numeric',
  })

  if (day.events.length > 0) {
    return `${dateLabel}, ${day.events.length} ${eventsCountLabel}`
  }

  return dateLabel
}

export function resolveScheduleMonthStep(
  year: number,
  month: number,
  direction: -1 | 1
): {
  year: number
  month: number
  transition: ScheduleMonthTransitionName
} {
  const transition = direction > 0 ? 'month-slide-left' : 'month-slide-right'
  const next = new Date(year, month + direction, 1)
  return {
    year: next.getFullYear(),
    month: next.getMonth(),
    transition,
  }
}

export function resolveScheduleTodayTransition(
  currentYear: number,
  currentMonth: number,
  today = new Date()
): ScheduleMonthTransitionName {
  if (today.getMonth() < currentMonth || today.getFullYear() < currentYear) {
    return 'month-slide-right'
  }
  return 'month-slide-left'
}

export function formatEventDateTimeLabel({
  dateStr,
  allDay,
  locale,
  allDayLabel,
}: {
  dateStr: string
  allDay: boolean
  locale: string
  allDayLabel: string
}): string {
  const date = new Date(dateStr)
  const dateLabel = date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })

  if (allDay) {
    return `${dateLabel} · ${allDayLabel}`
  }

  const timeLabel = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  return `${dateLabel} · ${timeLabel}`
}

export function hasScheduleDetailLinks(event: ScheduleResponse | null | undefined): boolean {
  return Boolean(event?.event_url || event?.ticket_url || event?.source_url)
}

export function resolveScheduleDetailRecoverySource({
  serviceUnavailable,
  notFound,
  hasCachedDetail,
  hasFallbackDetail,
}: {
  serviceUnavailable: boolean
  notFound: boolean
  hasCachedDetail: boolean
  hasFallbackDetail: boolean
}): ScheduleDetailRecoverySource {
  if (serviceUnavailable && hasCachedDetail) return 'cached'
  if (serviceUnavailable && hasFallbackDetail) return 'fallback'
  if (notFound) return 'not-found'
  return 'error'
}

export function resolveScheduleDetailPermalink({
  href,
  origin,
}: {
  href: string
  origin?: string | null
}): string {
  if (!origin) return href
  return new URL(href, origin).toString()
}

export function canShareScheduleDetail({
  hasDetail,
  permalink,
  shareAvailable,
}: {
  hasDetail: boolean
  permalink: string
  shareAvailable: boolean
}): boolean {
  return hasDetail && permalink.length > 0 && shareAvailable
}

export function buildScheduleDetailSharePayload({
  title,
  lead,
  venue,
  url,
}: {
  title: string
  lead?: string | null
  venue?: string | null
  url: string
}): ScheduleDetailSharePayload {
  return {
    title,
    text: lead || venue || undefined,
    url,
  }
}

export function normalizeScheduleDetailHtml(text: string): string {
  return text.replace(/<\/?br\s*\/?>/gi, '\n').replace(/&nbsp;/gi, ' ')
}

export function resolveScheduleDetailLead(
  event: Pick<ScheduleResponse, 'description'> | null | undefined
): string {
  if (!event?.description) return ''

  const firstLine = normalizeScheduleDetailHtml(event.description)
    .split(/\n+/)
    .map((line) => line.trim())
    .find(Boolean)

  return firstLine ?? ''
}

export function resolveScheduleDetailHostLabel(
  event: Pick<ScheduleResponse, 'author' | 'source_platform'> | null | undefined
): string {
  if (!event) return ''

  const authorLabel = event.author?.display_name || event.author?.username || ''
  const sourceLabel = event.source_platform || ''

  if (authorLabel && sourceLabel) {
    return `${authorLabel} · ${sourceLabel}`
  }

  return authorLabel || sourceLabel
}

export function parseScheduleDescription(
  description: string | null | undefined
): ScheduleDescriptionSection[] {
  if (!description) return []

  const parts = description.split(/▼/)
  const sections: ScheduleDescriptionSection[] = []

  for (let i = 0; i < parts.length; i++) {
    const raw = normalizeScheduleDetailHtml(parts[i] ?? '').trim()
    if (!raw) continue

    if (i === 0) {
      sections.push({ heading: null, lines: raw.split(/\n/) })
      continue
    }

    const lines = raw.split(/\n/)
    const heading = (lines[0] ?? '').trim()
    const body = lines.slice(1).join('\n').trim()
    sections.push({
      heading: heading || null,
      lines: body ? body.split(/\n/) : [],
    })
  }

  return sections
}

export function linkifyScheduleDescriptionLine(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped.replace(
    /(https?:\/\/[^\s<&]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="desc-link">$1</a>'
  )
}

export function isSameScheduleDate(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10)
}
