import { ApiError, type PaginatedApiResponse } from '@/api/client'
import { deepClone } from '@/utils/modernAPIs'

export const PUBLIC_FALLBACK_PREFIX = '__public_fallback__'

export type PublicPageDataSource = 'live' | 'cached' | 'fallback'

export function createPublicFallbackId(scope: string, key: string): string {
  const normalizedScope = scope.trim().replace(/\s+/g, '-').toLowerCase()
  const normalizedKey = key.trim().replace(/\s+/g, '-').toLowerCase()
  return `${PUBLIC_FALLBACK_PREFIX}${normalizedScope}__${normalizedKey}`
}

export function clonePublicSnapshot<T>(value: T): T {
  return deepClone(value)
}

export function isPublicFallbackId(id: string | null | undefined): boolean {
  return Boolean(id?.startsWith(PUBLIC_FALLBACK_PREFIX))
}

export function resolvePublicFallbackReason(error: unknown): string | null {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return null
}

export function isServiceUnavailableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return [403, 408, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 530].includes(
      error.status
    )
  }

  const message = error instanceof Error ? error.message.toLowerCase() : ''
  return (
    message.includes('service unavailable') ||
    message.includes('temporarily unavailable') ||
    message.includes('upstream connect error') ||
    message.includes('forbidden') ||
    message.includes('error code: 1016') ||
    message.includes('error code: 1033')
  )
}

export function paginateFallbackItems<T>(
  items: readonly T[],
  page = 1,
  pageSize = 20
): PaginatedApiResponse<T> {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1
  const safePageSize = Number.isFinite(pageSize) ? Math.max(1, Math.trunc(pageSize)) : 20
  const total = items.length
  const totalPages = total === 0 ? 0 : Math.ceil(total / safePageSize)
  const start = (safePage - 1) * safePageSize

  return {
    items: items.slice(start, start + safePageSize),
    total,
    page: safePage,
    page_size: safePageSize,
    total_pages: totalPages,
    has_next: totalPages > 0 && safePage < totalPages,
    has_prev: totalPages > 0 && safePage > 1,
  }
}

export function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString()
}

export function hoursAgo(hours: number): string {
  return minutesAgo(hours * 60)
}

export function daysAgo(days: number): string {
  return hoursAgo(days * 24)
}

export function daysFromNow(days: number, hour = 12, minute = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

export function sortByIsoDate<T>(
  items: readonly T[],
  getter: (item: T) => string | null | undefined,
  order: 'asc' | 'desc' = 'desc'
): T[] {
  const direction = order === 'asc' ? 1 : -1
  return [...items].sort((left, right) => {
    const leftTime = Date.parse(getter(left) ?? '') || 0
    const rightTime = Date.parse(getter(right) ?? '') || 0
    return (leftTime - rightTime) * direction
  })
}
