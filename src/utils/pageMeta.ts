import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_ORIGIN,
  buildSiteTitle,
  resolvePageMetaCanonicalUrl,
  resolvePageMetaDefaults,
  serializePageMetaStructuredData,
  type PageMetaDefaults,
  type PageMetaStructuredData,
} from './pageMetaDefaults'

const DESCRIPTION_MAX_LENGTH = 160
const STRUCTURED_DATA_SELECTOR = 'script[data-prerender-structured-data="true"]'

const OPEN_GRAPH_LOCALES = {
  'zh-CN': 'zh_CN',
  'zh-TW': 'zh_TW',
  ja: 'ja_JP',
  en: 'en_US',
} as const

type SupportedLocale = keyof typeof OPEN_GRAPH_LOCALES

export interface PageMetaInput {
  title?: string | null
  description?: string | null
  canonicalPath?: string
  robots?: PageMetaDefaults['robots']
  ogType?: PageMetaDefaults['ogType']
  ogImage?: string | null
  locale?: string
  structuredData?: PageMetaStructuredData[]
}

function ensureMetaName(name: string): HTMLMetaElement {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  return el
}

function ensureMetaProperty(property: string): HTMLMetaElement {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  return el
}

function ensureLinkRel(rel: string): HTMLLinkElement {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  return el
}

function resolveDocumentConfig(canonicalPath?: string): PageMetaDefaults {
  const candidate =
    canonicalPath ?? (typeof window !== 'undefined' ? window.location.pathname : '/')
  return resolvePageMetaDefaults(candidate)
}

function resolveLocale(locale?: string): SupportedLocale {
  const candidate = (locale || document.documentElement.lang || 'en').trim()
  const exact = Object.keys(OPEN_GRAPH_LOCALES).find(
    (supported) => supported.toLowerCase() === candidate.toLowerCase()
  ) as SupportedLocale | undefined
  if (exact) return exact

  const language = candidate.split('-')[0]?.toLowerCase()
  if (language === 'zh') return 'zh-CN'
  if (language === 'ja') return 'ja'
  return 'en'
}

function resolveImageUrl(image: string | null | undefined): string {
  if (!image?.trim()) return DEFAULT_OG_IMAGE
  try {
    return new URL(image, SITE_ORIGIN).toString()
  } catch {
    return DEFAULT_OG_IMAGE
  }
}

function containsCanonicalUrl(value: unknown, canonicalUrl: string): boolean {
  if (typeof value === 'string') return value === canonicalUrl
  if (Array.isArray(value)) {
    return value.some((item) => containsCanonicalUrl(item, canonicalUrl))
  }
  if (!value || typeof value !== 'object') return false
  return Object.values(value).some((item) => containsCanonicalUrl(item, canonicalUrl))
}

function hasMatchingStructuredData(script: HTMLScriptElement, canonicalUrl: string): boolean {
  try {
    return containsCanonicalUrl(JSON.parse(script.textContent ?? ''), canonicalUrl)
  } catch {
    return false
  }
}

function replaceStructuredData(
  config: PageMetaDefaults,
  canonicalUrl: string,
  preserveMatchingExisting: boolean
): void {
  const payload = serializePageMetaStructuredData(config)
  const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>(STRUCTURED_DATA_SELECTOR))

  if (!payload) {
    const matchingScript = preserveMatchingExisting
      ? scripts.find((script) => hasMatchingStructuredData(script, canonicalUrl))
      : undefined
    if (matchingScript) {
      scripts.filter((script) => script !== matchingScript).forEach((script) => script.remove())
      return
    }
    scripts.forEach((script) => script.remove())
    return
  }

  const [script, ...duplicates] = scripts
  const target = script ?? document.createElement('script')
  target.type = 'application/ld+json'
  target.dataset.prerenderStructuredData = 'true'
  target.textContent = payload
  const nonce = document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce
  if (nonce) target.nonce = nonce
  duplicates.forEach((duplicate) => duplicate.remove())
  if (!target.isConnected) document.head.appendChild(target)
}

function replaceOpenGraphLocale(locale: SupportedLocale): void {
  const activeLocale = OPEN_GRAPH_LOCALES[locale]
  ensureMetaProperty('og:locale').setAttribute('content', activeLocale)

  const existingAlternates = Array.from(
    document.querySelectorAll<HTMLMetaElement>('meta[property="og:locale:alternate"]')
  )
  existingAlternates.forEach((element) => element.remove())

  Object.values(OPEN_GRAPH_LOCALES)
    .filter((candidate) => candidate !== activeLocale)
    .forEach((candidate) => {
      const element = document.createElement('meta')
      element.setAttribute('property', 'og:locale:alternate')
      element.setAttribute('content', candidate)
      document.head.appendChild(element)
    })
}

export function buildDocumentTitle(pageTitle?: string | null): string {
  const normalized = pageTitle?.trim()
  return normalized ? buildSiteTitle(normalized) : SITE_NAME
}

export function normalizeMetaDescription(description?: string | null): string | undefined {
  const normalized = description?.replace(/\s+/g, ' ').trim()
  if (!normalized) return undefined
  if (normalized.length <= DESCRIPTION_MAX_LENGTH) return normalized
  return `${normalized.slice(0, DESCRIPTION_MAX_LENGTH - 1).trimEnd()}…`
}

export function applyPageMeta(input: PageMetaInput = {}): void {
  const baseConfig = resolveDocumentConfig(input.canonicalPath)
  const nextTitle = input.title == null ? baseConfig.title : buildDocumentTitle(input.title)
  const nextDescription = normalizeMetaDescription(input.description) ?? baseConfig.description
  const canonicalUrl = resolvePageMetaCanonicalUrl(baseConfig)
  const ogImage = resolveImageUrl(input.ogImage === undefined ? baseConfig.ogImage : input.ogImage)
  const locale = resolveLocale(input.locale)
  const documentConfig: PageMetaDefaults = {
    ...baseConfig,
    title: nextTitle,
    description: nextDescription,
    robots: input.robots ?? baseConfig.robots,
    ogType: input.ogType ?? baseConfig.ogType,
    ogImage,
    structuredData: input.structuredData ?? baseConfig.structuredData,
  }

  document.title = documentConfig.title
  document.documentElement.lang = locale
  ensureMetaName('description').setAttribute('content', documentConfig.description)
  ensureMetaName('robots').setAttribute('content', documentConfig.robots)
  ensureLinkRel('canonical').setAttribute('href', canonicalUrl)

  ensureMetaProperty('og:type').setAttribute('content', documentConfig.ogType)
  ensureMetaProperty('og:url').setAttribute('content', canonicalUrl)
  ensureMetaProperty('og:title').setAttribute('content', documentConfig.title)
  ensureMetaProperty('og:description').setAttribute('content', documentConfig.description)
  ensureMetaProperty('og:image').setAttribute('content', ogImage)
  replaceOpenGraphLocale(locale)

  ensureMetaName('twitter:url').setAttribute('content', canonicalUrl)
  ensureMetaName('twitter:title').setAttribute('content', documentConfig.title)
  ensureMetaName('twitter:description').setAttribute('content', documentConfig.description)
  ensureMetaName('twitter:image').setAttribute('content', ogImage)
  replaceStructuredData(documentConfig, canonicalUrl, input.structuredData === undefined)
}
