import { apiClient } from '@/api/client'
import { assertUuidV7String, type PublicResourceId } from '@/utils/contractResourceId'

export function listDevices(): Promise<unknown> {
  return apiClient.get('/devices')
}

export function revokeDevice(deviceId: PublicResourceId): Promise<unknown> {
  return apiClient.delete(
    `/devices/${encodeURIComponent(assertUuidV7String(deviceId, 'device id'))}`
  )
}
