import type { RouteLocationNormalized } from 'vue-router'

import {
  resolveCanonicalUrlForOrigin,
  resolveDefaultOgImage,
  resolveHtmlDocument,
} from '@/edge/htmlDocument'

const CLIENT_HEAD_SYNC_ROUTE_NAMES = new Set([
  'hmr-home',
  'hmr-explore',
  'hmr-community',
  'hmr-schedule',
  'hmr-settings',
  'hmr-login',
  'hmr-register',
  'hmr-forgot-password',
  'hmr-reset-password',
  'hmr-auth-callback',
  'hmr-passkey-recovery',
  'hmr-profile',
  'hmr-profile-section',
  'hmr-about',
  'hmr-contact',
  'hmr-join-us',
  'hmr-thank-you',
  'hmr-post-detail',
  'hmr-discussion-detail',
  'hmr-not-found',
])

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function shouldSyncClientHead(route: RouteLocationNormalized): boolean {
  return typeof route.name === 'string' && CLIENT_HEAD_SYNC_ROUTE_NAMES.has(route.name)
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

export function syncClientDocumentHead(route: RouteLocationNormalized): void {
  if (!isBrowserRuntime() || !shouldSyncClientHead(route)) return

  const documentConfig = resolveHtmlDocument(new URL(route.path, window.location.origin))
  const canonicalUrl = resolveCanonicalUrlForOrigin(documentConfig, window.location.origin)
  const ogImageUrl = documentConfig.ogImage ?? resolveDefaultOgImage(window.location.origin)

  document.title = documentConfig.title
  setNamedMetaContent('description', documentConfig.description)
  setNamedMetaContent('robots', documentConfig.robots)
  setNamedMetaContent('twitter:title', documentConfig.title)
  setNamedMetaContent('twitter:description', documentConfig.description)
  setNamedMetaContent('twitter:url', canonicalUrl)
  setNamedMetaContent('twitter:image', ogImageUrl)
  setPropertyMetaContent('og:type', documentConfig.ogType)
  setPropertyMetaContent('og:url', canonicalUrl)
  setPropertyMetaContent('og:title', documentConfig.title)
  setPropertyMetaContent('og:description', documentConfig.description)
  setPropertyMetaContent('og:image', ogImageUrl)
  setCanonicalHref(canonicalUrl)
}
