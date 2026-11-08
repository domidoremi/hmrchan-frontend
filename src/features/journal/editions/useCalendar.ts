import { computed } from 'vue'
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
  const monthName = computed(() =>
    new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' })
      .format(new Date(props.month + '-01T00:00:00Z'))
      .toUpperCase()
  )
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei' }).format(new Date())
  const isToday = (day: number) => props.month + '-' + String(day).padStart(2, '0') === today
  const dayEvents = (day: number) => currentEvents.value.filter((item) => item.day === day)
  const weekday = (day: number) =>
    ['日', '一', '二', '三', '四', '五', '六'][new Date(year.value, number.value - 1, day).getDay()]
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
    stepMonth,
  }
}
