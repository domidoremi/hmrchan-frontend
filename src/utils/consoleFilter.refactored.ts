/**
 * Console Filter - 过滤 Cloudflare 和其他第三方服务的控制台噪音
 *
 * 提供可配置的控制台消息过滤，主要用于过滤：
 * - Cloudflare 服务产生的警告和日志
 * - CSP (Content Security Policy) 相关警告
 * - 第三方脚本的已知噪音
 */

declare global {
  interface Window {
    __restoreConsole?: () => void
  }
}

type ConsoleMethod = 'log' | 'warn' | 'error' | 'info'
type OriginalConsole = Record<ConsoleMethod, (...args: unknown[]) => void>

/**
 * 按类别组织的过滤模式
 * 便于维护和选择性启用/禁用
 */
const FILTER_PATTERNS = {
  /** Content Security Policy 相关警告 */
  csp: [
    /script-src.*was not explicitly set/i,
    /default-src.*is used as a fallback/i,
    /Executing inline script violates/i,
    /Either the 'unsafe-inline' keyword/i,
    /Content Security Policy directive/i,
  ],

  /** Cloudflare 服务相关 */
  cloudflare: [
    /Private Access Token/i,
    /PAT challenge/i,
    /challenge-platform/i,
    /cf-chl-/i,
    /turnstile/i,
    /rocket-loader/i,
    /challenges\.cloudflare\.com/i,
    /cloudflareinsights\.com/i,
  ],

  /** 已弃用 API 警告 */
  deprecations: [/Avoid using document\.write/i, /document\.write.*deprecated/i],

  /** 资源预加载警告 */
  preload: [
    /was preloaded using link preload but not used/i,
    /challenges\.cloudflare\.com.*preload/i,
  ],
} as const

/** 所有默认过滤模式 */
const DEFAULT_PATTERNS = Object.values(FILTER_PATTERNS).flat()

/**
 * 控制台过滤器配置
 */
export interface ConsoleFilterConfig {
  /** 自定义过滤模式（追加到默认模式） */
  patterns?: RegExp[]
  /** 排除的模式（即使匹配默认模式也不过滤） */
  excludePatterns?: RegExp[]
  /** 是否在开发环境启用（默认：仅生产环境） */
  enableInDev?: boolean
  /** 是否记录被过滤的消息（用于调试） */
  logFiltered?: boolean
  /** 选择性启用的类别 */
  categories?: Array<keyof typeof FILTER_PATTERNS>
}

/**
 * 检查消息是否应该被过滤
 */
function shouldFilter(message: string, patterns: RegExp[], excludePatterns: RegExp[]): boolean {
  // 先检查排除模式
  if (excludePatterns.some((pattern) => pattern.test(message))) {
    return false
  }

  // 再检查过滤模式
  return patterns.some((pattern) => pattern.test(message))
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
 *
 * @example
 * ```ts
 * // 使用默认配置
 * initConsoleFilter()
 *
 * // 自定义配置
 * initConsoleFilter({
 *   enableInDev: true,
 *   categories: ['cloudflare', 'csp'],
 *   excludePatterns: [/important/i]
 * })
 * ```
 */
export function initConsoleFilter(config: ConsoleFilterConfig = {}): void {
  // 只在浏览器环境中运行
  if (typeof window === 'undefined') return

  // 开发环境默认不启用（除非明确配置）
  if (import.meta.env.DEV && !config.enableInDev) {
    return
  }

  const {
    patterns: customPatterns = [],
    excludePatterns = [],
    logFiltered = false,
    categories,
  } = config

  // 构建最终的过滤模式列表
  let basePatterns = DEFAULT_PATTERNS
  if (categories && categories.length > 0) {
    basePatterns = categories.flatMap((cat) => FILTER_PATTERNS[cat])
  }
  const allPatterns = [...basePatterns, ...customPatterns]

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

      // 检查是否应该过滤
      if (shouldFilter(message, allPatterns, excludePatterns)) {
        if (logFiltered) {
          originalConsole.log(`[Filtered ${method}]`, message)
        }
        return
      }

      // 调用原始方法
      originalConsole[method](...args)
    }
  }

  // 替换控制台方法
  const methods: ConsoleMethod[] = ['log', 'warn', 'error', 'info']
  methods.forEach((method) => {
    console[method] = createFilteredMethod(method)
  })

  // 提供恢复方法
  window.__restoreConsole = () => {
    methods.forEach((method) => {
      console[method] = originalConsole[method]
    })
    console.log('✅ Console filter removed. Original console methods restored.')
  }

  if (import.meta.env.DEV) {
    console.log('🔇 Console filter enabled. Call window.__restoreConsole() to disable.')
  }
}

/**
 * 导出过滤模式供外部使用
 */
export { FILTER_PATTERNS }
