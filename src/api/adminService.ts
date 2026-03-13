/**
 * Admin Service - 管理员服务
 *
 * 提供管理员专用的 API 调用
 * 所有接口需要 AuthRequired + AdminRequired 中间件
 * 合约端点: /admin/*, /users, /roles, /crawler, /processor, /reports (admin), /audit/admin
 */

import { apiClient, type PaginatedApiResponse } from './client'

// ========== 系统监控类型 ==========

export interface DetailedHealth {
  status: string
  uptime?: number
  version?: string
  components?: Record<string, { status: string; message?: string }>
}

export interface DbHealth {
  status: string
  latency_ms?: number
  connections?: number
}

export interface SystemStats {
  total_users: number
  total_posts: number
  total_comments: number
  total_discussions: number
  active_sessions: number
  [key: string]: unknown
}

export interface CacheStats {
  hit_rate?: number
  memory_usage?: string
  keys_count?: number
  [key: string]: unknown
}

// ========== 用户管理类型 ==========

export interface AdminUserListParams {
  page?: number
  page_size?: number
  q?: string
  is_active?: boolean
  is_admin?: boolean
  is_verified?: boolean
  role_id?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface AdminUser {
  id: string
  username: string
  email: string
  full_name?: string | null
  avatar_url?: string | null
  bio?: string | null
  is_active: boolean
  is_admin: boolean
  is_verified: boolean
  totp_enabled?: boolean
  email_verified_at?: string | null
  last_login_at?: string | null
  created_at: string
  updated_at?: string | null
  roles?: AdminRole[]
}

export interface AdminUserStats {
  post_count: number
  comment_count: number
  discussion_count: number
  favorite_count: number
  follower_count: number
  following_count: number
  [key: string]: unknown
}

// ========== 角色管理类型 ==========

export interface AdminRole {
  id: number
  name: string
  description?: string | null
  permissions?: string[]
  user_count?: number
  created_at?: string
  updated_at?: string | null
}

export interface CreateRoleRequest {
  name: string
  description?: string
  permissions?: string[]
}

export interface UpdateRoleRequest {
  name?: string
  description?: string
}

export interface Permission {
  id: string
  name: string
  description?: string
}

// ========== 爬虫管理类型 ==========

export interface CrawlerStatus {
  is_running: boolean
  last_run_at?: string | null
  next_run_at?: string | null
  total_scraped?: number
  [key: string]: unknown
}

export interface CrawlerPlatformStatus {
  platform: string
  is_enabled: boolean
  last_run_at?: string | null
  post_count?: number
  error_count?: number
  [key: string]: unknown
}

export interface CrawlerConfig {
  [key: string]: unknown
}

// ========== 处理器管理类型 ==========

export interface ProcessorStats {
  total_processed: number
  total_failed: number
  pending: number
  [key: string]: unknown
}

export interface ProcessorTask {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  created_at: string
  completed_at?: string | null
  error?: string | null
}

export interface ProcessorFailureListParams {
  page?: number
  page_size?: number
  status?: string
  processor_name?: string
  platform?: string
  retry_eligible?: boolean
}

export interface ProcessorFailureItem {
  id: number | string
  post_id?: number | string | null
  processor_name: string
  processor_version?: string | null
  status: string
  input_path?: string | null
  error_message?: string | null
  started_at?: string | null
  completed_at?: string | null
  duration_sec?: number | null
  platform?: string | null
  platform_post_id?: string | null
  retry_eligible?: boolean
  [key: string]: unknown
}

export interface RetryProcessorFailuresRequest {
  ids?: Array<number | string>
  failure_ids?: Array<number | string>
  [key: string]: unknown
}

export interface RetryProcessorFailuresResponse {
  task_id: string
  status: string
  accepted_count?: number
  accepted_ids?: Array<number | string>
  invalid_ids?: Array<number | string>
  missing_ids?: Array<number | string>
  skipped_ids?: Array<number | string>
  [key: string]: unknown
}

export interface WatcherStatus {
  is_running: boolean
  watched_paths?: string[]
  [key: string]: unknown
}

// ========== 举报管理类型 ==========

export interface AdminReport {
  id: string
  target_type: string
  target_id: string
  reason: string
  description?: string | null
  status: 'pending' | 'resolved' | 'rejected'
  reporter?: { id: string; username: string } | null
  reporter_username?: string | null
  reviewer_username?: string | null
  created_at: string
  updated_at?: string | null
  reviewed_at?: string | null
  reviewed_by?: string | null
}

export interface ReportStatsSummary {
  total: number
  pending: number
  reviewed: number
  resolved: number
  dismissed: number
  [key: string]: unknown
}

export interface ReviewReportRequest {
  status: 'resolved' | 'rejected'
  resolution_note?: string
}

// ========== 审计管理类型 ==========

export interface SecurityEventItem {
  id: number
  event_type: string
  event_description?: string | null
  severity?: 'low' | 'medium' | 'high' | 'critical'
  success?: boolean
  user_id?: string | null
  ip_address?: string | null
  device_type?: string | null
  request_path?: string | null
  user_agent?: string | null
  details?: Record<string, unknown> | null
  created_at: string
}

export interface SecurityEventsResponse {
  logs: SecurityEventItem[]
  total: number
}

export interface FailedLoginIpItem {
  ip_address: string
  count: number
}

// ========== 反馈管理类型 ==========

export interface AdminFeedback {
  id: string
  message: string
  category: string
  contact?: string | null
  user_id?: string | null
  fingerprint?: string | null
  created_at: string
}

// ========== 管理员服务 ==========

export const adminService = {
  // ========== 系统监控 (Section 30.1) ==========

  async getDetailedHealth(): Promise<DetailedHealth> {
    return apiClient.get('/admin/health/detailed')
  },

  async getDbHealth(): Promise<DbHealth> {
    return apiClient.get('/admin/db/health')
  },

  async getSystemStats(): Promise<SystemStats> {
    return apiClient.get('/admin/stats/system')
  },

  async getCacheStats(): Promise<CacheStats> {
    return apiClient.get('/admin/cache/stats')
  },

  async clearCache(): Promise<{ message: string }> {
    return apiClient.post('/admin/cache/clear', null, {
      verificationAction: 'admin_operation',
    })
  },

  async getMetrics(): Promise<Record<string, unknown>> {
    return apiClient.get('/admin/metrics')
  },

  // ========== 用户管理 (Section 30.2) ==========

  async listUsers(params: AdminUserListParams = {}): Promise<PaginatedApiResponse<AdminUser>> {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.page_size) query.set('page_size', String(params.page_size))
    if (params.q) query.set('q', params.q)
    if (params.is_active !== undefined) query.set('is_active', String(params.is_active))
    if (params.is_admin !== undefined) query.set('is_admin', String(params.is_admin))
    if (params.is_verified !== undefined) query.set('is_verified', String(params.is_verified))
    if (params.role_id) query.set('role_id', String(params.role_id))
    if (params.sort_by) query.set('sort_by', params.sort_by)
    if (params.sort_order) query.set('sort_order', params.sort_order)
    const qs = query.toString()
    return apiClient.get(`/users${qs ? `?${qs}` : ''}`)
  },

  async getUser(userId: string): Promise<AdminUser> {
    return apiClient.get(`/users/${userId}`)
  },

  async deleteUser(userId: string): Promise<void> {
    return apiClient.delete(`/users/${userId}`, {
      verificationAction: 'admin_operation',
    })
  },

  async getUserStats(userId: string): Promise<AdminUserStats> {
    return apiClient.get(`/users/${userId}/stats`)
  },

  async assignRoles(userId: string, roleIds: number[]): Promise<{ message: string }> {
    return apiClient.post(
      `/users/${userId}/roles`,
      { role_ids: roleIds },
      {
        verificationAction: 'admin_operation',
      }
    )
  },

  async getUserRoles(userId: string): Promise<AdminRole[]> {
    return apiClient.get(`/users/${userId}/roles`)
  },

  async uploadUserAvatar(userId: string, file: File): Promise<{ url: string }> {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post(`/upload/users/${userId}/avatar`, formData, {
      verificationAction: 'admin_operation',
    })
  },

  // ========== 角色管理 (Section 30.3) ==========

  async createRole(data: CreateRoleRequest): Promise<AdminRole> {
    return apiClient.post('/roles', data, {
      verificationAction: 'admin_operation',
    })
  },

  async listRoles(): Promise<AdminRole[]> {
    return apiClient.get('/roles')
  },

  async getPermissionsList(): Promise<Permission[]> {
    return apiClient.get('/roles/permissions/list')
  },

  async getRole(roleId: number): Promise<AdminRole> {
    return apiClient.get(`/roles/${roleId}`)
  },

  async updateRole(roleId: number, data: UpdateRoleRequest): Promise<AdminRole> {
    return apiClient.patch(`/roles/${roleId}`, data, {
      verificationAction: 'admin_operation',
    })
  },

  async deleteRole(roleId: number): Promise<void> {
    return apiClient.delete(`/roles/${roleId}`, {
      verificationAction: 'admin_operation',
    })
  },

  async updateRolePermissions(roleId: number, permissions: string[]): Promise<{ message: string }> {
    return apiClient.put(
      `/roles/${roleId}/permissions`,
      { permissions },
      {
        verificationAction: 'admin_operation',
      }
    )
  },

  async getRoleUsers(
    roleId: number,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedApiResponse<AdminUser>> {
    return apiClient.get(`/roles/${roleId}/users?page=${page}&page_size=${pageSize}`)
  },

  // ========== 爬虫管理 (Section 30.4) ==========

  async getCrawlerStatus(): Promise<CrawlerStatus> {
    return apiClient.get('/crawler/status')
  },

  async getCrawlerPlatformStatus(): Promise<CrawlerPlatformStatus[]> {
    return apiClient.get('/crawler/platforms/status')
  },

  async getCrawlerConfig(): Promise<CrawlerConfig> {
    return apiClient.get('/crawler/config')
  },

  async updateCrawlerConfig(config: CrawlerConfig): Promise<CrawlerConfig> {
    return apiClient.put('/crawler/config', config, {
      verificationAction: 'admin_operation',
    })
  },

  // ========== 处理器管理 (Section 30.5) ==========

  async triggerScan(): Promise<ProcessorTask> {
    return apiClient.post('/processor/scan', null, {
      verificationAction: 'admin_operation',
    })
  },

  async reprocessFailed(): Promise<ProcessorTask> {
    return apiClient.post('/processor/scan/failed', null, {
      verificationAction: 'admin_operation',
    })
  },

  async listProcessorFailures(
    params: ProcessorFailureListParams = {}
  ): Promise<PaginatedApiResponse<ProcessorFailureItem>> {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.page_size) query.set('page_size', String(params.page_size))
    if (params.status) query.set('status', params.status)
    if (params.processor_name) query.set('processor_name', params.processor_name)
    if (params.platform) query.set('platform', params.platform)
    if (typeof params.retry_eligible === 'boolean') {
      query.set('retry_eligible', String(params.retry_eligible))
    }
    const qs = query.toString()
    return apiClient.get<PaginatedApiResponse<ProcessorFailureItem>>(
      `/processor/failures${qs ? `?${qs}` : ''}`
    )
  },

  async retryProcessorFailures(
    data: RetryProcessorFailuresRequest
  ): Promise<RetryProcessorFailuresResponse> {
    return apiClient.post<RetryProcessorFailuresResponse>('/processor/failures/retry', data, {
      verificationAction: 'admin_operation',
    })
  },

  async getProcessorStats(): Promise<ProcessorStats> {
    return apiClient.get('/processor/stats')
  },

  async getTaskStatus(taskId: string): Promise<ProcessorTask> {
    return apiClient.get(`/processor/tasks/${taskId}`)
  },

  async getWatcherStatus(): Promise<WatcherStatus> {
    return apiClient.get('/processor/watcher/status')
  },

  // ========== 举报管理 (Section 30.6) ==========

  async listReports(
    params: { page?: number; page_size?: number; status?: string; target_type?: string } = {}
  ): Promise<PaginatedApiResponse<AdminReport>> {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.page_size) query.set('page_size', String(params.page_size))
    if (params.status) query.set('status', params.status)
    if (params.target_type) query.set('target_type', params.target_type)
    const qs = query.toString()
    return apiClient.get(`/reports${qs ? `?${qs}` : ''}`)
  },

  async getReportStats(): Promise<ReportStatsSummary> {
    return apiClient.get('/reports/stats/summary')
  },

  async getReport(reportId: string): Promise<AdminReport> {
    return apiClient.get(`/reports/${reportId}`)
  },

  async reviewReport(reportId: string, data: ReviewReportRequest): Promise<AdminReport> {
    return apiClient.patch(`/reports/${reportId}`, data, {
      verificationAction: 'admin_operation',
    })
  },

  // ========== 审计管理 (Section 30.8) ==========

  async getSecurityEvents(
    params: { hours?: number; limit?: number; severity?: string } = {}
  ): Promise<SecurityEventsResponse> {
    const query = new URLSearchParams()
    if (params.hours) query.set('hours', String(params.hours))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.severity) query.set('severity', params.severity)
    const qs = query.toString()
    return apiClient.get(`/audit/admin/security-events${qs ? `?${qs}` : ''}`)
  },

  async getFailedLogins(
    params: { hours?: number; min_count?: number } = {}
  ): Promise<FailedLoginIpItem[]> {
    const query = new URLSearchParams()
    if (params.hours) query.set('hours', String(params.hours))
    if (params.min_count) query.set('min_count', String(params.min_count))
    const qs = query.toString()
    return apiClient.get(`/audit/admin/failed-logins${qs ? `?${qs}` : ''}`)
  },

  async getUserAuditLog(
    userId: string,
    params: { days?: number; limit?: number } = {}
  ): Promise<{ logs: import('./auditService').AuditActivityItem[]; total: number }> {
    const query = new URLSearchParams()
    if (params.days) query.set('days', String(params.days))
    if (params.limit) query.set('limit', String(params.limit))
    const qs = query.toString()
    return apiClient.get(`/audit/admin/user/${userId}${qs ? `?${qs}` : ''}`)
  },

  // ========== 反馈管理 (Section 30.9) ==========

  async listFeedbacks(page = 1, pageSize = 20): Promise<PaginatedApiResponse<AdminFeedback>> {
    return apiClient.get(`/admin/feedbacks?page=${page}&page_size=${pageSize}`)
  },

  // ========== 账户清理 (Section 30.10) ==========

  async cleanupExpiredAccounts(): Promise<{ message: string; count?: number }> {
    return apiClient.post('/account/admin/cleanup-expired', null, {
      verificationAction: 'admin_operation',
    })
  },
}
