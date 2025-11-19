/**
 * Error handling utilities - Unified export
 */

// Error Handler
export {
  handleError,
  parseHttpError,
  withErrorHandling,
  withErrorHandlingSync,
  withLogging,
  useErrorHandler,
} from './errorHandler'
export type { ErrorResponse, ErrorHandlerOptions } from './errorHandler'

// Error Monitor
export { errorMonitor } from './errorMonitor'
export type { ErrorLog, ErrorStats } from './errorMonitor'
