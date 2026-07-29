import { apiClient, type CursorCollectionResponse, type RequestConfig } from './client'

export type ReportTargetType = 'post' | 'comment' | 'discussion' | 'discussion_comment' | 'user'

export interface CreateReportRequest {
  target_type: ReportTargetType
  target_id: number | string
  reason: string
  description?: string
}

export interface ReportItem {
  id: string
  target_type: ReportTargetType
  target_id: number | string
  reason: string
  description?: string | null
  status?: 'pending' | 'resolved' | 'rejected' | 'reviewed' | 'dismissed'
  created_at: string
  updated_at?: string | null
}

export const reportService = {
  async create(data: CreateReportRequest): Promise<ReportItem> {
    return apiClient.post<ReportItem>('/reports', data, {
      skipErrorToast: true,
    })
  },

  async getMyReports(
    options: { limit?: number; cursor?: string | null } = {},
    config?: RequestConfig
  ): Promise<CursorCollectionResponse<ReportItem>> {
    const params = new URLSearchParams({
      limit: String(options.limit ?? 20),
    })
    if (options.cursor) params.set('cursor', options.cursor)

    return apiClient.get<CursorCollectionResponse<ReportItem>>(
      `/reports/my?${params.toString()}`,
      config
    )
  },

  async getSummary(config?: RequestConfig): Promise<Record<string, unknown>> {
    return apiClient.get<Record<string, unknown>>('/reports/summary', config)
  },
}
