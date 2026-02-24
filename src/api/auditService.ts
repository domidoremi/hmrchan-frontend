/**
 * Audit Service - 审计日志服务
 *
 * 提供用户活动日志和安全摘要的 API 调用
 * 合约端点: /audit
 */

import { apiClient } from './client'

// ========== 类型定义 ==========

export interface AuditActivityItem {
  id: number
  event_type: string
  event_description?: string | null
  severity: string
  success: boolean
  ip_address?: string | null
  device_type?: string | null
  request_path?: string | null
  created_at: string
}

export interface AuditActivityResponse {
  logs: AuditActivityItem[]
  total: number
}

export interface SecuritySummary {
  total_logins: number
  failed_logins: number
  password_changes: number
  new_devices: number
  security_events: number
  last_login?: string | null
  last_password_change?: string | null
}

export interface SecurityEvent {
  type: string
  description: string
  ip_address?: string | null
  created_at: string
}

export interface MyActivityParams {
  days?: number
  limit?: number
  event_type?: string
}

// ========== 审计服务 ==========

export const auditService = {
  /**
   * 获取我的活动日志（需认证）
   * API: GET /audit/my-activity?days=30&limit=50&event_type=...
   */
  async getMyActivity(params: MyActivityParams = {}): Promise<AuditActivityResponse> {
    const query = new URLSearchParams()
    if (params.days) query.set('days', String(params.days))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.event_type) query.set('event_type', params.event_type)
    const qs = query.toString()
    return apiClient.get<AuditActivityResponse>(`/audit/my-activity${qs ? `?${qs}` : ''}`)
  },

  /**
   * 获取我的安全摘要（需认证）
   * API: GET /audit/my-security-summary?days=30
   */
  async getMySecuritySummary(days = 30): Promise<SecuritySummary> {
    return apiClient.get<SecuritySummary>(`/audit/my-security-summary?days=${days}`)
  },
}
