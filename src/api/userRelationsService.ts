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
  is_blocked: boolean
  is_blocked_by: boolean
  is_mutual: boolean
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
  post_count?: number
  is_verified: boolean
  created_at: string
  relation?: UserRelation
}

// ========== 用户关系服务 ==========

export const userRelationsService = {
  /**
   * 关注用户
   */
  async followUser(userId: string): Promise<void> {
    return apiClient.post(`/users/${userId}/follow`)
  },

  /**
   * 取消关注
   */
  async unfollowUser(userId: string): Promise<void> {
    return apiClient.delete(`/users/${userId}/follow`)
  },

  /**
   * 获取用户粉丝列表
   */
  async getFollowers(
    userId: string,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedApiResponse<UserListItem>> {
    return apiClient.get<PaginatedApiResponse<UserListItem>>(
      `/users/${userId}/followers?page=${page}&page_size=${pageSize}`
    )
  },

  /**
   * 获取用户关注列表
   */
  async getFollowing(
    userId: string,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedApiResponse<UserListItem>> {
    return apiClient.get<PaginatedApiResponse<UserListItem>>(
      `/users/${userId}/following?page=${page}&page_size=${pageSize}`
    )
  },

  /**
   * 拉黑用户
   */
  async blockUser(userId: string): Promise<void> {
    return apiClient.post(`/users/${userId}/block`)
  },

  /**
   * 取消拉黑
   */
  async unblockUser(userId: string): Promise<void> {
    return apiClient.delete(`/users/${userId}/block`)
  },

  /**
   * 获取我拉黑的用户列表
   */
  async getBlockedUsers(page = 1, pageSize = 20): Promise<PaginatedApiResponse<UserListItem>> {
    return apiClient.get<PaginatedApiResponse<UserListItem>>(
      `/users/me/blocked?page=${page}&page_size=${pageSize}`
    )
  },

  /**
   * 查询与指定用户的关系状态
   */
  async getRelation(userId: string): Promise<UserRelation> {
    return apiClient.get<UserRelation>(`/users/${userId}/relation`)
  },

  /**
   * 获取用户公开资料
   */
  async getUserProfile(userId: string): Promise<UserPublicProfile> {
    return apiClient.get<UserPublicProfile>(`/users/${userId}/profile`)
  },
}
