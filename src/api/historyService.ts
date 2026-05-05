import { apiClient } from '@/api/client'
import { assertUuidV7String, type PublicResourceId } from '@/utils/contractResourceId'

export function listBrowsingHistory(): Promise<unknown> {
  return apiClient.get('/history/browsing')
}

export function recordPostView(postId: PublicResourceId): Promise<unknown> {
  return apiClient.post('/history/browsing', {
    public_post_id: assertUuidV7String(postId, 'post id'),
  })
}

export function clearPostHistory(postId: PublicResourceId): Promise<unknown> {
  return apiClient.delete(
    `/history/browsing/${encodeURIComponent(assertUuidV7String(postId, 'post id'))}`
  )
}
