import type { Router } from 'vue-router'

import {
  createMirrorPageSource,
  type BrandFormBehavior,
  type BrandHeadMeta,
  type BrandMirrorPageSource,
} from '@/brand-appart/content/pageSources'

interface BrandMirrorManifestPage {
  path: string
  bodyPath: string
  status: number
  htmlLang: string
  htmlAttributes: Record<string, string>
  head: BrandHeadMeta
  formBehavior?: BrandFormBehavior
}

interface BrandMirrorManifest {
  generatedAt: string
  runtime: {
    sharedCssPath: string
    googleFontsPath: string
    jqueryPath: string
    webflowPath: string
    mainScriptPath: string
  }
  pages: BrandMirrorManifestPage[]
}

declare global {
  interface Window {
    FinsweetAttributes?: {
      modules: Record<string, { restart?: () => void }>
    }
    Webflow?: {
      destroy?: () => void
      ready?: () => void
    }
  }
}

const MANIFEST_PATH = '/brand-appart/mirror-manifest.json'
const MANAGED_HEAD_SELECTOR = '[data-brand-appart-managed="true"]'
const INTERNAL_ASSET_PREFIX = '/brand-appart/'
const MANAGED_HTML_ATTRIBUTES = [
  'lang',
  'data-wf-domain',
  'data-wf-page',
  'data-wf-site',
  'data-wf-intellimize-customer-id',
] as const

let manifestPromise: Promise<BrandMirrorManifest> | null = null
let runtimePromise: Promise<void> | null = null
let activeCleanup: (() => void) | null = null
const pageBodyCache = new Map<string, Promise<string>>()

function markManaged<T extends HTMLElement>(node: T): T {
  node.dataset.brandAppartManaged = 'true'
  return node
}

function createHeadNode(
  tagName: string,
  attributes: Record<string, string>,
  textContent?: string
): HTMLElement {
  const element = markManaged(document.createElement(tagName))

  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value)
  })

  if (textContent) {
    element.textContent = textContent
  }

  return element
}

function removeManagedHeadNodes(): void {
  document.head.querySelectorAll(MANAGED_HEAD_SELECTOR).forEach((node) => node.remove())
}

function removeConflictingHeadNodes(page: BrandMirrorManifestPage): void {
  const metaIdentityKeys = ['name', 'property', 'http-equiv', 'itemprop'] as const
  const managedMetas = page.head.metas.filter((attributes) =>
    metaIdentityKeys.some((key) => Boolean(attributes[key]))
  )

  document.head.querySelectorAll('meta').forEach((node) => {
    const shouldRemove = managedMetas.some((attributes) =>
      metaIdentityKeys.some((key) => {
        const expected = attributes[key]
        return Boolean(expected) && node.getAttribute(key) === expected
      })
    )

    if (shouldRemove) {
      node.remove()
    }
  })

  const managedLinks = page.head.links

  document.head.querySelectorAll('link').forEach((node) => {
    const rel = (node.getAttribute('rel') || '').toLowerCase()
    const shouldRemove = managedLinks.some((attributes) => {
      const expectedRel = (attributes.rel || '').toLowerCase()
      if (!expectedRel) {
        return false
      }

      if (expectedRel.includes('icon')) {
        return rel.includes('icon')
      }

      return rel === expectedRel
    })

    if (shouldRemove) {
      node.remove()
    }
  })

  document.head
    .querySelectorAll('script[type="application/ld+json"]')
    .forEach((node) => node.remove())
}

function syncDocumentHead(page: BrandMirrorManifestPage): void {
  document.title = page.head.title
  removeManagedHeadNodes()
  removeConflictingHeadNodes(page)

  page.head.metas.forEach((attributes) => {
    document.head.append(createHeadNode('meta', attributes))
  })

  page.head.links.forEach((attributes) => {
    document.head.append(createHeadNode('link', attributes))
  })

  page.head.jsonLd.forEach((payload) => {
    document.head.append(createHeadNode('script', { type: 'application/ld+json' }, payload))
  })
}

function syncHtmlAttributes(page: BrandMirrorManifestPage): void {
  const root = document.documentElement

  MANAGED_HTML_ATTRIBUTES.forEach((name) => {
    if (name === 'lang') {
      root.lang = ''
      return
    }

    root.removeAttribute(name)
  })

  root.lang = page.htmlLang

  Object.entries(page.htmlAttributes).forEach(([name, value]) => {
    root.setAttribute(name, value)
  })
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/plain, text/html, application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Unable to fetch ${url}: ${response.status}`)
  }

  return response.text()
}

async function getManifest(): Promise<BrandMirrorManifest> {
  if (!manifestPromise) {
    manifestPromise = fetchText(MANIFEST_PATH).then((raw) => JSON.parse(raw) as BrandMirrorManifest)
  }

  return manifestPromise
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (existing?.dataset.brandAppartLoaded === 'true') {
      resolve()
      return
    }

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`Unable to load ${src}`)), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = false
    script.dataset.brandAppartLoaded = 'true'
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error(`Unable to load ${src}`)), {
      once: true,
    })
    document.body.append(script)
  })
}

function normalizeMirrorPath(rawHref: string): string | null {
  if (!rawHref || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
    return null
  }

  if (rawHref.startsWith('#')) {
    return rawHref
  }

  const url = new URL(rawHref, window.location.origin)

  if (url.origin !== window.location.origin) {
    return null
  }

  if (url.pathname.startsWith(INTERNAL_ASSET_PREFIX)) {
    return null
  }

  return `${url.pathname}${url.search}${url.hash}`
}

function bindFilloutEmbeds(container: HTMLElement, router: Router): () => void {
  const frames = [...container.querySelectorAll<HTMLIFrameElement>('iframe[data-brand-fillout]')]

  if (frames.length === 0) {
    return () => {}
  }

  const onMessage = (event: MessageEvent): void => {
    if (event.origin !== window.location.origin) {
      return
    }

    const payload = event.data
    if (!payload || typeof payload !== 'object') {
      return
    }

    const type = Reflect.get(payload, 'type')

    if (type === 'brand-appart-fillout-submit') {
      void router.push('/thank-you')
      return
    }

    if (type === 'brand-appart-fillout-resize') {
      const formKey = Reflect.get(payload, 'form')
      const targetHeight = Number(Reflect.get(payload, 'height') ?? 0)
      if (!Number.isFinite(targetHeight) || targetHeight <= 0) {
        return
      }

      const iframe = frames.find((candidate) => candidate.dataset.brandFillout === formKey)
      if (!iframe) {
        return
      }

      iframe.style.height = `${Math.ceil(targetHeight)}px`
    }
  }

  window.addEventListener('message', onMessage)

  return () => {
    window.removeEventListener('message', onMessage)
  }
}

function createLinkInterceptor(router: Router): () => void {
  const onClick = (event: Event): void => {
    const mouseEvent = event as MouseEvent
    if (
      mouseEvent.defaultPrevented ||
      mouseEvent.button !== 0 ||
      mouseEvent.metaKey ||
      mouseEvent.ctrlKey
    ) {
      return
    }

    const target = mouseEvent.target
    if (!(target instanceof Element)) {
      return
    }

    const anchor = target.closest<HTMLAnchorElement>('a[href]')
    if (!anchor) {
      return
    }

    if (anchor.target === '_blank' || anchor.hasAttribute('download')) {
      return
    }

    const nextPath = normalizeMirrorPath(anchor.href)
    if (!nextPath) {
      return
    }

    if (nextPath.startsWith('#')) {
      const section = document.querySelector(nextPath)
      if (section) {
        mouseEvent.preventDefault()
        mouseEvent.stopImmediatePropagation()
        section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      return
    }

    mouseEvent.preventDefault()
    mouseEvent.stopImmediatePropagation()

    void router.push(nextPath)
  }

  document.addEventListener('click', onClick, true)

  return () => {
    document.removeEventListener('click', onClick, true)
  }
}

function patchTransitionRuntime(router: Router): void {
  const transitionElement = customElements.get('c-transition') as
    | {
        prototype: {
          goToUrl?: (url: string) => void
          __brandAppartPatched?: boolean
        }
      }
    | undefined

  if (!transitionElement || transitionElement.prototype.__brandAppartPatched) {
    return
  }

  transitionElement.prototype.goToUrl = function goToUrl(url: string): void {
    const nextPath = normalizeMirrorPath(url)

    if (!nextPath) {
      window.location.assign(url)
      return
    }

    void router.push(nextPath)
  }

  transitionElement.prototype.__brandAppartPatched = true
}

async function ensureRuntime(router: Router): Promise<void> {
  if (runtimePromise) {
    await runtimePromise
    patchTransitionRuntime(router)
    return
  }

  runtimePromise = (async () => {
    const manifest = await getManifest()
    const { jqueryPath, webflowPath, mainScriptPath } = manifest.runtime

    window.FinsweetAttributes ??= { modules: {} }

    await loadScript(jqueryPath)
    await loadScript(webflowPath)
    await loadScript(mainScriptPath)
  })()

  await runtimePromise
  patchTransitionRuntime(router)
}

function resolveManifestPage(
  manifest: BrandMirrorManifest,
  source: BrandMirrorPageSource
): BrandMirrorManifestPage {
  const entry = manifest.pages.find((page) => page.path === source.path)

  if (entry) {
    return {
      ...entry,
      formBehavior: entry.formBehavior ?? source.formBehavior,
    }
  }

  if (source.path !== '/404') {
    const fallback = manifest.pages.find((page) => page.path === '/404')
    if (fallback) {
      return {
        ...fallback,
        formBehavior: source.formBehavior,
      }
    }
  }

  throw new Error(`Mirror page not found for ${source.path}`)
}

async function getPageBody(page: BrandMirrorManifestPage): Promise<string> {
  const cached = pageBodyCache.get(page.bodyPath)
  if (cached) {
    return cached
  }

  const request = fetchText(page.bodyPath)
  pageBodyCache.set(page.bodyPath, request)
  return request
}

function announceDomChange(): void {
  document.dispatchEvent(
    new CustomEvent('appAfterDOMChange', {
      bubbles: true,
    })
  )

  window.Webflow?.ready?.()
}

export async function rewriteAndBindForms(_container: HTMLElement, router: Router): Promise<void> {
  activeCleanup?.()
  const cleanupLinkInterceptor = createLinkInterceptor(router)
  const cleanupFilloutBindings = bindFilloutEmbeds(_container, router)

  activeCleanup = () => {
    cleanupFilloutBindings()
    cleanupLinkInterceptor()
  }
}

export function teardownPageRuntime(): void {
  activeCleanup?.()
  activeCleanup = null
  window.Webflow?.destroy?.()
}

export async function mountPageRuntime(
  source: BrandMirrorPageSource,
  container: HTMLElement,
  router: Router
): Promise<void> {
  teardownPageRuntime()
  await ensureRuntime(router)

  const manifest = await getManifest()
  const page = resolveManifestPage(manifest, source)
  const bodyMarkup = await getPageBody(page)

  syncDocumentHead(page)
  syncHtmlAttributes(page)
  container.innerHTML = bodyMarkup

  await rewriteAndBindForms(container, router)
  requestAnimationFrame(() => {
    announceDomChange()
  })
}

export function resolveMirrorSource(path: string): BrandMirrorPageSource {
  return createMirrorPageSource(path)
}
