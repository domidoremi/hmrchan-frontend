/**
 * Session Service - 会话管理服务
 *
 * 提供设备会话管理相关的 API 调用
 */

import { apiClient } from './client'

// ========== 请求/响应类型 ==========

export interface Session {
  id: string
  device_name: string
  device_type: 'desktop' | 'mobile' | 'tablet'
  device_os: string
  device_browser: string
  ip_address: string
  last_used_at: string
  created_at: string
  is_current: boolean
  is_trusted: boolean
  country?: string
  city?: string
  ip_change_count?: number
}

export interface SessionListResponse {
  sessions: Session[]
  total: number
}

export interface RevokeSessionRequest {
  session_id: string
}

export interface RevokeAllSessionsRequest {
  keep_current: boolean
}

export interface TrustSessionRequest {
  session_id: string
  trusted: boolean
}

export interface UpdateDeviceNameRequest {
  session_id: string
  device_name: string
}

// ========== 会话服务 ==========

export const sessionService = {
  /**
   * 获取活跃会话列表
   */
  async getSessions(): Promise<SessionListResponse> {
    return apiClient.get<SessionListResponse>('/sessions/')
  },

  /**
   * 获取当前会话信息
   */
  async getCurrentSession(): Promise<Session> {
    return apiClient.get<Session>('/sessions/current')
  },

  /**
   * 撤销指定会话（踢出设备）
   */
  async revokeSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post('/sessions/revoke', { session_id: sessionId })
  },

  /**
   * 撤销所有其他会话
   */
  async revokeAllOtherSessions(): Promise<{ success: boolean; message: string }> {
    return apiClient.post('/sessions/revoke-all', { keep_current: true })
  },

  /**
   * 信任/取消信任设备
   */
  async trustSession(sessionId: string, trusted: boolean): Promise<{ success: boolean }> {
    return apiClient.post('/sessions/trust', { session_id: sessionId, trusted })
  },

  /**
   * 更新设备名称
   */
  async updateDeviceName(sessionId: string, deviceName: string): Promise<{ success: boolean }> {
    return apiClient.put('/sessions/device-name', {
      session_id: sessionId,
      device_name: deviceName,
    })
  },
}

export default sessionService
