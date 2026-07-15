import { computed, ref, watch, type Ref } from 'vue'

import type { HmrScheduleContent } from '@/api/hmrContent'
import type { HmrScheduleItem, HmrScheduleViewMode } from '@/hmr/types'

export type HmrScheduleFilter = 'all' | 'today' | HmrScheduleViewMode | 'performance'

export interface HmrScheduleEvent extends HmrScheduleItem {
  dateKey: string
  dayLabel: string
  weekday: string
  timeLabel: string
  isPerformance: boolean
}

interface HmrScheduleDayOption {
  key: string
  label: string
  weekday: string
  day: string
  count: number
}

interface HmrScheduleMonthDay {
  key: string
  day: string
  isToday: boolean
  inMonth: boolean
  count: number
}

interface HmrScheduleBoardOptions {
  locale: Ref<string>
  t: (key: string) => string
  now?: () => Date
}

function currentDate(options: HmrScheduleBoardOptions): Date {
  return options.now?.() ?? new Date()
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatMonthKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function useHmrScheduleBoard(
  content: Ref<HmrScheduleContent>,
  options: HmrScheduleBoardOptions
) {
  const activeFilter = ref<HmrScheduleFilter>('all')
  const selectedDayKey = ref(formatDateKey(currentDate(options)))
  const selectedMonth = ref(startOfMonth(currentDate(options)))

  function formatDayLabel(date: Date): string {
    return new Intl.DateTimeFormat(options.locale.value, {
      month: 'long',
      day: 'numeric',
    }).format(date)
  }

  function formatWeekday(date: Date): string {
    return new Intl.DateTimeFormat(options.locale.value, { weekday: 'short' }).format(date)
  }

  function formatTimeLabel(raw: string, date: Date): string {
    const timeMatch = raw.match(/(\d{1,2}):(\d{2})/)
    if (timeMatch) return `${timeMatch[1]?.padStart(2, '0')}:${timeMatch[2]}`
    return new Intl.DateTimeFormat(options.locale.value, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  }

  function formatMonthLabel(date: Date): string {
    return new Intl.DateTimeFormat(options.locale.value, {
      year: 'numeric',
      month: 'long',
    }).format(date)
  }

  function resolveEventDate(item: HmrScheduleItem, index: number): Date {
    const raw = item.time.trim()
    const parsed = new Date(raw)
    const hasDate = /\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}/.test(raw)

    if (hasDate && Number.isFinite(parsed.getTime())) return parsed

    const date = new Date(currentDate(options))
    date.setDate(date.getDate() + Math.floor(index / 2))
    const timeMatch = raw.match(/(\d{1,2}):(\d{2})/)
    if (timeMatch) {
      date.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0)
    }
    return date
  }

  function normalizeScheduleEvent(item: HmrScheduleItem, index: number): HmrScheduleEvent {
    const date = resolveEventDate(item, index)
    const searchable = `${item.phase} ${item.title} ${item.description}`.toLowerCase()

    return {
      ...item,
      dateKey: formatDateKey(date),
      dayLabel: formatDayLabel(date),
      weekday: formatWeekday(date),
      timeLabel: formatTimeLabel(item.time, date),
      isPerformance: /演出|直播|live|show|stage|performance|发布/.test(searchable),
    }
  }

  function makeDayWindow(
    startDate: Date,
    days: number
  ): Array<Omit<HmrScheduleDayOption, 'count'>> {
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + index)
      return {
        key: formatDateKey(date),
        label: formatDayLabel(date),
        weekday: formatWeekday(date),
        day: new Intl.DateTimeFormat(options.locale.value, { day: '2-digit' }).format(date),
      }
    })
  }

  function makeMonthGrid(monthDate: Date): Array<Omit<HmrScheduleMonthDay, 'count'>> {
    const monthStart = startOfMonth(monthDate)
    const gridStart = new Date(monthStart)
    gridStart.setDate(monthStart.getDate() - monthStart.getDay())
    const todayKey = formatDateKey(currentDate(options))

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + index)
      const key = formatDateKey(date)
      return {
        key,
        day: new Intl.DateTimeFormat(options.locale.value, { day: 'numeric' }).format(date),
        isToday: key === todayKey,
        inMonth: date.getMonth() === monthStart.getMonth(),
      }
    })
  }

  const filterOptions = computed<Array<{ id: HmrScheduleFilter; label: string }>>(() => [
    { id: 'all', label: options.t('schedule.all') },
    { id: 'today', label: options.t('schedule.today') },
    { id: 'week', label: options.t('schedule.week') },
    { id: 'month', label: options.t('schedule.month') },
    { id: 'performance', label: options.t('schedule.performance') },
  ])

  const normalizedEvents = computed(() =>
    content.value.items
      .map((item, index) => normalizeScheduleEvent(item, index))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.timeLabel.localeCompare(b.timeLabel))
  )

  const filteredEvents = computed(() => {
    switch (activeFilter.value) {
      case 'today': {
        const todayKey = formatDateKey(currentDate(options))
        return normalizedEvents.value.filter((item) => item.dateKey === todayKey)
      }
      case 'week': {
        const weekKeys = new Set(makeDayWindow(currentDate(options), 7).map((item) => item.key))
        return normalizedEvents.value.filter((item) => weekKeys.has(item.dateKey))
      }
      case 'month': {
        const monthKey = formatMonthKey(selectedMonth.value)
        return normalizedEvents.value.filter((item) => item.dateKey.startsWith(monthKey))
      }
      case 'performance':
        return normalizedEvents.value.filter((item) => item.isPerformance)
      default:
        return normalizedEvents.value
    }
  })

  const eventsByDate = computed(() => {
    const groupedEvents = new Map<string, HmrScheduleEvent[]>()
    for (const event of filteredEvents.value) {
      const events = groupedEvents.get(event.dateKey)
      if (events) {
        events.push(event)
      } else {
        groupedEvents.set(event.dateKey, [event])
      }
    }
    return groupedEvents
  })

  const dayOptions = computed<HmrScheduleDayOption[]>(() =>
    makeDayWindow(currentDate(options), 7).map((day) => ({
      ...day,
      count: eventsByDate.value.get(day.key)?.length ?? 0,
    }))
  )

  const selectedDayEvents = computed(() => eventsByDate.value.get(selectedDayKey.value) ?? [])

  const selectedDay = computed(
    () => dayOptions.value.find((item) => item.key === selectedDayKey.value) ?? dayOptions.value[0]
  )
  const selectedDayLabel = computed(() => selectedDay.value?.label ?? '今天')
  const selectedSummary = computed(
    () =>
      `${selectedDayEvents.value.length} ${options.t('schedule.itemCount')} · ${
        selectedDayEvents.value[0]?.timeLabel ?? options.t('schedule.noItems')
      }`
  )
  const upcomingEvents = computed(() => filteredEvents.value.slice(0, 6))
  const selectedMonthLabel = computed(() => formatMonthLabel(selectedMonth.value))
  const monthDays = computed<HmrScheduleMonthDay[]>(() =>
    makeMonthGrid(selectedMonth.value).map((day) => ({
      ...day,
      count: eventsByDate.value.get(day.key)?.length ?? 0,
    }))
  )
  const populatedDays = computed(() =>
    dayOptions.value.flatMap((day) => {
      const events = eventsByDate.value.get(day.key) ?? []
      return events.length ? [{ ...day, events }] : []
    })
  )

  function setFilter(filter: HmrScheduleFilter): void {
    activeFilter.value = filter
    if (filter === 'today') selectedDayKey.value = formatDateKey(currentDate(options))
    if (filter === 'month') selectedMonth.value = startOfMonth(new Date(selectedDayKey.value))
  }

  function shiftMonth(offset: number): void {
    const nextMonth = new Date(selectedMonth.value)
    nextMonth.setMonth(nextMonth.getMonth() + offset)
    selectedMonth.value = startOfMonth(nextMonth)
    selectedDayKey.value = formatDateKey(selectedMonth.value)
    activeFilter.value = 'month'
  }

  watch(
    dayOptions,
    (days) => {
      if (!days.some((day) => day.key === selectedDayKey.value)) {
        selectedDayKey.value = days[0]?.key ?? formatDateKey(currentDate(options))
      }
    },
    { immediate: true }
  )

  return {
    activeFilter,
    dayOptions,
    filterOptions,
    monthDays,
    normalizedEvents,
    populatedDays,
    selectedDayEvents,
    selectedDayKey,
    selectedDayLabel,
    selectedMonthLabel,
    selectedSummary,
    setFilter,
    shiftMonth,
    upcomingEvents,
  }
}
