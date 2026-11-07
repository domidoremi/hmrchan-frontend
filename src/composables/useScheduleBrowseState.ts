import { computed, nextTick, ref, watch, type ComputedRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { CalendarDay } from '@/views/schedule/schedulePageModel'
import { readScheduleState } from '@/utils/browseState'

export function useScheduleBrowseState() {
  const route = useRoute()
  const router = useRouter()
  const initial = readScheduleState(route.query)
  const currentYear = ref(initial.year)
  const currentMonth = ref(initial.month)
  const activeCategory = ref(initial.category)
  const selectedDay = ref<CalendarDay | null>(null)
  const plannerView = ref(initial.view)

  function connectCalendar(
    buildDay: (date: Date) => CalendarDay,
    calendarDays: ComputedRef<CalendarDay[]>
  ) {
    if (initial.date) selectedDay.value = buildDay(initial.date)
    let restoring = false
    const isScheduleRoute = () => route.name === 'schedule' || route.name === 'schedule-detail'
    watch(
      () => route.fullPath,
      () => {
        if (!isScheduleRoute()) return
        const state = readScheduleState(route.query)
        restoring = true
        currentYear.value = state.year
        currentMonth.value = state.month
        activeCategory.value = state.category
        plannerView.value = state.view
        selectedDay.value = state.date ? buildDay(state.date) : null
        void nextTick(() => {
          restoring = false
        })
      }
    )
    watch(
      [currentYear, currentMonth, activeCategory, plannerView, () => selectedDay.value?.key],
      () => {
        if (restoring || !isScheduleRoute()) return
        void router.replace({
          query: {
            ...route.query,
            month: `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}`,
            date: selectedDay.value?.key,
            view: plannerView.value,
            category: activeCategory.value === 'all' ? undefined : activeCategory.value,
          },
        })
      }
    )
    return computed(
      () =>
        calendarDays.value.find((day) => day.key === selectedDay.value?.key)?.key ??
        calendarDays.value.find((day) => day.isToday)?.key ??
        calendarDays.value.find((day) => day.currentMonth)?.key
    )
  }

  return { currentYear, currentMonth, activeCategory, selectedDay, plannerView, connectCalendar }
}
