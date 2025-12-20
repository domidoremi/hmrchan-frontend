/**
 * Security Utilities - 安全工具
 *
 * 提供 XSS 防护、输入验证、内容过滤等安全功能
 */

// HTML 实体编码映射
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
}

// 危险的 HTML 标签
const DANGEROUS_TAGS = [
  'script',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'select',
  'textarea',
  'style',
  'link',
  'meta',
  'base',
  'applet',
  'frame',
  'frameset',
  'layer',
  'ilayer',
]

// 危险的属性
const DANGEROUS_ATTRS = [
  'onclick',
  'ondblclick',
  'onmousedown',
  'onmouseup',
  'onmouseover',
  'onmousemove',
  'onmouseout',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onload',
  'onerror',
  'onunload',
  'onabort',
  'onblur',
  'onchange',
  'onfocus',
  'onreset',
  'onsubmit',
  'onselect',
  'javascript:',
  'vbscript:',
  'data:',
  'expression',
]

/**
 * 转义 HTML 特殊字符，防止 XSS 攻击
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return ''
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * 清理 HTML 内容，移除危险标签和属性
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return ''

  let clean = html

  // 移除危险标签
  DANGEROUS_TAGS.forEach((tag) => {
    const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>|<${tag}[^>]*/?>`, 'gi')
    clean = clean.replace(regex, '')
  })

  // 移除危险属性
  DANGEROUS_ATTRS.forEach((attr) => {
    const regex = new RegExp(`\\s*${attr}\\s*=\\s*["'][^"']*["']`, 'gi')
    clean = clean.replace(regex, '')
    // 处理无引号的情况
    const regexNoQuote = new RegExp(`\\s*${attr}\\s*=\\s*[^\\s>]+`, 'gi')
    clean = clean.replace(regexNoQuote, '')
  })

  // 移除 javascript: 协议
  clean = clean.replace(/javascript:/gi, '')
  clean = clean.replace(/vbscript:/gi, '')
  clean = clean.replace(/data:/gi, '')

  return clean
}

/**
 * 验证并清理评论内容
 */
export function sanitizeComment(content: string): string {
  if (!content || typeof content !== 'string') return ''

  // 去除首尾空白
  let clean = content.trim()

  // 转义 HTML 特殊字符
  clean = escapeHtml(clean)

  // 限制连续空白字符
  clean = clean.replace(/\s{3,}/g, '  ')

  // 限制连续换行
  clean = clean.replace(/\n{3,}/g, '\n\n')

  return clean
}

/**
 * 验证评论内容
 */
export interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateComment(
  content: string,
  options?: {
    minLength?: number
    maxLength?: number
  }
): ValidationResult {
  const { minLength = 1, maxLength = 2000 } = options || {}

  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'comment.validation.required' }
  }

  const trimmed = content.trim()

  if (trimmed.length < minLength) {
    return { valid: false, error: 'comment.validation.tooShort' }
  }

  if (trimmed.length > maxLength) {
    return { valid: false, error: 'comment.validation.tooLong' }
  }

  // 检测垃圾内容 (重复字符)
  if (/(.)\1{10,}/.test(trimmed)) {
    return { valid: false, error: 'comment.validation.spam' }
  }

  // 检测可能的注入攻击
  if (/<script|javascript:|onclick|onerror/i.test(trimmed)) {
    return { valid: false, error: 'comment.validation.invalid' }
  }

  return { valid: true }
}

/**
 * 生成安全的用户展示名称
 */
export function sanitizeUsername(username: string): string {
  if (!username || typeof username !== 'string') return 'Anonymous'
  return escapeHtml(username.trim().slice(0, 50))
}

/**
 * 验证 URL 是否安全
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false

  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

/**
 * 速率限制工具 - 防止频繁提交
 */
export class RateLimiter {
  private timestamps: number[] = []
  private readonly limit: number
  private readonly windowMs: number

  constructor(limit: number = 5, windowMs: number = 60000) {
    this.limit = limit
    this.windowMs = windowMs
  }

  canProceed(): boolean {
    const now = Date.now()
    // 清理过期的时间戳
    this.timestamps = this.timestamps.filter((ts) => now - ts < this.windowMs)
    return this.timestamps.length < this.limit
  }

  record(): void {
    this.timestamps.push(Date.now())
  }

  getRemainingTime(): number {
    if (this.timestamps.length === 0) return 0
    const oldest = Math.min(...this.timestamps)
    const remaining = this.windowMs - (Date.now() - oldest)
    return Math.max(0, remaining)
  }
}

/**
 * 创建评论提交的速率限制器 (每分钟最多 5 条评论)
 */
export const commentRateLimiter = new RateLimiter(5, 60000)

/**
 * 防抖函数 - 防止频繁触发
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}

/**
 * 检测内容是否包含敏感词 (基础实现，实际应该从服务端获取词库)
 */
export function containsSensitiveWords(content: string): boolean {
  // 这里只是示例，实际的敏感词应该从后端获取
  const sensitivePatterns = [/\b(spam|scam)\b/i]

  return sensitivePatterns.some((pattern) => pattern.test(content))
}
