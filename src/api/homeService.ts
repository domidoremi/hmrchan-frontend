import { apiClient } from '@/api/client'
import { getContractResourceId } from '@/utils/contractResourceId'

export interface HomeAggregateResponse {
  featured?: unknown[]
  highlights?: unknown[]
  story_deck?: unknown[]
}

export function normalizeHomeDeepLink(value: string): string {
  if (value.startsWith('/post/')) {
    const id = getContractResourceId(value.slice('/post/'.length))
    return id ? `/posts/${id}` : '/'
  }
  return value
}

export function loadHomeAggregate(): Promise<HomeAggregateResponse> {
  return apiClient.get<HomeAggregateResponse>('/home')
}
