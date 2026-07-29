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
  /Request for the Private Access Token challenge/i,

  /script-src.*was not explicitly set/i,
  /default-src.*is used as a fallback/i,
  /Executing inline script violates/i,
  /Either the 'unsafe-inline' keyword/i,
  /Content Security Policy directive/i,

  /Avoid using document\.write/i,
  /document\.write.*deprecated/i,

  /was preloaded using link preload but not used/i,
  /challenges\.cloudflare\.com.*preload/i,

  // Cloudflare Challenge Platform
  /challenge-platform/i,
  /cf-chl-/i,
  /rocket loader/i,
  /No available adapters/i,

  /challenges\.cloudflare\.com/i,
  /cloudflareinsights\.com/i,
  /cdn-cgi\/rum/i,
  /font-size:0;color:transparent/i,
  /picture-in-picture is not allowed in this document/i,
  /Permissions policy violation: xr-spatial-tracking is not allowed in this document/i,

  // Browser extension / autofill isolated-world noise
  /Received unsupported locale 'zh'\. Falling back to 'en'\./i,
  /unsupported locale 'zh'/i,

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

function shouldFilter(message: string): boolean {
  return CLOUDFLARE_PATTERNS.some((pattern) => pattern.test(message))
}

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

export function initConsoleFilter(): void {
  if (typeof window === 'undefined') return
  if (window.__consoleFilterApplied) return

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

  function createFilteredMethod(method: ConsoleMethod): (...args: unknown[]) => void {
    return (...args: unknown[]) => {
      const message = argsToString(args)

      if (shouldFilter(message)) {
        return
      }

      originalConsole[method](...args)
    }
  }

  CONSOLE_METHODS.forEach((method) => {
    console[method] = createFilteredMethod(method)
  })

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
