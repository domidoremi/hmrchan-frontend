import { apiClient } from '@/api/client'

export interface ClientInitPayload {
  client_fingerprint: string
  force_reissue?: boolean
}

export function initClientSecurity(payload: ClientInitPayload): Promise<unknown> {
  return apiClient.post('/client/init', {
    client_fingerprint: payload.client_fingerprint,
    force_reissue: payload.force_reissue ?? false,
  })
}
