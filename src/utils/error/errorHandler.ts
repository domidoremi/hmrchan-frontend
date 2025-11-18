/**
 * 统一错误处理系统
 * Unified Error Handling System
 */

import type { AxiosError } from 'axios'
import { useI18n } from 'vue-i18n'
import { useToastStore } from '@/stores'
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
 * 解析Axios错误
 */
export function parseAxiosError(error: AxiosError): ErrorResponse {
  const { t } = useI18n()

  // 网络错误
  if (!error.response) {
    return {
      message: t('errors.networkError', 'Network error, please check your connection'),
      code: 'NETWORK_ERROR',
      status: 0,
    }
  }

  const status = error.response.status
  const data = error.response.data as Record<string, unknown>

  // 根据HTTP状态码返回相应错误
  const errorMessage = typeof data?.message === 'string' ? data.message : undefined

  switch (status) {
    case 400:
      return {
        message: errorMessage || t('errors.badRequest', 'Invalid request'),
        code: 'BAD_REQUEST',
        status,
        details: data,
      }

    case 401:
      return {
        message: errorMessage || t('errors.unauthorized', 'Please login first'),
        code: 'UNAUTHORIZED',
        status,
      }

    case 403:
      return {
        message: errorMessage || t('errors.permissionDenied', 'Permission denied'),
        code: 'FORBIDDEN',
        status,
      }

    case 404:
      return {
        message: errorMessage || t('errors.notFound', 'Resource not found'),
        code: 'NOT_FOUND',
        status,
      }

    case 429:
      return {
        message:
          errorMessage || t('errors.tooManyRequests', 'Too many requests, please try again later'),
        code: 'TOO_MANY_REQUESTS',
        status,
      }

    case 500:
    case 502:
    case 503:
    case 504:
      return {
        message: errorMessage || t('errors.serverError', 'Server error, please try again later'),
        code: 'SERVER_ERROR',
        status,
      }

    default:
      return {
        message: errorMessage || t('errors.unknownError', 'Unknown error'),
        code: 'UNKNOWN_ERROR',
        status,
        details: data,
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
  if ((error as AxiosError).isAxiosError) {
    errorResponse = parseAxiosError(error as AxiosError)
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

  // 记录到控制台
  if (logToConsole) {
    console.error(`[${context}] Error:`, {
      message: errorResponse.message,
      code: errorResponse.code,
      status: errorResponse.status,
      details: errorResponse.details,
      original: error,
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
      // Toast store可能未初始化，降级为console
      console.warn('[ErrorHandler] Failed to show toast:', e)
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
 * 创建错误处理的Hook
 */
export function useErrorHandler(context: string = 'App') {
  return {
    handleError: (error: unknown, options?: ErrorHandlerOptions) =>
      handleError(error, context, options),

    withErrorHandling: <T>(fn: () => Promise<T>, options?: ErrorHandlerOptions) =>
      withErrorHandling(fn, context, options),
  }
}
