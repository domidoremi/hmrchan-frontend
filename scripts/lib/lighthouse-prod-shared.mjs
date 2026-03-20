import fs from 'node:fs'
import path from 'node:path'

export const DEFAULT_BASE = 'https://momichan.xyz'
export const DEFAULT_OUTPUT_DIR = '.lighthouse-prod'
export const DEFAULT_URLS_FILE = path.join('scripts', 'config', 'lighthouse-prod-urls.json')
export const DEFAULT_PROFILES = ['mobile', 'desktop']
export const DEFAULT_RUNS = 3

export const STATIC_ANONYMOUS_ROUTE_PATHS = [
  '/',
  '/explore',
  '/search',
  '/authors',
  '/community',
  '/schedule',
  '/about',
  '/contact',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
]

export const EXCLUDED_PATH_PREFIXES = ['/profile', '/users/']
export const EXCLUDED_PATHS = new Set(['/favorites', '/settings/profile'])

export const DETAIL_PAGE_TARGETS = Object.freeze({
  'author-detail': 2,
  'post-detail': 3,
  'discussion-detail': 1,
  'schedule-detail': 1,
})

const PAGE_TYPE_ORDER = [
  'home',
  'public-entry',
  'anonymous-auth',
  'author-detail',
  'post-detail',
  'discussion-detail',
  'schedule-detail',
  'other-public',
]

export function ensureDirectory(targetPath) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true })
  }
}

export function resetDirectory(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true })
  fs.mkdirSync(targetPath, { recursive: true })
}

export function normalizeBase(base) {
  return String(base || DEFAULT_BASE).replace(/\/+$/, '')
}

export function normalizePathname(pathname) {
  if (!pathname || pathname === '/') return '/'
  const normalized = pathname.replace(/\/+$/, '')
  return normalized.length > 0 ? normalized : '/'
}

export function toAbsoluteAuditUrl(urlOrPath, base = DEFAULT_BASE) {
  const resolved = new URL(String(urlOrPath), `${normalizeBase(base)}/`)
  resolved.hash = ''
  const normalizedPath = normalizePathname(resolved.pathname)
  resolved.pathname = normalizedPath === '/' ? '/' : normalizedPath
  return resolved.toString()
}

export function pageTypeForUrl(targetUrl) {
  const pathname = normalizePathname(new URL(targetUrl).pathname)

  if (pathname === '/') return 'home'
  if (
    ['/explore', '/search', '/authors', '/community', '/schedule', '/about', '/contact'].includes(
      pathname
    )
  ) {
    return 'public-entry'
  }
  if (
    ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'].includes(
      pathname
    )
  ) {
    return 'anonymous-auth'
  }
  if (pathname.startsWith('/author/')) return 'author-detail'
  if (pathname.startsWith('/post/')) return 'post-detail'
  if (pathname.startsWith('/community/discussions/') || pathname.startsWith('/discussion/')) {
    return 'discussion-detail'
  }
  if (/^\/schedule\/.+/.test(pathname)) return 'schedule-detail'
  return 'other-public'
}

export function isAuditExcludedUrl(targetUrl) {
  const pathname = normalizePathname(new URL(targetUrl).pathname)

  if (EXCLUDED_PATHS.has(pathname)) return true
  return EXCLUDED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function pageTypeSortValue(pageType) {
  const index = PAGE_TYPE_ORDER.indexOf(pageType)
  return index === -1 ? PAGE_TYPE_ORDER.length : index
}

export function compareAuditEntries(left, right) {
  const pageTypeDelta = pageTypeSortValue(left.pageType) - pageTypeSortValue(right.pageType)
  if (pageTypeDelta !== 0) return pageTypeDelta

  const urlDelta = left.url.localeCompare(right.url)
  if (urlDelta !== 0) return urlDelta

  return String(left.profile ?? '').localeCompare(String(right.profile ?? ''))
}

export function toSlug(targetUrl) {
  const parsed = new URL(targetUrl)
  const raw = `${parsed.hostname}${parsed.pathname === '/' ? '/home' : parsed.pathname}`
  return raw.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
}

export function roundScore(score) {
  return score === null || score === undefined ? null : Math.round(score * 100)
}

export function toMs(audit) {
  if (!audit || audit.numericValue === undefined || audit.numericValue === null) return null
  return Math.round(audit.numericValue)
}

export function toNumber(audit, digits = 3) {
  if (!audit || audit.numericValue === undefined || audit.numericValue === null) return null
  return Number(audit.numericValue.toFixed(digits))
}

export function median(values) {
  const numbers = values
    .filter((value) => value !== null && value !== undefined && Number.isFinite(value))
    .sort((left, right) => left - right)

  if (numbers.length === 0) return null
  const mid = Math.floor(numbers.length / 2)
  return numbers.length % 2 === 1
    ? numbers[mid]
    : Math.round((numbers[mid - 1] + numbers[mid]) / 2)
}

export function medianFloat(values, digits = 3) {
  const numbers = values
    .filter((value) => value !== null && value !== undefined && Number.isFinite(value))
    .sort((left, right) => left - right)

  if (numbers.length === 0) return null
  const mid = Math.floor(numbers.length / 2)
  if (numbers.length % 2 === 1) return numbers[mid]
  return Number(((numbers[mid - 1] + numbers[mid]) / 2).toFixed(digits))
}

export function average(values, digits = 0) {
  const numbers = values.filter(
    (value) => value !== null && value !== undefined && Number.isFinite(value)
  )

  if (numbers.length === 0) return null
  const result = numbers.reduce((sum, value) => sum + value, 0) / numbers.length
  return digits > 0 ? Number(result.toFixed(digits)) : Math.round(result)
}

function normalizeEntryObject(entry, base) {
  const input = entry && typeof entry === 'object' ? entry : {}
  const candidateUrl =
    typeof input.url === 'string'
      ? input.url
      : typeof input.path === 'string'
        ? input.path
        : typeof input.href === 'string'
          ? input.href
          : null

  if (!candidateUrl) {
    throw new Error('URL 清单中存在缺少 url/path 的对象项')
  }

  const url = toAbsoluteAuditUrl(candidateUrl, base)
  const pageType = typeof input.pageType === 'string' ? input.pageType : pageTypeForUrl(url)

  return {
    ...input,
    url,
    pageType,
    indexedInSitemap: Boolean(input.indexedInSitemap),
    robotsDisallowed: Boolean(input.robotsDisallowed),
  }
}

export function normalizeManifestEntry(entry, base = DEFAULT_BASE) {
  if (typeof entry === 'string') {
    const url = toAbsoluteAuditUrl(entry, base)
    return {
      url,
      pageType: pageTypeForUrl(url),
      indexedInSitemap: false,
      robotsDisallowed: false,
    }
  }

  return normalizeEntryObject(entry, base)
}

export function readUrlManifestDocument(filePath, base = DEFAULT_BASE) {
  const absolutePath = path.resolve(filePath)
  const raw = fs.readFileSync(absolutePath, 'utf8').trim()
  if (!raw) {
    return {
      generatedAt: null,
      base: normalizeBase(base),
      coverage: null,
      excluded: [],
      entries: [],
    }
  }

  let entries
  let envelope = null
  if (raw.startsWith('{')) {
    const parsed = JSON.parse(raw)
    envelope = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
    entries = Array.isArray(parsed?.entries) ? parsed.entries : []
  } else if (raw.startsWith('[')) {
    entries = JSON.parse(raw)
  } else {
    entries = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  }

  const deduped = new Map()
  for (const entry of entries) {
    const normalized = normalizeManifestEntry(entry, base)
    if (!deduped.has(normalized.url)) {
      deduped.set(normalized.url, normalized)
    }
  }

  return {
    ...(envelope ?? {}),
    base:
      typeof envelope?.base === 'string' && envelope.base.trim().length > 0
        ? normalizeBase(envelope.base)
        : normalizeBase(base),
    coverage: envelope?.coverage ?? null,
    excluded: Array.isArray(envelope?.excluded) ? envelope.excluded : [],
    entries: [...deduped.values()].sort(compareAuditEntries),
  }
}

export function readUrlManifestInput(filePath, base = DEFAULT_BASE) {
  return readUrlManifestDocument(filePath, base).entries
}
