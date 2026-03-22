const SITE_NAME = 'MomiChan'
const SITE_ORIGIN = 'https://momichan.xyz'
const TITLE_SEPARATOR = ' · '
const DESCRIPTION_MAX_LENGTH = 160

let defaultDescription: string | undefined

export interface PageMetaInput {
  title?: string | null
  description?: string | null
  canonicalPath?: string
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

function getDefaultDescription(): string | undefined {
  if (defaultDescription === undefined) {
    defaultDescription = (
      document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    )?.content
  }

  return defaultDescription
}

export function buildDocumentTitle(pageTitle?: string | null): string {
  const normalized = pageTitle?.trim()
  return normalized && normalized !== SITE_NAME
    ? `${normalized}${TITLE_SEPARATOR}${SITE_NAME}`
    : SITE_NAME
}

export function normalizeMetaDescription(description?: string | null): string | undefined {
  const normalized = description?.replace(/\s+/g, ' ').trim()
  if (!normalized) return undefined
  if (normalized.length <= DESCRIPTION_MAX_LENGTH) return normalized
  return `${normalized.slice(0, DESCRIPTION_MAX_LENGTH - 1).trimEnd()}…`
}

export function applyPageMeta({ title, description, canonicalPath }: PageMetaInput = {}): void {
  const nextTitle = buildDocumentTitle(title)
  document.title = nextTitle

  const resolvedCanonicalPath =
    canonicalPath ?? (typeof window !== 'undefined' ? window.location.pathname : '/')
  const canonicalUrl = new URL(resolvedCanonicalPath, SITE_ORIGIN).toString()

  ensureLinkRel('canonical').setAttribute('href', canonicalUrl)
  ensureMetaProperty('og:url').setAttribute('content', canonicalUrl)
  ensureMetaName('twitter:url').setAttribute('content', canonicalUrl)
  ensureMetaProperty('og:title').setAttribute('content', nextTitle)
  ensureMetaName('twitter:title').setAttribute('content', nextTitle)

  const nextDescription = normalizeMetaDescription(description) ?? getDefaultDescription()
  if (!nextDescription) return

  ensureMetaName('description').setAttribute('content', nextDescription)
  ensureMetaProperty('og:description').setAttribute('content', nextDescription)
  ensureMetaName('twitter:description').setAttribute('content', nextDescription)
}
