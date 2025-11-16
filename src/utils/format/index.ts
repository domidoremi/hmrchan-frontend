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

// Re-export formatDuration from common for backward compatibility
import { FormatHelper } from '../common'
export const formatDuration = FormatHelper.formatDuration

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
