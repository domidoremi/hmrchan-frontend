/**
 * Device Service - 设备管理服务
 *
 * 提供设备会话管理相关的 API 调用
 * 合约端点: /devices/
 */

import { apiClient, type RequestConfig } from './client'

// ========== 请求/响应类型 ==========

export interface Device {
  id: number
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

export interface DeviceListResponse {
  devices: Device[]
  total: number
  current_fingerprint?: string | null
}

// ========== 设备服务 ==========

export const deviceService = {
  /**
   * 获取设备列表
   */
  async getDevices(): Promise<DeviceListResponse> {
    return apiClient.get<DeviceListResponse>('/devices')
  },

  /** 取消信任设备 */
  async untrustDevice(deviceId: number): Promise<{ success: boolean }> {
    return apiClient.post('/devices/untrust', { device_id: deviceId })
  },

  /**
   * 获取当前设备信息
   */
  async getCurrentDevice(config?: RequestConfig): Promise<Device> {
    return apiClient.get<Device>('/devices/current', config)
  },

  /**
   * 注销指定设备
   */
  async revokeDevice(deviceId: number): Promise<void> {
    return apiClient.delete(`/devices/${deviceId}`)
  },

  /**
   * 注销所有设备
   */
  async revokeAllDevices(): Promise<void> {
    return apiClient.delete('/devices')
  },

  /**
   * 信任/取消信任设备
   */
  async trustDevice(deviceId: number): Promise<{ success: boolean }> {
    return apiClient.post('/devices/trust', { device_id: deviceId })
  },

  /**
   * 更新设备名称
   */
  async updateDeviceName(deviceId: number, deviceName: string): Promise<{ success: boolean }> {
    return apiClient.post('/devices/rename', {
      device_id: deviceId,
      device_name: deviceName,
    })
  },
}
