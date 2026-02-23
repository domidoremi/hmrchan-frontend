/**
 * Feedback Service - 反馈服务
 *
 * 提供用户反馈提交的 API 调用
 * 合约端点: /feedback
 */

import { apiClient } from './client'

// ========== 类型定义 ==========

export interface FeedbackRequest {
  /** 反馈内容（必填，最长 2000 字符） */
  message: string
  /** 联系方式（可选） */
  contact?: string
  /** 反馈分类（可选，默认 'general'） */
  category?: 'general' | 'bug' | 'feature' | 'other'
  /** 客户端指纹（可选） */
  fingerprint?: string
}

export interface FeedbackResponse {
  id: string
  message: string
  category: string
  created_at: string
}

// ========== 反馈服务 ==========

export const feedbackService = {
  /**
   * 提交反馈（可选认证）
   */
  async submit(data: FeedbackRequest): Promise<FeedbackResponse> {
    return apiClient.post<FeedbackResponse>('/feedback', data, {
      skipErrorToast: true,
    })
  },
}
