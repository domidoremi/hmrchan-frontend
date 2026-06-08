import { apiClient } from '@/api/client'

export function listInboxSummary(): Promise<unknown> {
  return apiClient.get('/inbox/summary')
}

export function listInboxMessages(): Promise<unknown> {
  return apiClient.get('/inbox')
}

export function listNotifications(): Promise<unknown> {
  return apiClient.get('/notifications')
}
