/**
 * Audit Service - 审计日志服务
 *
 * 提供用户活动日志和安全摘要的 API 调用
 * 合约端点: /audit
 */

import { apiClient, type PaginatedApiResponse } from './client'

// ========== 类型定义 ==========

export interface AuditActivityItem {
  id: string
  action: string
  resource_type?: string | null
  resource_id?: string | null
  ip_address?: string | null
  user_agent?: string | null
  details?: Record<string, unknown> | null
  created_at: string
}

export interface SecuritySummary {
  recent_logins: number
  failed_logins: number
  password_changed_at?: string | null
  totp_enabled: boolean
  active_sessions: number
  trusted_devices: number
  recent_security_events?: SecurityEvent[]
}

export interface SecurityEvent {
  type: string
  description: string
  ip_address?: string | null
  created_at: string
}

// ========== 审计服务 ==========

export const auditService = {
  /**
   * 获取我的活动日志（需认证）
   */
  async getMyActivity(page = 1, pageSize = 20): Promise<PaginatedApiResponse<AuditActivityItem>> {
    return apiClient.get<PaginatedApiResponse<AuditActivityItem>>(
      `/audit/my-activity?page=${page}&page_size=${pageSize}`
    )
  },

  /**
   * 获取我的安全摘要（需认证）
   */
  async getMySecuritySummary(): Promise<SecuritySummary> {
    return apiClient.get<SecuritySummary>('/audit/my-security-summary')
  },
}
