import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { journalDateLabel } from '../localizedDate'
import type { JournalEvent } from '../models'
export interface CalendarProps {
  events: JournalEvent[]
  month: string
  selectedDay: string
  reminders: Set<string>
  savedOnly: boolean
  loading: boolean
  view: string
}
export function useCalendar(props: CalendarProps, change: (key: string, value: string) => void) {
  const { locale, t } = useI18n({ useScope: 'global' })
  const year = computed(() => Number(props.month.slice(0, 4)))
  const number = computed(() => Number(props.month.slice(5)))
  const days = computed(() => new Date(year.value, number.value, 0).getDate())
  const offset = computed(() => (new Date(year.value, number.value - 1, 1).getDay() + 6) % 7)
  const currentEvents = computed(() =>
    props.events.filter((item) => !props.savedOnly || props.reminders.has(item.id))
  )
  const visible = computed(() =>
    currentEvents.value.filter(
      (item) => props.selectedDay === 'all' || item.day === Number(props.selectedDay)
    )
  )
  const groups = computed(() =>
    [...new Set(visible.value.map((item) => item.day))]
      .sort((a, b) => a - b)
      .map((day) => ({ day, events: visible.value.filter((item) => item.day === day) }))
  )
  const date = (day: number) => new Date(Date.UTC(year.value, number.value - 1, day, 4))
  const monthName = computed(() =>
    new Intl.DateTimeFormat(locale.value, { month: 'long', timeZone: 'Asia/Taipei' }).format(
      date(1)
    )
  )
  const weekdayFormatter = computed(
    () => new Intl.DateTimeFormat(locale.value, { weekday: 'short', timeZone: 'Asia/Taipei' })
  )
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei' }).format(new Date())
  const isToday = (day: number) => props.month + '-' + String(day).padStart(2, '0') === today
  const dayEvents = (day: number) => currentEvents.value.filter((item) => item.day === day)
  const weekday = (day: number) => weekdayFormatter.value.format(date(day))
  const weekdays = computed(() =>
    Array.from({ length: 7 }, (_, index) => weekday(1 + ((7 - offset.value) % 7) + index))
  )
  const dayLabel = (day: number) =>
    t('journal.calendar.dayLabel', {
      date: journalDateLabel(`${props.month}-${String(day).padStart(2, '0')}`, locale.value),
      count: dayEvents(day).length,
    })
  function stepMonth(delta: number) {
    const next = new Date(year.value, number.value - 1 + delta, 1)
    change('month', next.getFullYear() + '-' + String(next.getMonth() + 1).padStart(2, '0'))
  }
  return {
    year,
    number,
    days,
    offset,
    visible,
    groups,
    monthName,
    isToday,
    dayEvents,
    weekday,
    weekdays,
    dayLabel,
    stepMonth,
  }
}
