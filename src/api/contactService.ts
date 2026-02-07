/**
 * Contact Service - 联系表单服务
 *
 * 通过后端 Resend 邮件服务发送联系消息
 */

import { apiClient } from './client'

// ========== 请求/响应类型 ==========

export interface ContactMessageRequest {
  /** 发送者姓名 */
  name: string
  /** 发送者邮箱 */
  email: string
  /** 主题 */
  subject: string
  /** 消息内容 */
  message: string
}

export interface ContactMessageResponse {
  /** 是否发送成功 */
  success: boolean
  /** 反馈消息 */
  message?: string
}

// ========== 联系服务 ==========

export const contactService = {
  /**
   * 发送联系消息（通过后端 Resend 邮件服务）
   */
  async sendMessage(data: ContactMessageRequest): Promise<ContactMessageResponse> {
    return apiClient.post<ContactMessageResponse>('/contact/send', data, {
      skipAuth: true,
      skipErrorToast: true,
    })
  },
}
