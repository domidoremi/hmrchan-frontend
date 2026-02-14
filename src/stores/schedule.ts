/**
 * Schedule Store - 日程状态管理
 *
 * 追踪用户上次查看日程的时间，与最新日程对比生成未读标识
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { scheduleService, type ScheduleCalendarItem } from '@/api/scheduleService'

export const useScheduleStore = defineStore(
  'schedule',
  () => {
    /** 用户上次访问日程页的时间戳 */
    const lastVisitedAt = ref<string | null>(null)

    /** 最新日程的创建/更新时间 */
    const latestEventTime = ref<string | null>(null)

    /** 是否有新日程（未读标识） */
    const hasNew = computed(() => {
      if (!lastVisitedAt.value || !latestEventTime.value) return false
      return new Date(latestEventTime.value) > new Date(lastVisitedAt.value)
    })

    /** 标记已访问 */
    function markVisited() {
      lastVisitedAt.value = new Date().toISOString()
    }

    /** 检查是否有新日程（轻量级，仅取最近1条） */
    /** API 是否可用（避免重复请求不存在的接口） */
    let apiAvailable = true

    /** 检查是否有新日程（轻量级，仅取最近1条） */
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
        // 404 表示后端尚未部署，标记不可用避免重复请求
        if (err instanceof Error && 'status' in err && (err as { status: number }).status === 404) {
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
