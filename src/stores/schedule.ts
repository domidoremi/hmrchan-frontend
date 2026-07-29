import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { scheduleService, type ScheduleCalendarItem } from '@/api/scheduleService'
import { ApiError } from '@/api'
import { isServiceUnavailableError } from '@/fallbacks/publicPageFallback'

export const useScheduleStore = defineStore(
  'schedule',
  () => {
    const lastVisitedAt = ref<string | null>(null)

    const latestEventTime = ref<string | null>(null)

    const hasNew = computed(() => {
      if (!latestEventTime.value) return false
      if (!lastVisitedAt.value) return true
      return new Date(latestEventTime.value) > new Date(lastVisitedAt.value)
    })

    function markVisited() {
      const now = new Date()
      const latest = latestEventTime.value ? new Date(latestEventTime.value) : now
      lastVisitedAt.value = new Date(Math.max(now.getTime(), latest.getTime())).toISOString()
    }

    const scheduleApiEnabled = import.meta.env.VITE_ENABLE_SCHEDULE_API !== 'false'
    let apiAvailable = scheduleApiEnabled

    async function checkForNew() {
      if (!apiAvailable) return
      try {
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const end = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()
        const items: ScheduleCalendarItem[] = await scheduleService.calendar({ start, end })
        if (items.length > 0) {
          const sorted = items
            .map((i) => i.start)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
          latestEventTime.value = sorted[0]
        }
      } catch (err) {
        if ((err instanceof ApiError && err.status === 404) || isServiceUnavailableError(err)) {
          apiAvailable = false
        }
      }
    }

    return { lastVisitedAt, latestEventTime, hasNew, markVisited, checkForNew }
  },
  {
    persist: {
      pick: ['lastVisitedAt'],
    },
  }
)
