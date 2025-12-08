/**
 * Format utilities - Unified export
 */

// Date formatting
export {
  formatRelativeTime,
  formatDateTime,
  formatDate,
  formatTime,
  formatDateTimeIntl,
  formatDateRange,
  formatCalendar,
  formatSmart,
  getTimezone,
  formatTimezone,
  isToday,
  isThisWeek,
  isThisMonth,
  isThisYear,
} from './date'

// Number formatting
export {
  formatNumberWithLocale,
  formatCurrency,
  formatPercentage,
  formatCompactNumber,
  formatFileSize,
  formatNumberRange,
  formatOrdinal,
} from './number'

// Legacy exports for backward compatibility
export { formatCompactNumber as formatNumber } from './number'

// Duration formatting (migrated from common.ts)
export { formatDuration } from './date'

// Text formatting
export {
  truncateText,
  highlightKeyword,
  generateId,
  copyToClipboard,
  isValidUrl,
  parseQuery,
  buildQuery,
  getPlatformColor,
  downloadFile,
} from './text'

// URL formatting
export {
  getApiBaseUrl,
  getApiEndpoint,
  resolveMediaUrl,
  resolveMediaUrls,
  isValidUUID,
  validateMediaId,
} from './url'
