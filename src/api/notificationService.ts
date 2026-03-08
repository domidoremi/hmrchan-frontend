/**
 * Notification Service - 通知服务
 *
 * 提供通知相关的 API 调用
 */

import { apiClient, type PaginatedApiResponse, type RequestConfig } from './client'

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
  user_id?: string
  type: NotificationType
  title: string
  content: string | null
  related_type?: 'post' | 'comment' | 'discussion' | null
  related_id?: number | null
  data?: Record<string, unknown>
  is_read: boolean
  created_at: string
  read_at?: string | null
}

export interface NotificationListResponse extends PaginatedApiResponse<Notification> {
  unread_count: number
  has_more?: boolean
}

export interface UnreadCountResponse {
  unread_count: number
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
    },
    config?: RequestConfig
  ): Promise<NotificationListResponse> {
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

    return apiClient.get<NotificationListResponse>(`/notifications?${params.toString()}`, config)
  },

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(config?: RequestConfig): Promise<UnreadCountResponse> {
    return apiClient.get<UnreadCountResponse>('/notifications/unread-count', config)
  },

  /**
   * 标记单条通知为已读
   * PATCH /api/v1/notifications/:id/read → 通知对象
   */
  async markAsRead(notificationId: string, config?: RequestConfig): Promise<Notification> {
    return apiClient.patch<Notification>(`/notifications/${notificationId}/read`, undefined, config)
  },

  /**
   * 标记全部通知为已读
   * POST /api/v1/notifications/read-all → { message, success, count }
   */
  async markAllAsRead(
    type?: NotificationType,
    config?: RequestConfig
  ): Promise<{ message: string; success: boolean; count: number }> {
    const params = type ? `?type=${type}` : ''
    return apiClient.post(`/notifications/read-all${params}`, undefined, config)
  },

  /**
   * 删除单条通知
   * DELETE /api/v1/notifications/:id → { message, success }
   */
  async deleteNotification(
    notificationId: string,
    config?: RequestConfig
  ): Promise<{ message: string; success: boolean }> {
    return apiClient.delete(`/notifications/${notificationId}`, config)
  },

  /**
   * 清空通知（默认仅清除已读）
   * DELETE /api/v1/notifications → { message, success, count }
   */
  async clearNotifications(
    readOnly = true,
    config?: RequestConfig
  ): Promise<{ message: string; success: boolean; count: number }> {
    const params = readOnly ? '?read_only=true' : ''
    return apiClient.delete(`/notifications${params}`, config)
  },
}
