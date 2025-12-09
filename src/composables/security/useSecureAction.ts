/**
 * 敏感操作安全验证 Composable
 *
 * 功能特点：
 * - 统一管理敏感操作的二次确认
 * - 集成后端密码验证和身份验证 API
 * - 自动管理验证令牌
 * - 支持操作超时保护
 * - 提供加载状态管理
 */

import { ref, readonly } from 'vue'
import { authApi } from '@/api/services'
import logger from '@/utils/logger'
import type { SensitiveAction, VerifyIdentityResponse } from '@/types'

export interface SecureActionOptions {
  /** 操作名称（用于日志） */
  actionName: string
  /** 敏感操作类型（用于后端验证） */
  action?: SensitiveAction
  /** 操作的资源 ID（可选） */
  resourceId?: string
  /** 是否需要密码验证 */
  requirePassword?: boolean
  /** 确认对话框标题 */
  title?: string
  /** 确认对话框描述 */
  description?: string
  /** 操作类型（用于对话框样式） */
  type?: 'info' | 'warning' | 'danger'
  /** 操作超时时间（毫秒） */
  timeout?: number
}

/** 验证令牌存储 */
let currentVerificationToken: string | null = null
let tokenExpiry: number | null = null

/**
 * 获取当前验证令牌
 */
export function getVerificationToken(): string | null {
  if (!currentVerificationToken || !tokenExpiry) return null
  if (Date.now() > tokenExpiry) {
    currentVerificationToken = null
    tokenExpiry = null
    return null
  }
  return currentVerificationToken
}

/**
 * 设置验证令牌
 */
export function setVerificationToken(token: string, expiresIn: number): void {
  currentVerificationToken = token
  tokenExpiry = Date.now() + expiresIn * 1000
}

/**
 * 清除验证令牌
 */
export function clearVerificationToken(): void {
  currentVerificationToken = null
  tokenExpiry = null
}

export function useSecureAction() {
  const isDialogOpen = ref(false)
  const isLoading = ref(false)
  const currentOptions = ref<SecureActionOptions | null>(null)
  const pendingAction = ref<((password?: string) => Promise<void>) | null>(null)
  const error = ref<string | null>(null)
  const verificationResult = ref<VerifyIdentityResponse | null>(null)

  /**
   * 验证用户身份
   */
  async function verifyIdentity(
    password: string,
    action: SensitiveAction,
    resourceId?: string,
  ): Promise<VerifyIdentityResponse> {
    const response = await authApi.verifyIdentity({
      password,
      action,
      resource_id: resourceId,
    })

    if (response.verified) {
      setVerificationToken(response.verification_token, response.expires_in)
    }

    return response
  }

  /**
   * 执行敏感操作（带确认）
   *
   * @param action - 执行的操作函数，接收验证令牌作为参数
   * @param options - 操作配置
   */
  async function executeSecure<T>(
    action: (verificationToken?: string) => Promise<T>,
    options: SecureActionOptions,
  ): Promise<T | null> {
    currentOptions.value = options
    error.value = null
    verificationResult.value = null

    return new Promise((resolve) => {
      pendingAction.value = async (password?: string) => {
        isLoading.value = true
        error.value = null

        try {
          let token: string | undefined

          // 如果需要密码验证，先调用后端验证 API
          if (options.requirePassword && password && options.action) {
            const verifyResponse = await verifyIdentity(
              password,
              options.action,
              options.resourceId,
            )

            if (!verifyResponse.verified) {
              error.value = '密码验证失败'
              isLoading.value = false
              return
            }

            token = verifyResponse.verification_token
            verificationResult.value = verifyResponse
          }

          // 设置超时保护
          const timeoutMs = options.timeout || 30000
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('操作超时')), timeoutMs)
          })

          const result = await Promise.race([action(token), timeoutPromise])

          logger.info(`[SecureAction] ${options.actionName} completed successfully`)
          isDialogOpen.value = false
          clearVerificationToken()
          resolve(result)
        } catch (err) {
          const message = err instanceof Error ? err.message : '操作失败'
          error.value = message
          logger.error(`[SecureAction] ${options.actionName} failed`, { error: err })

          // 密码错误或验证失败不关闭对话框
          if (
            message.includes('密码') ||
            message.includes('password') ||
            message.includes('验证') ||
            message.includes('401')
          ) {
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
    verificationResult.value = null
  }

  /**
   * 简单密码验证（仅验证密码，不绑定操作）
   */
  async function verifyPassword(password: string): Promise<boolean> {
    try {
      const response = await authApi.verifyPassword(password)
      if (response.verified) {
        setVerificationToken(response.verification_token, response.expires_in)
      }
      return response.verified
    } catch {
      return false
    }
  }

  return {
    // 状态
    isDialogOpen: readonly(isDialogOpen),
    isLoading: readonly(isLoading),
    currentOptions: readonly(currentOptions),
    error: readonly(error),
    verificationResult: readonly(verificationResult),

    // 方法
    executeSecure,
    confirm,
    cancel,
    verifyPassword,
    verifyIdentity,
    getVerificationToken,
    clearVerificationToken,
  }
}

export type UseSecureActionReturn = ReturnType<typeof useSecureAction>
