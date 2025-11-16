# Enhanced Logger Usage Examples

## Overview

The logger has been enhanced with the following features:

- **Log Levels**: DEBUG, INFO, WARN, ERROR, CRITICAL
- **Timestamps**: Automatic ISO timestamp for each log
- **Context Information**: Category and custom context data
- **Formatting**: Structured log messages with consistent format
- **Colors**: Color-coded logs in development mode
- **Performance Tracking**: Built-in time() and timeEnd() methods

## Configuration

```typescript
import logger, { LogLevel } from '@/utils/logger'

// Configure logger (typically in main.ts)
logger.setConfig({
  level: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.WARN,
  enableTimestamp: true,
  enableContext: true,
  enableColors: true,
})

// Set global context
logger.setContext({ category: 'App', sessionId: 'abc123' })
```

## Basic Usage

### Simple Logging

```typescript
import logger from '@/utils/logger'

// Debug level (only in development)
logger.debug('Component mounted')

// Info level
logger.info('User action completed')

// Warning level
logger.warn('Deprecated API usage detected')

// Error level
logger.error('Failed to load data')

// Critical level (always logged, even in production)
logger.critical('Database connection lost')
```

### Logging with Context

```typescript
import logger from '@/utils/logger'

// Add context to individual logs
logger.info('User logged in', {
  category: 'Auth',
  userId: '12345',
  username: 'john_doe',
})

logger.error('API request failed', {
  category: 'API',
  endpoint: '/posts',
  status: 500,
  error: 'Internal Server Error',
})
```

## Advanced Usage

### Category-based Logging

```typescript
// In a store or composable
const logContext = { category: 'PostsStore' }

logger.info('Fetching posts', { ...logContext, page: 1 })
logger.debug('Cache hit', { ...logContext, cacheKey: 'posts-page-1' })
logger.error('Failed to fetch posts', { ...logContext, error: 'Network error' })
```

### Performance Tracking

```typescript
import logger from '@/utils/logger'

// Start timing
logger.time('Data processing', { category: 'Performance' })

// ... do some work ...

// End timing (automatically logs duration)
logger.timeEnd('Data processing', { category: 'Performance' })
```

### Grouped Logs

```typescript
import logger from '@/utils/logger'

logger.group(
  'User Registration Flow',
  () => {
    logger.info('Validating input')
    logger.info('Creating user account')
    logger.info('Sending welcome email')
  },
  { category: 'Auth' },
)
```

### Table Logging

```typescript
import logger from '@/utils/logger'

const users = [
  { id: 1, name: 'John', role: 'admin' },
  { id: 2, name: 'Jane', role: 'user' },
]

logger.table(users, { category: 'Users' })
```

## Real-World Examples

### API Client

```typescript
// In api/client.ts
logger.setContext({ category: 'API' })

// Request logging
logger.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`, {
  params: config.params,
})

// Response logging
logger.debug(`Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
  status: response.status,
  statusText: response.statusText,
})

// Error logging
logger.error(`Response error: ${method} ${url}`, {
  status,
  statusText,
  data: error.response.data,
})
```

### Store Actions

```typescript
// In stores/auth.ts
const logContext = { category: 'AuthStore' }

async function login(credentials: LoginRequest) {
  try {
    const response = await api.post('/auth/login', credentials)
    logger.info('User logged in successfully', {
      ...logContext,
      username: credentials.username,
    })
    return response
  } catch (err) {
    logger.error('Login failed', {
      ...logContext,
      username: credentials.username,
      error: errorResponse.message,
    })
    throw err
  }
}
```

### Cache Operations

```typescript
// In utils/cache/CacheManager.ts
const logContext = { category: 'CacheManager' }

async function get(key: string) {
  logger.debug('Cache lookup', { ...logContext, key })

  const value = await this.memoryCache.get(key)
  if (value) {
    logger.debug('Memory cache hit', { ...logContext, key })
    return value
  }

  logger.debug('Memory cache miss', { ...logContext, key })
  return null
}
```

## Log Output Format

### Development Mode

```
[2024-01-15T10:30:45.123Z] [INFO] [API] Request: GET /posts | Context: {"params":{"page":1}}
[2024-01-15T10:30:45.456Z] [DEBUG] [CacheManager] Cache hit | Context: {"cacheKey":"posts-page-1"}
[2024-01-15T10:30:45.789Z] [ERROR] [AuthStore] Login failed | Context: {"username":"john","error":"Invalid credentials"}
```

### Production Mode

Only WARN, ERROR, and CRITICAL logs are shown:

```
[2024-01-15T10:30:45.789Z] [ERROR] [AuthStore] Login failed | Context: {"username":"john","error":"Invalid credentials"}
[2024-01-15T10:30:46.123Z] [CRITICAL] [App] Database connection lost | Context: {"error":"Connection timeout"}
```

## Best Practices

1. **Use appropriate log levels**:

   - DEBUG: Detailed diagnostic information
   - INFO: General informational messages
   - WARN: Warning messages for potentially harmful situations
   - ERROR: Error events that might still allow the app to continue
   - CRITICAL: Severe errors that require immediate attention

2. **Always include context**:

   ```typescript
   // Good
   logger.error('Failed to save', { category: 'Settings', userId: '123', error: err.message })

   // Bad
   logger.error('Failed to save')
   ```

3. **Use category consistently**:

   - Set category at the module level
   - Use descriptive category names (e.g., 'API', 'AuthStore', 'CacheManager')

4. **Don't log sensitive information**:

   ```typescript
   // Bad - logs password
   logger.info('Login attempt', { username, password })

   // Good - omits password
   logger.info('Login attempt', { username })
   ```

5. **Use performance tracking for slow operations**:
   ```typescript
   logger.time('Database query', { category: 'Performance' })
   await db.query(...)
   logger.timeEnd('Database query', { category: 'Performance' })
   ```

## Migration from Old Logger

### Before

```typescript
logger.log('[Auth] User logged in:', username)
logger.error('[API] Request failed:', error)
logger.criticalError('[Cache] Init failed:', error)
```

### After

```typescript
logger.info('User logged in', { category: 'Auth', username })
logger.error('Request failed', { category: 'API', error: error.message })
logger.critical('Init failed', { category: 'Cache', error: error.message })
```
