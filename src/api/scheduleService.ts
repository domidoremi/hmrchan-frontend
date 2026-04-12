/**
 * Schedule Service - 日程/活动 API
 */

import { apiClient, type CursorCollectionResponse, type RequestConfig } from './client'

const SCHEDULE_API_ENABLED = import.meta.env.VITE_ENABLE_SCHEDULE_API !== 'false'

// ========== 类型定义 ==========

export type ScheduleCategory = 'live' | 'media' | 'birth' | 'other'

export interface ScheduleResponse {
  id: string
  title: string
  description?: string | null
  category: ScheduleCategory
  start_date: string
  end_date?: string | null
  is_all_day: boolean
  venue?: string | null
  venue_address?: string | null
  event_url?: string | null
  ticket_url?: string | null
  author?: {
    id: string
    username?: string
    display_name?: string
    avatar_url?: string | null
  } | null
  source_url?: string | null
  source_platform?: string | null
  color?: string | null
  is_published: boolean
  created_at: string
  updated_at?: string | null
  // 兼容旧字段
  uuid?: string
  author_id?: number | null
}

export interface ScheduleCalendarItem {
  id: string
  title: string
  start: string
  end?: string | null
  allDay: boolean
  category: ScheduleCategory
  color?: string | null
  url?: string | null
  venue?: string | null
  description?: string | null
}

export interface ListSchedulesParams {
  limit?: number
  cursor?: string | null
  category?: ScheduleCategory
  start?: string
  end?: string
  published_only?: boolean
}

// ========== 日程服务 ==========

export const scheduleService = {
  /**
   * 获取日程列表（分页）
   */
  async list(
    params: ListSchedulesParams = {},
    config?: RequestConfig
  ): Promise<CursorCollectionResponse<ScheduleResponse>> {
    const query = new URLSearchParams()
    if (params.limit) query.set('limit', String(params.limit))
    if (params.cursor) query.set('cursor', params.cursor)
    if (params.category) query.set('category', params.category)
    if (params.start) query.set('start', params.start)
    if (params.end) query.set('end', params.end)
    if (params.published_only !== undefined)
      query.set('published_only', String(params.published_only))

    const qs = query.toString()
    const response = await apiClient.get<CursorCollectionResponse<ScheduleResponse>>(
      `/schedules${qs ? `?${qs}` : ''}`,
      config
    )
    return {
      ...response,
      items: response.items ?? [],
      next_cursor: response.next_cursor ?? null,
      has_more: Boolean(response.has_more),
    }
  },

  /**
   * 获取日历格式事件列表（FullCalendar 兼容）
   */
  async calendar(
    params: {
      start?: string
      end?: string
      category?: ScheduleCategory
    } = {},
    config?: RequestConfig
  ): Promise<ScheduleCalendarItem[]> {
    if (!SCHEDULE_API_ENABLED) {
      return []
    }

    const query = new URLSearchParams()
    if (params.start) query.set('start', params.start)
    if (params.end) query.set('end', params.end)
    if (params.category) query.set('category', params.category)

    const qs = query.toString()
    return apiClient.get<ScheduleCalendarItem[]>(`/schedules/calendar${qs ? `?${qs}` : ''}`, {
      ...config,
      skipErrorToast: config?.skipErrorToast ?? true,
    })
  },

  /**
   * 获取日程详情
   */
  async getById(scheduleId: string, config?: RequestConfig): Promise<ScheduleResponse> {
    return apiClient.get<ScheduleResponse>(`/schedules/${scheduleId}`, {
      ...config,
      skipErrorToast: config?.skipErrorToast ?? true,
    })
  },
}
