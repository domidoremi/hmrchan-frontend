import DOMPurify from 'dompurify'

// Shared browser security boundaries for HTML, URLs, object keys, and window messaging.

let domPurifyHooksConfigured = false

function configureDomPurifyHooks(): void {
  if (domPurifyHooksConfigured) return

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (!(node instanceof Element)) return

    if (node.hasAttribute('href')) {
      const href = node.getAttribute('href') ?? ''
      const loweredHref = href.trim().toLowerCase()
      if (loweredHref.startsWith('javascript:')) {
        node.removeAttribute('href')
      } else if (/^https?:\/\//i.test(href)) {
        node.setAttribute('rel', 'noopener noreferrer nofollow')
      }
    }

    if (node.hasAttribute('src')) {
      const src = node.getAttribute('src') ?? ''
      if (src.trim().toLowerCase().startsWith('javascript:')) {
        node.removeAttribute('src')
      }
    }
  })

  domPurifyHooksConfigured = true
}

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

export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return ''
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char)
}

export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return ''
  configureDomPurifyHooks()
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'b',
      'i',
      'em',
      'strong',
      'a',
      'p',
      'br',
      'ul',
      'ol',
      'li',
      'blockquote',
      'code',
      'pre',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'span',
      'div',
      'img',
      'figure',
      'figcaption',
      'hr',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'sup',
      'sub',
      'del',
      'ins',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'width', 'height', 'rel'],
    ALLOW_DATA_ATTR: false,
  })
}

export function sanitizeComment(content: string): string {
  if (!content || typeof content !== 'string') return ''

  let clean = content.trim()

  clean = escapeHtml(clean)

  clean = clean.replace(/\s{3,}/g, '  ')

  clean = clean.replace(/\n{3,}/g, '\n\n')

  return clean
}

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

  if (/(.)\1{10,}/.test(trimmed)) {
    return { valid: false, error: 'comment.validation.spam' }
  }

  if (/<script|javascript:|onclick|onerror/i.test(trimmed)) {
    return { valid: false, error: 'comment.validation.invalid' }
  }

  return { valid: true }
}

export function sanitizeUsername(username: string): string {
  if (!username || typeof username !== 'string') return 'Anonymous'
  return escapeHtml(username.trim().slice(0, 50))
}

export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false

  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

export function normalizeHttpUrl(url: string | null | undefined): string | null {
  if (typeof url !== 'string') return null
  const candidate = url.trim()
  if (!candidate) return null

  const isRootRelative = candidate.startsWith('/') && !candidate.startsWith('//')
  if (!isRootRelative && !/^[a-z][a-z\d+.-]*:/iu.test(candidate)) return null

  try {
    const baseOrigin =
      typeof window !== 'undefined' ? window.location.origin : 'https://momichan.com'
    const parsed = new URL(candidate, baseOrigin)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    if (parsed.username || parsed.password) return null

    return isRootRelative ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.toString()
  } catch {
    return null
  }
}

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

export const commentRateLimiter = new RateLimiter(5, 60000)

export function containsSensitiveWords(content: string): boolean {
  const sensitivePatterns = [/\b(spam|scam)\b/i]

  return sensitivePatterns.some((pattern) => pattern.test(content))
}

const DANGEROUS_PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export function hasDangerousKey(key: string): boolean {
  return DANGEROUS_PROTO_KEYS.has(key)
}

export function safeMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: Array<Record<string, unknown>>
): T {
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue

    for (const key of Object.keys(source)) {
      if (hasDangerousKey(key)) continue
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue

      const sourceVal = source[key]
      const targetVal = (target as Record<string, unknown>)[key]

      if (
        sourceVal !== null &&
        typeof sourceVal === 'object' &&
        !Array.isArray(sourceVal) &&
        targetVal !== null &&
        typeof targetVal === 'object' &&
        !Array.isArray(targetVal)
      ) {
        ;(target as Record<string, unknown>)[key] = safeMerge(
          { ...(targetVal as Record<string, unknown>) },
          sourceVal as Record<string, unknown>
        )
      } else {
        ;(target as Record<string, unknown>)[key] = sourceVal
      }
    }
  }

  return target
}

export function safeJsonParse<T = unknown>(json: string): T | null {
  try {
    return JSON.parse(json, (_key, value) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        for (const k of Object.keys(value)) {
          if (hasDangerousKey(k)) {
            delete value[k]
          }
        }
      }
      return value
    }) as T
  } catch {
    return null
  }
}

const REDIRECT_WHITELIST = ['momichan.com', 'www.momichan.com', 'himeri.momichan.com']

export function isSafeRedirect(url: string): boolean {
  if (!url || typeof url !== 'string') return false

  // Root-relative paths are safe after protocol-relative URLs are excluded.
  if (url.startsWith('/') && !url.startsWith('//')) return true

  try {
    const parsed = new URL(url, window.location.origin)

    if (!['http:', 'https:'].includes(parsed.protocol)) return false

    return REDIRECT_WHITELIST.some(
      (domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    )
  } catch {
    return false
  }
}

export function safeRedirect(url: string, fallback: string = '/'): void {
  if (isSafeRedirect(url)) {
    window.location.href = url
  } else {
    window.location.href = fallback
  }
}

const PRIMARY_FRONTEND_MESSAGE_ORIGIN = 'https://momichan.com'
const TRUSTED_ORIGINS = new Set([
  PRIMARY_FRONTEND_MESSAGE_ORIGIN,
  'https://www.momichan.com',
  'https://challenges.cloudflare.com',
])

function normalizeMessageOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '')
}

function resolveRuntimeFrontendOrigin(): string | null {
  if (typeof window === 'undefined' || !window.location.origin) {
    return null
  }

  const origin = normalizeMessageOrigin(window.location.origin)
  return origin || null
}

export function getTrustedFrontendOrigins(): string[] {
  const origins = new Set<string>([PRIMARY_FRONTEND_MESSAGE_ORIGIN])
  const runtimeOrigin = resolveRuntimeFrontendOrigin()

  if (import.meta.env.PROD) {
    if (runtimeOrigin) {
      origins.add(runtimeOrigin)
    }

    return Array.from(origins)
  }

  const configuredOrigin = normalizeMessageOrigin(import.meta.env.VITE_FRONTEND_ORIGIN ?? '')
  if (configuredOrigin) {
    origins.add(configuredOrigin)
  }
  if (runtimeOrigin) {
    origins.add(runtimeOrigin)
  }

  return Array.from(origins)
}

export function resolveTrustedFrontendTargetOrigin(): string {
  const runtimeOrigin = resolveRuntimeFrontendOrigin()
  const trustedOrigins = getTrustedFrontendOrigins()

  if (runtimeOrigin && trustedOrigins.includes(runtimeOrigin)) {
    return runtimeOrigin
  }

  return trustedOrigins[0] ?? PRIMARY_FRONTEND_MESSAGE_ORIGIN
}

export type MessageHandler<T = unknown> = (data: T, event: MessageEvent) => void

export function createSecureMessageHandler<T = unknown>(
  handler: MessageHandler<T>,
  options?: {
    allowedOrigins?: string[]
    validateData?: (data: unknown) => data is T
  }
): () => void {
  const origins = new Set<string>()
  if (options?.allowedOrigins?.length) {
    for (const origin of options.allowedOrigins) {
      const normalized = normalizeMessageOrigin(origin)
      if (normalized) {
        origins.add(normalized)
      }
    }
  } else {
    for (const origin of TRUSTED_ORIGINS) {
      origins.add(origin)
    }
    if (typeof window !== 'undefined' && window.location.origin) {
      origins.add(normalizeMessageOrigin(window.location.origin))
    }
  }

  function onMessage(event: MessageEvent): void {
    // Origin validation runs before optional payload validation and handler dispatch.
    if (!origins.has(normalizeMessageOrigin(event.origin))) return

    if (options?.validateData && !options.validateData(event.data)) return

    handler(event.data as T, event)
  }

  window.addEventListener('message', onMessage)

  return () => {
    window.removeEventListener('message', onMessage)
  }
}

export function safePostMessage(target: Window, data: unknown, targetOrigin: string): void {
  const normalizedTargetOrigin = normalizeMessageOrigin(targetOrigin)
  if (!normalizedTargetOrigin || normalizedTargetOrigin === '*') {
    console.warn('[Security] postMessage with wildcard origin is not allowed')
    return
  }
  if (!getTrustedFrontendOrigins().includes(normalizedTargetOrigin)) {
    console.warn('[Security] postMessage target origin is not trusted', normalizedTargetOrigin)
    return
  }
  target.postMessage(data, normalizedTargetOrigin)
}
