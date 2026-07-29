import { apiClient, type CursorCollectionResponse } from './client'

export interface UserRelation {
  is_following: boolean
  is_followed_by: boolean
  is_blocking: boolean
  is_blocked_by: boolean

  is_blocked?: boolean
  is_mutual?: boolean
}

export interface UserListItem {
  id: string
  username: string
  avatar_url?: string | null
  bio?: string | null
  follower_count?: number
  following_count?: number
  is_verified?: boolean
  created_at: string
}

export interface UserPublicProfile {
  id: string
  username: string
  avatar_url?: string | null
  bio?: string | null
  follower_count: number
  following_count: number
  is_following: boolean
  is_followed_by: boolean
  is_blocking: boolean
  is_blocked_by: boolean
  created_at: string

  post_count?: number
  is_verified?: boolean
  relation?: UserRelation
}

export interface RelationSummaryCounts {
  followers?: number | null
  following?: number | null
  blocked?: number | null
}

function buildCursorQuery(options: { limit?: number; cursor?: string | null } = {}) {
  const params = new URLSearchParams({
    limit: String(options.limit ?? 20),
  })
  if (options.cursor) params.set('cursor', options.cursor)
  return params
}

export const userRelationsService = {
  async followUser(userId: string): Promise<void> {
    return apiClient.post(`/relations/follow/${userId}`)
  },

  async unfollowUser(userId: string): Promise<void> {
    return apiClient.delete(`/relations/follow/${userId}`)
  },

  async getFollowers(
    options: { limit?: number; cursor?: string | null } = {}
  ): Promise<CursorCollectionResponse<UserListItem>> {
    return apiClient.get<CursorCollectionResponse<UserListItem>>(
      `/relations/followers?${buildCursorQuery(options).toString()}`
    )
  },

  async getFollowing(
    options: { limit?: number; cursor?: string | null } = {}
  ): Promise<CursorCollectionResponse<UserListItem>> {
    return apiClient.get<CursorCollectionResponse<UserListItem>>(
      `/relations/following?${buildCursorQuery(options).toString()}`
    )
  },

  async blockUser(userId: string): Promise<void> {
    return apiClient.post(`/relations/block/${userId}`)
  },

  async unblockUser(userId: string): Promise<void> {
    return apiClient.delete(`/relations/block/${userId}`)
  },

  async getBlockedUsers(
    options: { limit?: number; cursor?: string | null } = {}
  ): Promise<CursorCollectionResponse<UserListItem>> {
    return apiClient.get<CursorCollectionResponse<UserListItem>>(
      `/relations/blocked?${buildCursorQuery(options).toString()}`
    )
  },

  async getSummary(): Promise<Record<string, unknown>> {
    return apiClient.get<Record<string, unknown>>('/relations/summary')
  },

  async getRelation(userId: string): Promise<UserRelation> {
    return apiClient.get<UserRelation>(`/relations/status/${userId}`)
  },

  async getUserProfile(userId: string): Promise<UserPublicProfile> {
    return apiClient.get<UserPublicProfile>(`/users/${userId}/public-profile`)
  },
}
