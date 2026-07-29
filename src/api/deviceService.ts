import { apiClient, type RequestConfig } from './client'
import { ensureVerificationToken } from './verificationBridge'
import { assertUuidV7String, type PublicResourceId } from '@/types/publicId'

export interface Device {
  id: PublicResourceId
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

export const deviceService = {
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

  async untrustDevice(deviceId: PublicResourceId): Promise<{ success: boolean }> {
    return apiClient.post('/devices/untrust', {
      device_id: assertUuidV7String(deviceId, 'device id'),
    })
  },

  async getCurrentDevice(config?: RequestConfig): Promise<Device> {
    return apiClient.get<Device>('/devices/current', {
      ...config,
      securityPolicy: config?.securityPolicy ?? 'sensitive',
    })
  },

  async revokeDevice(deviceId: PublicResourceId): Promise<void> {
    const publicDeviceId = assertUuidV7String(deviceId, 'device id')
    const verificationToken = await ensureVerificationToken('revoke_sessions')
    await apiClient.delete(`/devices/${publicDeviceId}`, {
      securityPolicy: 'sensitive',
      headers: {
        'X-Verification-Token': verificationToken,
      },
    })
  },

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

  async trustDevice(deviceId: PublicResourceId): Promise<{ success: boolean }> {
    return apiClient.post(
      '/devices/trust',
      { device_id: assertUuidV7String(deviceId, 'device id') },
      {
        securityPolicy: 'sensitive',
        verificationAction: 'update_security_settings',
      }
    )
  },

  async updateDeviceName(
    deviceId: PublicResourceId,
    deviceName: string
  ): Promise<{ success: boolean }> {
    return apiClient.post(
      '/devices/rename',
      {
        device_id: assertUuidV7String(deviceId, 'device id'),
        device_name: deviceName,
      },
      {
        securityPolicy: 'sensitive',
      }
    )
  },
}
