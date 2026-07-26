import type { RouteLocationNormalized } from 'vue-router'

import {
  SITE_ORIGIN,
  resolveCanonicalUrlForOrigin,
  resolveDefaultOgImage,
  resolveHtmlDocument,
  resolveStructuredDataPayload,
  type HtmlDocumentConfig,
} from '@/edge/htmlDocument'
import { resolveHtmlDocumentWithEdgeData } from '@/edge/detailDocumentResolver'

let headSyncGeneration = 0

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function shouldSyncClientHead(route: RouteLocationNormalized): boolean {
  return typeof route.meta.pageKey === 'string'
}

function setNamedMetaContent(name: string, content: string): void {
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', name)
    document.head.append(meta)
  }
  meta.setAttribute('content', content)
}

function setPropertyMetaContent(property: string, content: string): void {
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('property', property)
    document.head.append(meta)
  }
  meta.setAttribute('content', content)
}

function setCanonicalHref(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.append(link)
  }
  link.setAttribute('href', href)
}

function setStructuredData(config: HtmlDocumentConfig): void {
  const selector = 'script[data-prerender-structured-data="true"]'
  let script = document.head.querySelector<HTMLScriptElement>(selector)
  const payload = resolveStructuredDataPayload(config)

  if (!payload) {
    script?.remove()
    return
  }

  if (!script) {
    script = document.createElement('script')
    script.type = 'application/ld+json'
    script.dataset['prerenderStructuredData'] = 'true'
    const nonce = document.querySelector<HTMLScriptElement>('script[nonce]')?.getAttribute('nonce')
    if (nonce) script.setAttribute('nonce', nonce)
    document.head.append(script)
  }

  script.textContent = payload
}

function applyDocumentConfig(config: HtmlDocumentConfig, origin: string): void {
  const canonicalUrl = resolveCanonicalUrlForOrigin(config, origin)
  const ogImageUrl = config.ogImage ?? resolveDefaultOgImage(origin)

  document.title = config.title
  setNamedMetaContent('description', config.description)
  setNamedMetaContent('robots', config.robots)
  setNamedMetaContent('twitter:title', config.title)
  setNamedMetaContent('twitter:description', config.description)
  setNamedMetaContent('twitter:url', canonicalUrl)
  setNamedMetaContent('twitter:image', ogImageUrl)
  setPropertyMetaContent('og:type', config.ogType)
  setPropertyMetaContent('og:url', canonicalUrl)
  setPropertyMetaContent('og:title', config.title)
  setPropertyMetaContent('og:description', config.description)
  setPropertyMetaContent('og:image', ogImageUrl)
  setCanonicalHref(canonicalUrl)
  setStructuredData(config)
}

function isDynamicDocumentPath(path: string): boolean {
  return (
    /^\/posts\/[^/]+$/.test(path) ||
    /^\/author\/[^/]+$/.test(path) ||
    /^\/schedule\/[^/]+$/.test(path) ||
    /^\/community\/discussions\/[^/]+$/.test(path)
  )
}

function matchesFallbackDocument(
  config: HtmlDocumentConfig,
  fallback: HtmlDocumentConfig
): boolean {
  return (
    config.status === fallback.status &&
    config.title === fallback.title &&
    config.description === fallback.description &&
    config.canonicalPath === fallback.canonicalPath &&
    config.robots === fallback.robots &&
    config.ogType === fallback.ogType &&
    config.ogImage === fallback.ogImage
  )
}

export function syncClientDocumentHead(route: RouteLocationNormalized): void {
  if (!isBrowserRuntime() || !shouldSyncClientHead(route)) return

  const generation = ++headSyncGeneration
  const apiOrigin = window.location.origin
  const url = new URL(route.path, SITE_ORIGIN)
  const fallback = resolveHtmlDocument(url)
  const expectedCanonicalUrl = resolveCanonicalUrlForOrigin(fallback, SITE_ORIGIN)
  const currentCanonicalUrl =
    document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href
  const hasMatchingEnrichedServerHead =
    isDynamicDocumentPath(route.path) &&
    currentCanonicalUrl === expectedCanonicalUrl &&
    (document.title !== fallback.title || findMetaDescription() !== fallback.description)

  if (!hasMatchingEnrichedServerHead) {
    applyDocumentConfig(fallback, SITE_ORIGIN)
  }

  if (!isDynamicDocumentPath(route.path)) return

  void resolveHtmlDocumentWithEdgeData(url, { API_BASE_URL: apiOrigin })
    .then((resolved) => {
      if (generation !== headSyncGeneration) return
      if (hasMatchingEnrichedServerHead && matchesFallbackDocument(resolved, fallback)) return
      applyDocumentConfig(resolved, SITE_ORIGIN)
    })
    .catch(() => {
      // The route-level fallback is already applied, or the enriched edge head is preserved.
    })
}

function findMetaDescription(): string | undefined {
  return document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content
}
