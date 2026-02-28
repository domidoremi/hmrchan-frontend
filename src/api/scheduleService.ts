/**
 * Schedule Service - 日程/活动 API
 */

import { apiClient, type PaginatedApiResponse } from './client'

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
  page?: number
  page_size?: number
  category?: ScheduleCategory
  start?: string
  end?: string
  published_only?: boolean
}

export interface ScheduleCreateRequest {
  title: string
  description?: string | null
  category?: ScheduleCategory
  start_date: string
  end_date?: string | null
  is_all_day?: boolean
  venue?: string | null
  venue_address?: string | null
  event_url?: string | null
  ticket_url?: string | null
  author_id?: number | null
  source_url?: string | null
  source_platform?: string | null
  color?: string | null
  is_published?: boolean
}

// ========== 日程服务 ==========

export const scheduleService = {
  /**
   * 获取日程列表（分页）
   */
  async list(params: ListSchedulesParams = {}): Promise<PaginatedApiResponse<ScheduleResponse>> {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.page_size) query.set('page_size', String(params.page_size))
    if (params.category) query.set('category', params.category)
    if (params.start) query.set('start', params.start)
    if (params.end) query.set('end', params.end)
    if (params.published_only !== undefined)
      query.set('published_only', String(params.published_only))

    const qs = query.toString()
    return apiClient.get<PaginatedApiResponse<ScheduleResponse>>(
      `/schedules${qs ? `?${qs}` : ''}`,
      { skipAuth: true }
    )
  },

  /**
   * 获取日历格式事件列表（FullCalendar 兼容）
   */
  async calendar(
    params: {
      start?: string
      end?: string
      category?: ScheduleCategory
    } = {}
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
      skipAuth: true,
      skipErrorToast: true,
    })
  },

  /**
   * 获取日程详情
   */
  async getById(scheduleId: string): Promise<ScheduleResponse> {
    return apiClient.get<ScheduleResponse>(`/schedules/${scheduleId}`, { skipAuth: true })
  },

  /**
   * 创建日程（管理员）
   */
  async create(data: ScheduleCreateRequest): Promise<ScheduleResponse> {
    return apiClient.post<ScheduleResponse>('/schedules', data)
  },

  /**
   * 删除日程（管理员）
   */
  async delete(scheduleId: string): Promise<void> {
    return apiClient.delete(`/schedules/${scheduleId}`)
  },
}
