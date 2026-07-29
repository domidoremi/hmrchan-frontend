import { apiClient } from './client'

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
  items: AuditActivityItem[]
  next_cursor?: string | null
  has_more?: boolean
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

export const auditService = {
  async getMyActivity(params: MyActivityParams = {}): Promise<AuditActivityResponse> {
    const query = new URLSearchParams()
    if (params.days) query.set('days', String(params.days))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.event_type) query.set('event_type', params.event_type)
    const qs = query.toString()
    const response = await apiClient.get<AuditActivityResponse>(
      `/audit/my-activity${qs ? `?${qs}` : ''}`,
      {
        skipErrorToast: true,
      }
    )
    return {
      ...response,
      items: response.items ?? [],
      next_cursor: response.next_cursor ?? null,
      has_more: Boolean(response.has_more),
    }
  },

  async getMySecuritySummary(days = 30): Promise<SecuritySummary> {
    return apiClient.get<SecuritySummary>(`/audit/my-security-summary?days=${days}`, {
      skipErrorToast: true,
    })
  },
}
