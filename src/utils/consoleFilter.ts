/**
 * Console Filter - 过滤 Cloudflare 相关的控制台警告
 *
 * 过滤以下 Cloudflare 产生的噪音：
 * - Private Access Token 请求
 * - CSP (Content Security Policy) 警告
 * - document.write() 违规警告
 * - Preload 资源未使用警告
 * - Cloudflare Challenge Platform 相关日志
 */

declare global {
  interface Window {
    __restoreConsole?: () => void
  }
}

type ConsoleMethod = 'log' | 'warn' | 'error' | 'info'
type OriginalConsole = Record<ConsoleMethod, (...args: unknown[]) => void>

const CLOUDFLARE_PATTERNS = [
  // Private Access Token
  /Private Access Token/i,
  /PAT challenge/i,

  // CSP 警告
  /script-src.*was not explicitly set/i,
  /default-src.*is used as a fallback/i,

  // document.write 警告
  /Avoid using document\.write/i,
  /document\.write.*deprecated/i,

  // Preload 警告
  /was preloaded using link preload but not used/i,
  /challenges\.cloudflare\.com.*preload/i,

  // Cloudflare Challenge Platform
  /challenge-platform/i,
  /cf-chl-/i,
  /turnstile/i,

  // Cloudflare 域名相关
  /challenges\.cloudflare\.com/i,
  /cloudflareinsights\.com/i,
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
 * 初始化控制台过滤器
 */
export function initConsoleFilter(): void {
  // 只在浏览器环境中运行
  if (typeof window === 'undefined') return

  // 保存原始的控制台方法
  const originalConsole: OriginalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
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
  const methods: ConsoleMethod[] = ['log', 'warn', 'error', 'info']
  methods.forEach((method) => {
    console[method] = createFilteredMethod(method)
  })

  // 开发环境下提供恢复方法
  if (import.meta.env.DEV) {
    window.__restoreConsole = () => {
      methods.forEach((method) => {
        console[method] = originalConsole[method]
      })
      console.log('✅ Console filter removed. Original console methods restored.')
    }

    console.log('🔇 Cloudflare console filter enabled. Call window.__restoreConsole() to disable.')
  }
}
