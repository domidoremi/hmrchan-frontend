import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'

import {
  resolveCanonicalUrlForOrigin,
  resolveDefaultOgImage,
  resolveHtmlDocument,
} from '@/edge/htmlDocument'
import { resolveRedirectTarget } from '@/router/redirect'
import { appRoutes } from '@/router/routes'
import { useAuthStore } from '@/stores/auth'
import { isContractResourceId } from '@/utils/contractResourceId'

const router = createRouter({
  history: createWebHistory(),
  routes: appRoutes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

const PUBLIC_ID_DETAIL_ROUTE_NAMES = new Set([
  'hmr-post-detail',
  'post-detail',
  'author-detail',
  'discussion-detail',
  'user-public-profile',
  'passkey-recovery-detail',
])

const CLIENT_HEAD_SYNC_ROUTE_NAMES = new Set([
  'hmr-home',
  'hmr-explore',
  'hmr-community',
  'hmr-schedule',
  'hmr-settings',
  'hmr-login',
  'hmr-register',
  'hmr-auth-callback',
  'hmr-passkey-recovery',
  'hmr-about',
  'hmr-contact',
  'hmr-join-us',
  'hmr-thank-you',
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

function syncClientDocumentHead(route: RouteLocationNormalized): void {
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

function blocksInvalidPublicResourceId(name: unknown, id: unknown): boolean {
  return (
    typeof name === 'string' &&
    name !== 'hmr-post-detail' &&
    PUBLIC_ID_DETAIL_ROUTE_NAMES.has(name) &&
    !isContractResourceId(id)
  )
}

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.resolveSession()

  if (blocksInvalidPublicResourceId(to.name, to.params.id)) {
    return {
      name: 'hmr-not-found',
    }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }

  if ((to.name === 'hmr-login' || to.name === 'hmr-register') && auth.isAuthenticated) {
    return resolveRedirectTarget(to.query.redirect)
  }

  return true
})

router.afterEach((to) => {
  syncClientDocumentHead(to)
})

export default router
