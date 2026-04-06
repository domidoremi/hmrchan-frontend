/**
 * Report Service - 举报服务
 *
 * 提供内容举报相关的 API 调用
 * 合约端点: /reports
 */

import { apiClient, type CursorCollectionResponse, type RequestConfig } from './client'

// ========== 类型定义 ==========

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

// ========== 举报服务 ==========

export const reportService = {
  /**
   * 提交举报（需认证）
   */
  async create(data: CreateReportRequest): Promise<ReportItem> {
    return apiClient.post<ReportItem>('/reports', data, {
      skipErrorToast: true,
    })
  },

  /**
   * 获取我的举报记录（需认证）
   */
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
