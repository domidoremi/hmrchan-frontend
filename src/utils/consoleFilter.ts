/**
 * Console Filter - 过滤 Cloudflare 相关的控制台警告
 *
 * 过滤以下 Cloudflare 产生的噪音：
 * - Cloudflare 注入的 /cdn-cgi/challenge-platform/scripts/jsd/main.js 弃用告警
 * - Private Access Token 请求
 * - CSP (Content Security Policy) 警告
 * - document.write() 违规警告
 * - Preload 资源未使用警告
 * - Cloudflare Challenge Platform 相关日志
 */

declare global {
  interface Window {
    __restoreConsole?: () => void
    __consoleFilterApplied?: boolean
    __originalConsole?: OriginalConsole
  }
}

type ConsoleMethod = 'log' | 'warn' | 'error' | 'info'
type OriginalConsole = Record<ConsoleMethod, (...args: unknown[]) => void>
const CONSOLE_METHODS: ConsoleMethod[] = ['log', 'warn', 'error', 'info']

let errorListener: ((event: ErrorEvent) => void) | null = null
let rejectionListener: ((event: PromiseRejectionEvent) => void) | null = null
let originalConsoleRef: OriginalConsole | null = null

const CLOUDFLARE_PATTERNS = [
  // Private Access Token
  /Private Access Token/i,
  /PAT challenge/i,

  // CSP 警告
  /script-src.*was not explicitly set/i,
  /default-src.*is used as a fallback/i,
  /Executing inline script violates/i,
  /Either the 'unsafe-inline' keyword/i,
  /Content Security Policy directive/i,

  // document.write 警告
  /Avoid using document\.write/i,
  /document\.write.*deprecated/i,

  // Preload 警告
  /was preloaded using link preload but not used/i,
  /challenges\.cloudflare\.com.*preload/i,

  // Cloudflare Challenge Platform
  /challenge-platform/i,
  /cf-chl-/i,
  /rocket loader/i,
  /No available adapters/i,

  // Cloudflare 域名相关
  /challenges\.cloudflare\.com/i,
  /cloudflareinsights\.com/i,
  /cdn-cgi\/rum/i,
  /font-size:0;color:transparent/i,
  /picture-in-picture is not allowed in this document/i,

  // fetch/headers polyfill noise
  /setupReplaceUnsafeHeader\(\) should be called only once/i,

  // ResizeObserver loop warnings (layout thrash benign noise)
  /ResizeObserver loop limit exceeded/i,
  /ResizeObserver loop completed with undelivered notifications/i,

  // Non-passive touch listener warnings (often from third-party loaders)
  /Added non-passive event listener to a scroll-blocking 'touchstart' event/i,

  // Cloudflare challenge script deprecation warnings
  /Protected Audience API/i,
  /StorageType\.persistent/i,
  /Shared Storage API/i,
]

/**
 * 检查消息是否应该被过滤
 */
function shouldFilter(message: string): boolean {
  return CLOUDFLARE_PATTERNS.some((pattern) => pattern.test(message))
}

/**
 * 将参数转换为字符串用于模式匹配
 */
function argsToString(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'string') return arg
      if (arg instanceof Error) return arg.message
      try {
        return JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    })
    .join(' ')
}

/**
 * 浏览器原生网络错误的过滤模式
 * 这些错误不经过 console.*，而是通过 window error / unhandledrejection 事件触发
 */
const NETWORK_ERROR_PATTERNS = [/cloudflareinsights\.com/i, /cdn-cgi\/rum/i, /beacon\.min\.js/i]

function shouldFilterNetworkError(event: Event | PromiseRejectionEvent): boolean {
  const message =
    event instanceof ErrorEvent
      ? (event.message ?? '')
      : 'reason' in event
        ? String((event as PromiseRejectionEvent).reason)
        : ''
  return NETWORK_ERROR_PATTERNS.some((p) => p.test(message))
}

/**
 * 初始化控制台过滤器
 */
export function initConsoleFilter(): void {
  // 只在浏览器环境中运行
  if (typeof window === 'undefined') return
  if (window.__consoleFilterApplied) return

  // 保存原始的控制台方法
  const originalConsole: OriginalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
  }
  originalConsoleRef = originalConsole
  if (import.meta.env.DEV) {
    window.__originalConsole = originalConsole
  }

  // 创建过滤包装器
  function createFilteredMethod(method: ConsoleMethod): (...args: unknown[]) => void {
    return (...args: unknown[]) => {
      const message = argsToString(args)

      // 如果消息匹配 Cloudflare 模式，则过滤掉
      if (shouldFilter(message)) {
        return
      }

      // 否则调用原始方法
      originalConsole[method](...args)
    }
  }

  // 替换控制台方法
  CONSOLE_METHODS.forEach((method) => {
    console[method] = createFilteredMethod(method)
  })

  // 拦截浏览器原生网络错误（CORS / net::ERR_FAILED 等）
  // 这些不经过 console.*，需要通过事件监听器捕获
  errorListener = (e) => {
    if (shouldFilterNetworkError(e)) {
      e.preventDefault()
    }
  }
  rejectionListener = (e) => {
    if (shouldFilterNetworkError(e)) {
      e.preventDefault()
    }
  }
  window.addEventListener('error', errorListener)
  window.addEventListener('unhandledrejection', rejectionListener)

  window.__consoleFilterApplied = true

  // 开发环境下提供恢复方法
  if (import.meta.env.DEV) {
    window.__restoreConsole = () => {
      CONSOLE_METHODS.forEach((method) => {
        console[method] = originalConsole[method]
      })
      if (errorListener) {
        window.removeEventListener('error', errorListener)
        errorListener = null
      }
      if (rejectionListener) {
        window.removeEventListener('unhandledrejection', rejectionListener)
        rejectionListener = null
      }
      window.__consoleFilterApplied = false
      console.log('✅ Console filter removed. Original console methods restored.')
    }

    console.log('🔇 Cloudflare console filter enabled. Call window.__restoreConsole() to disable.')
  }
}

export function disposeConsoleFilter(): void {
  if (typeof window === 'undefined') return
  if (!window.__consoleFilterApplied) return

  const originalConsole =
    (import.meta.env.DEV ? window.__originalConsole : originalConsoleRef) ?? originalConsoleRef
  if (!originalConsole) return

  CONSOLE_METHODS.forEach((method) => {
    console[method] = originalConsole[method]
  })

  if (errorListener) {
    window.removeEventListener('error', errorListener)
    errorListener = null
  }

  if (rejectionListener) {
    window.removeEventListener('unhandledrejection', rejectionListener)
    rejectionListener = null
  }

  window.__consoleFilterApplied = false
  originalConsoleRef = null
}
