/**
 * 敏感操作安全验证 Composable
 *
 * 功能特点：
 * - 统一管理敏感操作的二次确认
 * - 支持密码验证
 * - 支持操作超时保护
 * - 提供加载状态管理
 */

import { ref, readonly } from 'vue'
import logger from '@/utils/logger'

export interface SecureActionOptions {
  /** 操作名称（用于日志） */
  actionName: string
  /** 是否需要密码验证 */
  requirePassword?: boolean
  /** 确认对话框标题 */
  title?: string
  /** 确认对话框描述 */
  description?: string
  /** 操作类型 */
  type?: 'info' | 'warning' | 'danger'
  /** 操作超时时间（毫秒） */
  timeout?: number
}

export function useSecureAction() {
  const isDialogOpen = ref(false)
  const isLoading = ref(false)
  const currentOptions = ref<SecureActionOptions | null>(null)
  const pendingAction = ref<((password?: string) => Promise<void>) | null>(null)
  const error = ref<string | null>(null)

  /**
   * 执行敏感操作（带确认）
   */
  async function executeSecure<T>(
    action: (password?: string) => Promise<T>,
    options: SecureActionOptions,
  ): Promise<T | null> {
    currentOptions.value = options
    error.value = null

    return new Promise((resolve) => {
      pendingAction.value = async (password?: string) => {
        isLoading.value = true
        error.value = null

        try {
          // 设置超时保护
          const timeoutMs = options.timeout || 30000
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('操作超时')), timeoutMs)
          })

          const result = await Promise.race([action(password), timeoutPromise])

          logger.info(`[SecureAction] ${options.actionName} completed successfully`)
          isDialogOpen.value = false
          resolve(result)
        } catch (err) {
          const message = err instanceof Error ? err.message : '操作失败'
          error.value = message
          logger.error(`[SecureAction] ${options.actionName} failed`, { error: err })

          // 密码错误不关闭对话框
          if (message.includes('密码') || message.includes('password')) {
            isLoading.value = false
            return
          }

          isDialogOpen.value = false
          resolve(null)
        } finally {
          isLoading.value = false
        }
      }

      isDialogOpen.value = true
    })
  }

  /**
   * 确认操作
   */
  async function confirm(password?: string) {
    if (pendingAction.value) {
      await pendingAction.value(password)
    }
  }

  /**
   * 取消操作
   */
  function cancel() {
    isDialogOpen.value = false
    pendingAction.value = null
    currentOptions.value = null
    error.value = null
  }

  /**
   * 验证密码（需要在调用处实现具体验证逻辑）
   * 这里只是一个占位符，实际验证应该在 action 回调中完成
   */
  function validatePasswordNotEmpty(password: string): boolean {
    return password.length >= 6
  }

  return {
    // 状态
    isDialogOpen: readonly(isDialogOpen),
    isLoading: readonly(isLoading),
    currentOptions: readonly(currentOptions),
    error: readonly(error),

    // 方法
    executeSecure,
    confirm,
    cancel,
    validatePasswordNotEmpty,
  }
}

export type UseSecureActionReturn = ReturnType<typeof useSecureAction>
