/**
 * Device Service - 设备管理服务
 *
 * 提供设备会话管理相关的 API 调用
 * 合约端点: /devices/
 */

import { apiClient, type RequestConfig } from './client'
import { ensureVerificationToken } from './verificationBridge'

// ========== 请求/响应类型 ==========

export interface Device {
  id: string
  fingerprint?: string | null
  device_name?: string | null
  device_type: 'desktop' | 'mobile' | 'tablet'
  // New API fields
  browser?: string | null
  os?: string | null
  device_info?: string | null
  last_active_at?: string | null
  last_login_at?: string | null
  first_seen_at?: string | null
  last_ip?: string | null
  login_count?: number | null
  // Legacy fields (fallback)
  device_os?: string | null
  device_browser?: string | null
  last_used_at?: string | null
  ip_address?: string | null
  created_at?: string | null
  is_current: boolean
  is_trusted: boolean
  country?: string
  city?: string
  ip_change_count?: number
}

export interface DeviceListResponse {
  items: Device[]
  current_fingerprint?: string | null
}

// ========== 设备服务 ==========

export const deviceService = {
  /**
   * 获取设备列表
   */
  async getDevices(config?: RequestConfig): Promise<DeviceListResponse> {
    const response = await apiClient.get<DeviceListResponse>('/devices', {
      ...config,
      securityPolicy: config?.securityPolicy ?? 'sensitive',
    })
    return {
      ...response,
      items: response.items ?? [],
    }
  },

  /** 取消当前设备信任状态 */
  async untrustDevice(deviceId: string): Promise<{ success: boolean }> {
    return apiClient.post('/devices/untrust', { device_id: deviceId })
  },

  /**
   * 获取当前设备信息
   */
  async getCurrentDevice(config?: RequestConfig): Promise<Device> {
    return apiClient.get<Device>('/devices/current', {
      ...config,
      securityPolicy: config?.securityPolicy ?? 'sensitive',
    })
  },

  /**
   * 注销指定设备
   */
  async revokeDevice(deviceId: string): Promise<void> {
    const verificationToken = await ensureVerificationToken('revoke_sessions')
    await apiClient.delete(`/devices/${deviceId}`, {
      securityPolicy: 'sensitive',
      headers: {
        'X-Verification-Token': verificationToken,
      },
    })
  },

  /**
   * 注销所有设备
   * DELETE /api/v1/devices → { message, success, revoked_count }
   */
  async revokeAllDevices(): Promise<{
    message?: string
    success?: boolean
    revoked_count?: number
  }> {
    const verificationToken = await ensureVerificationToken('revoke_sessions')
    return apiClient.delete('/devices', {
      securityPolicy: 'sensitive',
      headers: {
        'X-Verification-Token': verificationToken,
      },
    })
  },

  /**
   * 仅允许将当前设备标记为 trusted
   */
  async trustDevice(deviceId: string): Promise<{ success: boolean }> {
    return apiClient.post(
      '/devices/trust',
      { device_id: deviceId },
      {
        securityPolicy: 'sensitive',
        verificationAction: 'update_security_settings',
      }
    )
  },

  /**
   * 更新设备名称
   */
  async updateDeviceName(deviceId: string, deviceName: string): Promise<{ success: boolean }> {
    return apiClient.post(
      '/devices/rename',
      {
        device_id: deviceId,
        device_name: deviceName,
      },
      {
        securityPolicy: 'sensitive',
      }
    )
  },
}
