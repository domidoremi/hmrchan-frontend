import { apiClient } from '@/api/client'
import { assertUuidV7String, type PublicResourceId } from '@/utils/contractResourceId'

export function listFavorites(): Promise<unknown> {
  return apiClient.get('/favorites')
}

export function checkFavoritePost(postId: PublicResourceId): Promise<unknown> {
  return apiClient.get(
    `/favorites/check/${encodeURIComponent(assertUuidV7String(postId, 'post id'))}`
  )
}

export function favoritePost(postId: PublicResourceId): Promise<unknown> {
  return apiClient.post('/favorites', {
    post_id: assertUuidV7String(postId, 'post id'),
  })
}

export function removeFavorite(postId: PublicResourceId): Promise<unknown> {
  return apiClient.delete(`/favorites/${encodeURIComponent(assertUuidV7String(postId, 'post id'))}`)
}
