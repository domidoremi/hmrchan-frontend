/**
 * Type guard utilities for safe type narrowing
 * Used throughout the codebase for error handling and type safety
 */

import type { LogContext } from './logger'

/**
 * Interface representing an Axios-like error structure
 */
export interface AxiosErrorLike {
  response: {
    status: number
    data?: {
      detail?: string
      [key: string]: unknown
    }
  }
  message: string
}

/**
 * Type guard to check if an unknown error is an Axios error
 * @param error - The error to check
 * @returns True if the error has an Axios error structure
 */
export function isAxiosError(error: unknown): error is AxiosErrorLike {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const errorObj = error as Record<string, unknown>

  return (
    'response' in errorObj &&
    typeof errorObj.response === 'object' &&
    errorObj.response !== null &&
    'status' in errorObj.response
  )
}

/**
 * Converts an unknown value to a LogContext object
 * Handles Error objects, strings, objects, and primitives
 * @param value - The value to convert
 * @returns A LogContext-compatible object
 */
export function toLogContext(value: unknown): LogContext {
  if (value instanceof Error) {
    return {
      error: value.message,
      stack: value.stack,
      name: value.name,
    }
  }
  if (typeof value === 'string') {
    return { message: value }
  }
  if (typeof value === 'object' && value !== null) {
    return { data: JSON.stringify(value) }
  }
  return { value: String(value) }
}

/**
 * Type guard to check if an error is a DOMException
 * @param error - The error to check
 * @returns True if the error is a DOMException
 */
export function isDOMException(error: unknown): error is DOMException {
  return error instanceof DOMException
}
