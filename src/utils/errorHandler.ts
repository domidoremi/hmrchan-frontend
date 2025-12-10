/**
 * 统一错误处理系统
 * Unified Error Handling System
 */

import { useI18n } from 'vue-i18n'
import { useToastStore } from '@/stores'
import logger from '@/utils/logger'
import { errorMonitor } from './errorMonitor'

export interface ErrorResponse {
  message: string
  code?: string
  status?: number
  details?: unknown
}

export interface ErrorHandlerOptions {
  silent?: boolean // 是否静默处理（不显示通知）
  logToConsole?: boolean // 是否记录到控制台
  customMessage?: string // 自定义错误消息
}

/**
 * HTTP错误接口（兼容多种HTTP客户端）
 */
interface HttpError extends Error {
  response?: {
    status: number
    data?: Record<string, unknown>
  }
}

/**
 * 解析HTTP错误（兼容axios和ky）
 */
export function parseHttpError(error: HttpError): ErrorResponse {
  const { t } = useI18n()

  // 兼容 axios 风格（response.data）和 ky 风格（在 beforeError 中附加的 responseData）
  const rawResponse = (error as unknown as { response?: { status?: number; data?: unknown } })
    .response

  // 网络错误（没有任何响应）
  if (!rawResponse) {
    return {
      message: t('errors.networkError', 'Network error, please check your connection'),
      code: 'NETWORK_ERROR',
      status: 0,
    }
  }

  const status = rawResponse.status ?? 0
  const data = ((rawResponse as { data?: unknown }).data ??
    (error as unknown as { responseData?: unknown }).responseData ??
    {}) as Record<string, unknown>

  const errorCode = typeof data?.error_code === 'string' ? (data.error_code as string) : undefined
  const details = Object.prototype.hasOwnProperty.call(data, 'details') ? data.details : undefined
  const errorMessage = typeof data?.message === 'string' ? (data.message as string) : undefined

  // 根据 HTTP 状态码和后端统一错误格式返回错误
  switch (status) {
    case 400:
      return {
        message: errorMessage || t('errors.badRequest', 'Invalid request'),
        code: errorCode || 'BAD_REQUEST',
        status,
        details,
      }

    case 401:
      return {
        message: errorMessage || t('errors.unauthorized', 'Please login first'),
        code: errorCode || 'UNAUTHORIZED',
        status,
        details,
      }

    case 403:
      return {
        message: errorMessage || t('errors.permissionDenied', 'Permission denied'),
        code: errorCode || 'FORBIDDEN',
        status,
        details,
      }

    case 404:
      return {
        message: errorMessage || t('errors.notFound', 'Resource not found'),
        code: errorCode || 'NOT_FOUND',
        status,
        details,
      }

    case 429:
      return {
        message:
          errorMessage || t('errors.tooManyRequests', 'Too many requests, please try again later'),
        code: errorCode || 'TOO_MANY_REQUESTS',
        status,
        details,
      }

    case 500:
    case 502:
    case 503:
    case 504:
      return {
        message: errorMessage || t('errors.serverError', 'Server error, please try again later'),
        code: errorCode || 'SERVER_ERROR',
        status,
        details,
      }

    default:
      return {
        message: errorMessage || t('errors.unknownError', 'Unknown error'),
        code: errorCode || 'UNKNOWN_ERROR',
        status,
        details,
      }
  }
}

/**
 * 统一错误处理器
 */
export function handleError(
  error: unknown,
  context: string = 'Unknown',
  options: ErrorHandlerOptions = {},
): ErrorResponse {
  const { silent = false, logToConsole = true, customMessage } = options

  let errorResponse: ErrorResponse

  // 解析错误类型
  if ((error as HttpError).response) {
    errorResponse = parseHttpError(error as HttpError)
  } else if (error instanceof Error) {
    errorResponse = {
      message: customMessage || error.message,
      code: 'JS_ERROR',
    }
  } else {
    errorResponse = {
      message: customMessage || String(error),
      code: 'UNKNOWN',
    }
  }

  // 记录到控制台（使用 logger 而不是 console.error）
  if (logToConsole) {
    logger.error(`Error: ${errorResponse.message}`, {
      category: context,
      code: errorResponse.code,
      status: errorResponse.status,
    })
  }

  // 错误监控
  errorMonitor.logError(context, errorResponse.message, {
    code: errorResponse.code,
    status: errorResponse.status,
    stack: error instanceof Error ? error.stack : undefined,
    details: errorResponse.details,
  })

  // Toast通知
  if (!silent) {
    try {
      const toastStore = useToastStore()
      toastStore.error(errorResponse.message, context)
    } catch (e) {
      // Toast store可能未初始化，降级为logger
      logger.warn('[ErrorHandler] Failed to show toast', {
        error: e instanceof Error ? e.message : String(e),
        context,
      })
    }
  }

  return errorResponse
}

/**
 * 异步操作错误处理包装器
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: string,
  options: ErrorHandlerOptions = {},
): Promise<{ data: T | null; error: ErrorResponse | null }> {
  try {
    const data = await fn()
    return { data, error: null }
  } catch (error) {
    const errorResponse = handleError(error, context, options)
    return { data: null, error: errorResponse }
  }
}

/**
 * 同步操作错误处理包装器
 */
export function withErrorHandlingSync<T>(
  fn: () => T,
  context: string,
  options: ErrorHandlerOptions = {},
): { data: T | null; error: ErrorResponse | null } {
  try {
    const data = fn()
    return { data, error: null }
  } catch (error) {
    const errorResponse = handleError(error, context, options)
    return { data: null, error: errorResponse }
  }
}

/**
 * 简化的异步错误处理包装器 - 直接抛出错误但记录日志
 * 适用于需要在组件中使用 try-catch 但想要统一日志记录的场景
 */
export async function withLogging<T>(
  fn: () => Promise<T>,
  context: string,
  options: Omit<ErrorHandlerOptions, 'silent'> = {},
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    // 记录错误但不显示 toast（silent = true）
    handleError(error, context, { ...options, silent: true })
    throw error
  }
}

/**
 * 创建错误处理的Hook
 */
export function useErrorHandler(context: string = 'App') {
  return {
    handleError: (error: unknown, options?: ErrorHandlerOptions) =>
      handleError(error, context, options),

    withErrorHandling: <T>(fn: () => Promise<T>, options?: ErrorHandlerOptions) =>
      withErrorHandling(fn, context, options),

    withLogging: <T>(fn: () => Promise<T>, options?: Omit<ErrorHandlerOptions, 'silent'>) =>
      withLogging(fn, context, options),
  }
}
