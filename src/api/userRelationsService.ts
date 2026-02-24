/**
 * User Relations Service - 用户关系服务
 *
 * 提供用户关注、拉黑等关系管理的 API 调用
 */

import { apiClient, type PaginatedApiResponse } from './client'

// ========== 类型定义 ==========

export interface UserRelation {
  is_following: boolean
  is_followed_by: boolean
  is_blocking: boolean
  is_blocked_by: boolean
  // 兼容旧字段
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
  // 兼容旧字段
  post_count?: number
  is_verified?: boolean
  relation?: UserRelation
}

// ========== 用户关系服务 ==========

export const userRelationsService = {
  /**
   * 关注用户
   */
  async followUser(userId: string): Promise<void> {
    return apiClient.post(`/relations/follow/${userId}`)
  },

  /**
   * 取消关注
   */
  async unfollowUser(userId: string): Promise<void> {
    return apiClient.delete(`/relations/follow/${userId}`)
  },

  /**
   * 获取当前用户粉丝列表
   */
  async getFollowers(page = 1, pageSize = 20): Promise<PaginatedApiResponse<UserListItem>> {
    return apiClient.get<PaginatedApiResponse<UserListItem>>(
      `/relations/followers?page=${page}&page_size=${pageSize}`
    )
  },

  /**
   * 获取当前用户关注列表
   */
  async getFollowing(page = 1, pageSize = 20): Promise<PaginatedApiResponse<UserListItem>> {
    return apiClient.get<PaginatedApiResponse<UserListItem>>(
      `/relations/following?page=${page}&page_size=${pageSize}`
    )
  },

  /**
   * 拉黑用户
   */
  async blockUser(userId: string): Promise<void> {
    return apiClient.post(`/relations/block/${userId}`)
  },

  /**
   * 取消拉黑
   */
  async unblockUser(userId: string): Promise<void> {
    return apiClient.delete(`/relations/block/${userId}`)
  },

  /**
   * 获取我拉黑的用户列表
   */
  async getBlockedUsers(page = 1, pageSize = 20): Promise<PaginatedApiResponse<UserListItem>> {
    return apiClient.get<PaginatedApiResponse<UserListItem>>(
      `/relations/blocked?page=${page}&page_size=${pageSize}`
    )
  },

  /**
   * 查询与指定用户的关系状态
   */
  async getRelation(userId: string): Promise<UserRelation> {
    return apiClient.get<UserRelation>(`/relations/status/${userId}`)
  },

  /**
   * 获取用户公开资料
   */
  async getUserProfile(userId: string): Promise<UserPublicProfile> {
    return apiClient.get<UserPublicProfile>(`/users/${userId}/public-profile`)
  },
}
