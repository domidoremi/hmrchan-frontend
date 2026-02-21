/**
 * Notification Service - 通知服务
 *
 * 提供通知相关的 API 调用
 */

import { apiClient, type PaginatedApiResponse } from './client'

// ========== 类型定义 ==========

export type NotificationType =
  | 'comment_reply'
  | 'comment_like'
  | 'comment_mention'
  | 'follow'
  | 'system'
  | 'report_resolved'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  content: string
  data?: Record<string, unknown>
  is_read: boolean
  created_at: string
  read_at?: string | null
}

export interface UnreadCountResponse {
  count: number
  by_type?: Record<NotificationType, number>
}

// ========== 通知服务 ==========

export const notificationService = {
  /**
   * 获取通知列表
   */
  async getNotifications(
    page = 1,
    pageSize = 20,
    options?: {
      type?: NotificationType
      unreadOnly?: boolean
    }
  ): Promise<PaginatedApiResponse<Notification>> {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    })

    if (options?.type) {
      params.set('type', options.type)
    }
    if (options?.unreadOnly) {
      params.set('unread_only', 'true')
    }

    return apiClient.get<PaginatedApiResponse<Notification>>(`/notifications?${params.toString()}`)
  },

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    return apiClient.get<UnreadCountResponse>('/notifications/unread-count')
  },

  /**
   * 标记单条通知为已读
   */
  async markAsRead(notificationId: string): Promise<void> {
    return apiClient.patch(`/notifications/${notificationId}/read`)
  },

  /**
   * 标记全部通知为已读
   */
  async markAllAsRead(type?: NotificationType): Promise<void> {
    const params = type ? `?type=${type}` : ''
    return apiClient.post(`/notifications/read-all${params}`)
  },

  /**
   * 删除单条通知
   */
  async deleteNotification(notificationId: string): Promise<void> {
    return apiClient.delete(`/notifications/${notificationId}`)
  },

  /**
   * 清空通知（默认仅清除已读）
   */
  async clearNotifications(readOnly = true): Promise<void> {
    const params = readOnly ? '?read_only=true' : ''
    return apiClient.delete(`/notifications${params}`)
  },
}
