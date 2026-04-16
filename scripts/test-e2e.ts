#!/usr/bin/env bun

import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import puppeteer, { type Page } from 'puppeteer'
import {
  applyLocalAuditEnvToProcess,
  createLocalAuditEnv,
  resolveLocalAuditPreviewPorts,
} from './lib/audit-env.js'
import {
  createSmokeSummary,
  getAuthSkipReason,
  resolveAuthSmokeCredentials,
  writeSmokeArtifacts,
} from './lib/e2e-smoke-report.js'
import { withBuildArtifactLock } from './lib/build-artifact-lock.js'
import {
  PreviewShellManager,
  clearLocalAuditRateLimitState,
  grantLocalAuditClientTrust,
  grantLocalAuditTurnstileTrust,
  runBunTask,
} from './lib/preview-shell.js'
import { getSmokeRouteMatrix } from './lib/release-route-contract.js'

applyLocalAuditEnvToProcess()

type SmokeMode = 'guest' | 'auth' | 'both'
type CheckKind = 'static' | 'browser' | 'auth' | 'service-worker'
type CheckStatus = 'passed' | 'failed' | 'skipped'

type StaticRouteCheck = {
  name: string
  path: string
  expected: {
    title: string
    canonical: string
    robots?: string
  }
}

type RouteCheck = {
  name: string
  path: string
  selector: string
  mode: Extract<SmokeMode, 'guest' | 'auth'>
  expectedPath?: string
  expectedCanonicalPath?: string
  readinessSelectorsAll?: string[]
  readinessSelectorsAny?: string[]
}

type CheckRecord = {
  name: string
  kind: CheckKind
  mode: SmokeMode
  status: CheckStatus
  path?: string
  selector?: string
  readinessSelectorsAll?: string[]
  readinessSelectorsAny?: string[]
  expectedPath?: string
  detail?: string
}

type FailureEvidence = {
  checkName: string | null
  route: string | null
  url: string | null
  pathname: string | null
  title: string | null
  screenshotPath: string | null
  htmlSnapshotPath: string | null
  previewDiagnostics: string[] | null
}

type JsonRecord = Record<string, unknown>

type CdpRequestWillBeSentEvent = {
  requestId: string
  request?: {
    method?: string
    url?: string
    headers?: Record<string, unknown>
  }
}

type CdpRequestWillBeSentExtraInfoEvent = {
  requestId: string
  headers?: Record<string, unknown>
}

type SmokeSummary = {
  artifactDir: string
  baseUrl: string | null
  authLoginPresent: boolean
  authPasswordPresent: boolean
  authCredentialsDetected: boolean
  authSmokeExecuted: boolean
  authSmokeSkipReason: string | null
  lastFailedCheck: string | null
  lastFailureEvidence: FailureEvidence | null
  checks: CheckRecord[]
}

type ReadinessProbePayload = {
  all: string[]
  any: string[]
}

function hasAuthSmokeCredentials(env: NodeJS.ProcessEnv): boolean {
  const credentials = resolveAuthSmokeCredentials(env)
  return Boolean(credentials.login && credentials.password)
}

const BASE_AUDIT_ENV = createLocalAuditEnv(process.env, {
  includeContractFallback: true,
})
const AUDIT_ENV_HAS_AUTH = hasAuthSmokeCredentials(BASE_AUDIT_ENV)
const AUDIT_ENV = {
  ...BASE_AUDIT_ENV,
  VITE_ENABLE_CLIENT_INIT: AUDIT_ENV_HAS_AUTH
    ? 'true'
    : (BASE_AUDIT_ENV['VITE_ENABLE_CLIENT_INIT'] ?? 'false'),
  VITE_ENABLE_DATA_PREFETCH: BASE_AUDIT_ENV['VITE_ENABLE_DATA_PREFETCH'] ?? 'false',
  VITE_DISABLE_PREVIEW_PROXY: AUDIT_ENV_HAS_AUTH
    ? 'false'
    : (BASE_AUDIT_ENV['VITE_DISABLE_PREVIEW_PROXY'] ?? 'true'),
}
const PREVIEW_PORT_CANDIDATES = resolveLocalAuditPreviewPorts(AUDIT_ENV, [
  'E2E_PREVIEW_PORTS',
  'E2E_PREVIEW_PORT',
  'LOCAL_AUDIT_PREVIEW_PORTS',
])

const STATIC_ROUTE_CHECKS: StaticRouteCheck[] = [
  {
    name: 'home prerender',
    path: '/',
    expected: {
      title: 'Home · MomiChan',
      canonical: 'https://momichan.xyz/',
      robots: 'index, follow',
    },
  },
  {
    name: 'explore prerender',
    path: '/explore',
    expected: {
      title: 'Explore · MomiChan',
      canonical: 'https://momichan.xyz/explore',
      robots: 'index, follow',
    },
  },
  {
    name: 'authors prerender',
    path: '/authors',
    expected: {
      title: 'Authors · MomiChan',
      canonical: 'https://momichan.xyz/authors',
      robots: 'index, follow',
    },
  },
  {
    name: '404 prerender',
    path: '/404/',
    expected: {
      title: 'Page not found · MomiChan',
      canonical: 'https://momichan.xyz/404',
      robots: 'noindex, nofollow',
    },
  },
]

function normalizeBaseUrl(rawUrl: string): string {
  return rawUrl.replace(/\/$/, '')
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function asJsonRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null
}

function appendCheck(summary: SmokeSummary, check: CheckRecord): void {
  summary.checks.push(check)
}

async function capturePageFailureEvidence(
  page: Page,
  artifactDir: string,
  metadata: Pick<CheckRecord, 'name' | 'path'>,
  getPreviewDiagnostics?: (() => string[] | null) | null
): Promise<FailureEvidence> {
  await mkdir(artifactDir, { recursive: true })

  const screenshotPath = join(artifactDir, 'failure-last.png')
  const htmlSnapshotPath = join(artifactDir, 'failure-last.html')

  const [title, pathname, url, html] = await Promise.all([
    page.title().catch(() => null),
    page.evaluate(() => window.location.pathname).catch(() => null),
    Promise.resolve(page.url()).catch(() => null),
    page.content().catch(() => null),
  ])

  await page
    .screenshot({
      fullPage: true,
      path: screenshotPath,
    })
    .catch(() => undefined)

  if (typeof html === 'string') {
    await writeFile(htmlSnapshotPath, html, 'utf8').catch(() => undefined)
  }

  return {
    checkName: metadata.name,
    route: metadata.path ?? null,
    url,
    pathname,
    title,
    screenshotPath,
    htmlSnapshotPath: typeof html === 'string' ? htmlSnapshotPath : null,
    previewDiagnostics: getPreviewDiagnostics?.() ?? null,
  }
}

function markChecksSkipped(summary: SmokeSummary, checks: RouteCheck[], reason: string): void {
  for (const check of checks) {
    appendCheck(summary, {
      name: check.name,
      kind: check.mode === 'auth' ? 'auth' : 'browser',
      mode: check.mode,
      status: 'skipped',
      path: check.path,
      selector: check.selector,
      readinessSelectorsAll: check.readinessSelectorsAll,
      readinessSelectorsAny: check.readinessSelectorsAny,
      expectedPath: check.expectedPath,
      detail: reason,
    })
  }
}

function isGuestProtectedRedirectCheck(check: Pick<RouteCheck, 'mode' | 'expectedPath'>): boolean {
  return check.mode === 'guest' && check.expectedPath === '/login'
}

async function collectBrowserTrustHeaders(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const nav = navigator as Navigator & {
      userAgentData?: {
        brands?: Array<{ brand: string; version: string }>
        platform?: string
      }
    }
    const languageCandidates = new Set<string>()
    const languages = Array.isArray(navigator.languages) ? navigator.languages.filter(Boolean) : []
    if (languages.length > 0) {
      languageCandidates.add(
        languages
          .map((language, index) =>
            index === 0 ? language : `${language};q=${(1 - index / 10).toFixed(1)}`
          )
          .join(',')
      )
    }
    if (navigator.language) {
      languageCandidates.add(navigator.language)
      const baseLanguage = navigator.language.split('-')[0]
      if (baseLanguage && baseLanguage !== navigator.language) {
        languageCandidates.add(`${navigator.language},${baseLanguage};q=0.9`)
      }
    }

    const clientHintsBrands = nav.userAgentData?.brands
      ?.map((brand) => `"${brand.brand}";v="${brand.version}"`)
      .join(', ')
    const platform = nav.userAgentData?.platform ? `"${nav.userAgentData.platform}"` : ''

    return {
      'user-agent': navigator.userAgent,
      'sec-ch-ua': clientHintsBrands ?? '',
      'sec-ch-ua-platform': platform,
      'accept-language': navigator.language || '',
      'x-local-audit-candidates-accept-language': [...languageCandidates].join('\n'),
      'x-local-audit-candidates-sec-ch-ua': clientHintsBrands ?? '',
      'x-local-audit-candidates-sec-ch-ua-platform': platform,
    }
  })
}

async function withPageFailureEvidence(
  browser: puppeteer.Browser,
  artifactDir: string,
  metadata: Pick<CheckRecord, 'name' | 'path'>,
  onFailure: (evidence: FailureEvidence) => void,
  run: (page: Page) => Promise<void>,
  getPreviewDiagnostics?: (() => string[] | null) | null,
  timeout = 20_000
): Promise<void> {
  const page = await browser.newPage()
  page.setDefaultTimeout(timeout)

  try {
    await run(page)
  } catch (error) {
    onFailure(await capturePageFailureEvidence(page, artifactDir, metadata, getPreviewDiagnostics))
    throw error
  } finally {
    await page.close().catch(() => undefined)
  }
}

async function recordCheck(
  summary: SmokeSummary,
  metadata: Omit<CheckRecord, 'status' | 'detail'>,
  run: () => Promise<void>
): Promise<void> {
  console.log(
    `   • ${metadata.mode.toUpperCase()} ${metadata.name}${metadata.path ? ` (${metadata.path})` : ''}`
  )
  try {
    await run()
    appendCheck(summary, {
      ...metadata,
      status: 'passed',
    })
  } catch (error) {
    summary.lastFailedCheck = metadata.name
    appendCheck(summary, {
      ...metadata,
      status: 'failed',
      detail: formatError(error),
    })
    throw error
  }
}

async function assertStaticPrerenderedRoute(
  baseUrl: string,
  path: string,
  expected: {
    title: string
    canonical: string
    robots?: string
  }
): Promise<void> {
  const response = await fetch(`${baseUrl}${path}`)
  const html = await response.text()

  if (response.status !== 200) {
    throw new Error(`Expected prerendered route ${path} to return 200, got ${response.status}`)
  }

  if (!html.includes(`<title>${expected.title}</title>`)) {
    throw new Error(`Expected ${path} HTML to contain title ${expected.title}`)
  }

  if (!html.includes(`href="${expected.canonical}"`)) {
    throw new Error(`Expected ${path} HTML to contain canonical ${expected.canonical}`)
  }

  if (expected.robots && !html.includes(`content="${expected.robots}"`)) {
    throw new Error(`Expected ${path} HTML to contain robots ${expected.robots}`)
  }

  if (!html.includes('data-prerender-shell="true"')) {
    throw new Error(`Expected ${path} HTML to contain prerender shell markup`)
  }
}

async function assertBrowserRoute(
  browser: puppeteer.Browser,
  baseUrl: string,
  check: RouteCheck,
  artifactDir: string,
  onFailure: (evidence: FailureEvidence) => void,
  getPreviewDiagnostics?: (() => string[] | null) | null
): Promise<void> {
  await withPageFailureEvidence(
    browser,
    artifactDir,
    { name: check.name, path: check.path },
    onFailure,
    async (page) => {
      await page.goto(`${baseUrl}${check.path}`, {
        waitUntil: 'domcontentloaded',
      })

      await page.waitForSelector(check.selector)
      await page.waitForFunction(
        () =>
          document.title.includes('MomiChan') && document.title !== 'MomiChan - 籾山ひめり Fan Hub'
      )

      const title = await page.title()
      if (!title.includes('MomiChan')) {
        throw new Error(`Unexpected browser title for ${check.path}: ${title}`)
      }

      const currentPath = await page.evaluate(() => window.location.pathname)
      if (check.expectedPath && currentPath !== check.expectedPath) {
        throw new Error(
          `Expected ${check.path} to resolve to ${check.expectedPath}, got ${currentPath}`
        )
      }

      await page.waitForSelector('link[rel="canonical"]')
      const canonicalHref = await page.$eval('link[rel="canonical"]', (el) =>
        el.getAttribute('href')
      )
      const expectedCanonicalPath = check.expectedCanonicalPath ?? check.path
      if (
        canonicalHref !==
        `https://momichan.xyz${expectedCanonicalPath === '/' ? '/' : expectedCanonicalPath}`
      ) {
        throw new Error(`Unexpected canonical for ${check.path}: ${canonicalHref}`)
      }

      const hasCfBeacon = await page.evaluate(() =>
        Boolean(document.querySelector('script[data-cf-beacon]'))
      )
      if (hasCfBeacon) {
        throw new Error(
          `Cloudflare analytics beacon should not be injected for ${check.path} without consent`
        )
      }
    },
    getPreviewDiagnostics,
    15_000
  )
}

async function authenticateViaApi(
  browser: puppeteer.Browser,
  baseUrl: string,
  credentials: { login: string; password: string },
  artifactDir: string,
  onFailure: (evidence: FailureEvidence) => void,
  getPreviewDiagnostics?: (() => string[] | null) | null
): Promise<void> {
  await withPageFailureEvidence(
    browser,
    artifactDir,
    { name: 'auth login bootstrap', path: '/api/v1/auth/login' },
    onFailure,
    async (page) => {
      const waitForLoginExit = (timeout: number) =>
        page.waitForFunction(
          () =>
            window.location.pathname !== '/login' &&
            !window.location.pathname.startsWith('/login/'),
          { timeout }
        )
      const waitForClientCredentials = (timeout: number) =>
        page.waitForFunction(
          () => {
            const raw = window.localStorage.getItem('momi_client_security')
            if (!raw) return false
            try {
              const parsed = JSON.parse(raw) as {
                client_token?: unknown
                client_secret?: unknown
              }
              return Boolean(
                typeof parsed.client_token === 'string' &&
                parsed.client_token.trim() &&
                typeof parsed.client_secret === 'string' &&
                parsed.client_secret.trim()
              )
            } catch {
              return false
            }
          },
          { timeout }
        )
      const forceIssueClientCredentials = async () => {
        const result = await page.evaluate(async () => {
          const credentialStorageKey = 'momi_client_security'
          const fingerprintStorageKey = 'momi_device_fingerprint_v1'

          const readPersistedFingerprint = (): string | null => {
            try {
              const raw = window.localStorage.getItem(fingerprintStorageKey)
              if (!raw) return null
              const parsed = JSON.parse(raw) as { value?: unknown }
              return typeof parsed.value === 'string' && parsed.value.trim() ? parsed.value : null
            } catch {
              return null
            }
          }

          const getFallbackFingerprint = async (): Promise<string> => {
            const components = [
              navigator.userAgent,
              navigator.language,
              screen.width.toString(),
              screen.height.toString(),
              screen.colorDepth.toString(),
              new Date().getTimezoneOffset().toString(),
              navigator.hardwareConcurrency?.toString() || '',
              navigator.maxTouchPoints?.toString() || '',
            ]
            const fingerprintSource = components.join('|')

            try {
              const encoder = new TextEncoder()
              const data = encoder.encode(fingerprintSource)
              const hashBuffer = await crypto.subtle.digest('SHA-256', data)
              const hashArray = Array.from(new Uint8Array(hashBuffer))
              return hashArray
                .map((byte) => byte.toString(16).padStart(2, '0'))
                .join('')
                .slice(0, 32)
            } catch {
              let hash = 0
              for (let index = 0; index < fingerprintSource.length; index += 1) {
                hash = (hash << 5) - hash + fingerprintSource.charCodeAt(index)
                hash &= hash
              }
              return Math.abs(hash).toString(16).padStart(8, '0')
            }
          }

          const clientFingerprint = readPersistedFingerprint() ?? (await getFallbackFingerprint())
          window.localStorage.setItem(
            fingerprintStorageKey,
            JSON.stringify({
              value: clientFingerprint,
              cachedAt: Date.now(),
              userAgent: navigator.userAgent,
              language: navigator.language,
              platform: navigator.platform,
            })
          )
          window.localStorage.removeItem(credentialStorageKey)

          const response = await fetch('/api/v1/client/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_fingerprint: clientFingerprint,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              screen_resolution: `${screen.width}x${screen.height}`,
              platform: navigator.platform || undefined,
              timestamp: Math.floor(Date.now() / 1000),
              nonce: Math.random().toString(16).slice(2).padEnd(16, '0').slice(0, 16),
              force_reissue: true,
            }),
          })

          const rawBody = await response.text()
          let body: JsonRecord | null = null
          try {
            body = asJsonRecord(rawBody ? JSON.parse(rawBody) : null)
          } catch {
            body = null
          }

          if (!response.ok) {
            return {
              ok: false,
              status: response.status,
              detail: body?.detail ?? body?.message ?? rawBody,
            }
          }

          const payload = asJsonRecord(body?.data) ?? body
          const clientToken = typeof payload?.client_token === 'string' ? payload.client_token : ''
          const clientSecret =
            typeof payload?.client_secret === 'string' ? payload.client_secret : ''
          if (!clientToken.trim() || !clientSecret.trim()) {
            return {
              ok: false,
              status: response.status,
              detail: 'client/init force_reissue did not return signing credentials',
            }
          }

          window.localStorage.setItem(
            credentialStorageKey,
            JSON.stringify({
              client_token: clientToken,
              client_secret: clientSecret,
            })
          )

          return {
            ok: true,
            status: response.status,
            trustLevel: payload?.trust_level,
            challengeRequired: payload?.challenge_required,
          }
        })

        if (!result.ok) {
          throw new Error(
            `Auth smoke login bootstrap failed to force issue client credentials: HTTP ${result.status} ${result.detail ?? ''}`.trim()
          )
        }
      }
      const ensureClientCredentials = async () => {
        const hasExistingCredentials = await waitForClientCredentials(10_000)
          .then(() => true)
          .catch(() => false)
        if (hasExistingCredentials) {
          return
        }

        await forceIssueClientCredentials()
        await waitForClientCredentials(2_000)
      }
      const submitLoginForm = () =>
        page.$eval('form.auth-form', (form) => {
          ;(form as HTMLFormElement).requestSubmit()
        })

      const loginSelector = '#login-identifier'
      const passwordSelector = '#login-password'
      let latestLoginRequestHeaders: Record<string, string> | null = null
      const loginRequestIds = new Set<string>()
      const normalizeHeaders = (headers: Record<string, unknown> | undefined) =>
        Object.fromEntries(
          Object.entries(headers ?? {}).map(([key, value]) => [key.toLowerCase(), String(value)])
        )
      const cdpSession = await page.createCDPSession()
      await cdpSession.send('Network.enable')
      cdpSession.on('Network.requestWillBeSent', (event: CdpRequestWillBeSentEvent) => {
        const request = event.request
        if (request?.method === 'POST' && request.url?.includes('/api/v1/auth/login')) {
          loginRequestIds.add(event.requestId)
          latestLoginRequestHeaders = {
            ...(latestLoginRequestHeaders ?? {}),
            ...normalizeHeaders(request.headers),
          }
        }
      })
      cdpSession.on(
        'Network.requestWillBeSentExtraInfo',
        (event: CdpRequestWillBeSentExtraInfoEvent) => {
          if (!loginRequestIds.has(event.requestId)) return
          latestLoginRequestHeaders = {
            ...(latestLoginRequestHeaders ?? {}),
            ...normalizeHeaders(event.headers),
          }
        }
      )
      page.on('request', (request) => {
        if (request.method() === 'POST' && request.url().includes('/api/v1/auth/login')) {
          latestLoginRequestHeaders = {
            ...(latestLoginRequestHeaders ?? {}),
            ...request.headers(),
          }
        }
      })
      const openAndFillLoginForm = async () => {
        await page.goto(`${baseUrl}/login`, {
          waitUntil: 'domcontentloaded',
        })

        await page.waitForSelector(loginSelector, { timeout: 20_000 })
        await page.click(loginSelector, { clickCount: 3 })
        await page.type(loginSelector, credentials.login, { delay: 20 })
        await page.click(passwordSelector, { clickCount: 3 })
        await page.type(passwordSelector, credentials.password, { delay: 20 })
      }

      await openAndFillLoginForm()

      const submitButton = await page.$(
        'form.auth-form button[type="submit"], form.auth-form button'
      )
      if (!submitButton) {
        throw new Error('Auth smoke login submit button is missing')
      }
      await submitLoginForm()

      const loginExited = await waitForLoginExit(5_000)
        .then(() => true)
        .catch(() => false)
      if (!loginExited) {
        await ensureClientCredentials()
        const trustedVisitorCount = await grantLocalAuditClientTrust(AUDIT_ENV)
        if (trustedVisitorCount > 0) {
          console.log(
            `   • Granted local audit client trust for ${trustedVisitorCount} visitor key(s)`
          )
          const browserTrustHeaders = await collectBrowserTrustHeaders(page)
          if (AUDIT_ENV.LOCAL_AUDIT_DEBUG_CLIENT_TRUST === 'true') {
            console.log('   • Local audit login headers:', latestLoginRequestHeaders)
            console.log('   • Local audit browser headers:', browserTrustHeaders)
          }
          const trustedTurnstileCount = await grantLocalAuditTurnstileTrust(AUDIT_ENV, {
            ...browserTrustHeaders,
            ...(latestLoginRequestHeaders ?? {}),
          })
          if (trustedTurnstileCount > 0) {
            console.log(
              `   • Granted local audit Turnstile trust for ${trustedTurnstileCount} key(s)`
            )
          }
          await openAndFillLoginForm()
        }
        await submitLoginForm()
        await waitForLoginExit(25_000)
      }
      await page.waitForNetworkIdle({ idleTime: 500, timeout: 4_000 }).catch(() => {})
    },
    getPreviewDiagnostics
  )
}

async function assertAuthenticatedRoute(
  browser: puppeteer.Browser,
  baseUrl: string,
  check: RouteCheck,
  artifactDir: string,
  onFailure: (evidence: FailureEvidence) => void,
  getPreviewDiagnostics?: (() => string[] | null) | null
): Promise<void> {
  await withPageFailureEvidence(
    browser,
    artifactDir,
    { name: check.name, path: check.path },
    onFailure,
    async (page) => {
      await page.goto(`${baseUrl}${check.path}`, {
        waitUntil: 'domcontentloaded',
      })

      await page.waitForSelector(check.selector)

      const currentPath = await page.evaluate(() => window.location.pathname)
      if (currentPath === '/login') {
        throw new Error(
          `Expected authenticated route ${check.path} to stay signed in, but it redirected to /login`
        )
      }

      if (check.expectedPath && currentPath !== check.expectedPath) {
        throw new Error(
          `Expected authenticated route ${check.path} to resolve to ${check.expectedPath}, got ${currentPath}`
        )
      }

      const needsLazyReadinessScroll =
        (check.path.startsWith('/post/') || check.path.startsWith('/community/discussions/')) &&
        ((check.readinessSelectorsAll?.length ?? 0) > 0 ||
          (check.readinessSelectorsAny?.length ?? 0) > 0)

      if (needsLazyReadinessScroll) {
        const readinessProbe: ReadinessProbePayload = {
          all: check.readinessSelectorsAll ?? [],
          any: check.readinessSelectorsAny ?? [],
        }
        const anchorSelectors = check.path.startsWith('/post/')
          ? ['.post-comments']
          : ['.discussion-comments']

        for (let attempt = 0; attempt < 12; attempt += 1) {
          const readinessAlreadyPresent = await page.evaluate(({ all, any }) => {
            const allMatched = all.every((selector) => Boolean(document.querySelector(selector)))
            const anyMatched =
              any.length === 0 || any.some((selector) => Boolean(document.querySelector(selector)))
            return allMatched && anyMatched
          }, readinessProbe)

          if (readinessAlreadyPresent) break

          const reachedBottom = await page.evaluate((anchors) => {
            const anchor = anchors
              .map((selector) => document.querySelector(selector))
              .find((node): node is Element => Boolean(node))

            if (anchor) {
              anchor.scrollIntoView({ block: 'center' })
            } else {
              const maxY = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
              const nextY = Math.min(window.scrollY + Math.max(window.innerHeight * 0.9, 480), maxY)
              window.scrollTo({ top: nextY, behavior: 'auto' })
            }

            return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
          }, anchorSelectors)

          await new Promise((resolve) => setTimeout(resolve, reachedBottom ? 400 : 250))
        }
      }

      for (const selector of check.readinessSelectorsAll ?? []) {
        await page.waitForSelector(selector)
      }

      if (check.readinessSelectorsAny?.length) {
        await page.waitForFunction(
          (selectors) => selectors.some((selector) => Boolean(document.querySelector(selector))),
          {},
          check.readinessSelectorsAny
        )
      }
    },
    getPreviewDiagnostics
  )
}

async function assertServiceWorkerLifecycle(
  browser: puppeteer.Browser,
  baseUrl: string,
  artifactDir: string,
  onFailure: (evidence: FailureEvidence) => void,
  getPreviewDiagnostics?: (() => string[] | null) | null
): Promise<void> {
  await withPageFailureEvidence(
    browser,
    artifactDir,
    { name: 'service worker lifecycle', path: '/' },
    onFailure,
    async (page) => {
      await page.goto(`${baseUrl}/`, {
        waitUntil: 'networkidle0',
      })

      await page.waitForFunction(async () => {
        if (!('serviceWorker' in navigator)) return false
        const ready = await navigator.serviceWorker.ready
        const scriptUrl =
          ready.active?.scriptURL ?? ready.waiting?.scriptURL ?? ready.installing?.scriptURL ?? null
        return Boolean(scriptUrl?.endsWith('/sw.js'))
      })

      await page.reload({ waitUntil: 'networkidle0' })
      await page.waitForFunction(async () => {
        if (navigator.serviceWorker.controller) return true
        await navigator.serviceWorker.ready
        return Boolean(navigator.serviceWorker.controller)
      })

      const registrationScriptUrl = await page.evaluate(async () => {
        const ready = await navigator.serviceWorker.ready
        return (
          ready.active?.scriptURL ?? ready.waiting?.scriptURL ?? ready.installing?.scriptURL ?? null
        )
      })

      if (!registrationScriptUrl?.endsWith('/sw.js')) {
        throw new Error(`Unexpected service worker script URL: ${registrationScriptUrl}`)
      }

      await page.setOfflineMode(true)
      const offlineResponse = await page.goto(`${baseUrl}/offline-check`, {
        waitUntil: 'domcontentloaded',
      })
      await page.waitForSelector('.not-found-page')
      await page.waitForFunction(() => document.title.includes('MomiChan'))

      if (!offlineResponse) {
        throw new Error('Expected offline navigation to return a response')
      }

      if (offlineResponse.status() !== 200) {
        throw new Error(
          `Expected offline navigation to return 200, got ${offlineResponse.status()}`
        )
      }

      if (!offlineResponse.fromServiceWorker()) {
        throw new Error('Expected offline navigation to be fulfilled by the service worker')
      }

      await page.setOfflineMode(false)
      await page.goto(`${baseUrl}/search`, {
        waitUntil: 'domcontentloaded',
      })
      await page.waitForSelector('.search-page')
    },
    getPreviewDiagnostics
  )
}

function rollbackRecoveredFailure(
  summary: SmokeSummary,
  metadata: Omit<CheckRecord, 'status' | 'detail'>,
  previousFailedCheck: string | null,
  previousFailureEvidence: FailureEvidence | null
): void {
  const lastCheck = summary.checks.at(-1)
  if (lastCheck?.name === metadata.name && lastCheck.status === 'failed') {
    summary.checks.pop()
  }
  summary.lastFailedCheck = previousFailedCheck
  summary.lastFailureEvidence = previousFailureEvidence
}

async function shouldRecoverPreviewFailure(
  previewServer: PreviewShellManager,
  failureEvidence: FailureEvidence | null
): Promise<boolean> {
  if (failureEvidence?.url?.startsWith('chrome-error://')) {
    return true
  }

  return !(await previewServer.isHealthy())
}

async function recordCheckWithPreviewRecovery(
  summary: SmokeSummary,
  metadata: Omit<CheckRecord, 'status' | 'detail'>,
  previewServer: PreviewShellManager | null,
  run: () => Promise<void>
): Promise<void> {
  const previousFailedCheck = summary.lastFailedCheck
  const previousFailureEvidence = summary.lastFailureEvidence
  let recoveryAttempted = false

  while (true) {
    try {
      await recordCheck(summary, metadata, run)
      return
    } catch (error) {
      if (!previewServer || recoveryAttempted) {
        throw error
      }

      const recoverable = await shouldRecoverPreviewFailure(
        previewServer,
        summary.lastFailureEvidence
      )
      if (!recoverable) {
        throw error
      }

      recoveryAttempted = true
      rollbackRecoveredFailure(summary, metadata, previousFailedCheck, previousFailureEvidence)
      console.warn(
        `⚠️ Preview shell became unhealthy while checking ${metadata.name}; restarting once and retrying...`
      )
      await previewServer.restart()
    }
  }
}

async function main(): Promise<void> {
  console.log('🔎 Running minimal E2E checks...\n')

  const artifactDir = process.env['E2E_ARTIFACT_DIR']?.trim() || '.e2e-smoke'
  const externalBaseUrl = process.env['E2E_BASE_URL']?.trim()
  const authCredentials = resolveAuthSmokeCredentials(process.env)
  const authLogin = authCredentials.login
  const authPassword = authCredentials.password
  const samplePostRoute =
    process.env['E2E_SAMPLE_POST_ROUTE'] ?? '/post/6c73f45a-a7ec-481d-9bc5-9b09ee560fcc'
  const sampleDiscussionRoute =
    process.env['E2E_SAMPLE_DISCUSSION_ROUTE'] ??
    '/community/discussions/dd8173a9-7ecc-4ecb-a362-0286d0eee53c'
  const authSmokeEnabled = Boolean(authLogin && authPassword)
  const authSmokeRequired = process.env['E2E_REQUIRE_AUTH'] !== 'false'
  const authSkipReason = getAuthSkipReason(authLogin, authPassword, authCredentials.source)
  const summary = createSmokeSummary(artifactDir, authLogin, authPassword)
  summary.authSmokeRequired = authSmokeRequired
  const routeMatrix = getSmokeRouteMatrix({
    samplePostRoute,
    sampleDiscussionRoute,
  })
  const guestBrowserChecks: RouteCheck[] = routeMatrix.guest.map((check) => ({
    name: check.name,
    path: check.path,
    selector: check.shellSelector,
    mode: check.mode,
    expectedPath: check.expectedPath,
    expectedCanonicalPath: check.expectedCanonicalPath,
    readinessSelectorsAll: check.readinessSelectorsAll,
    readinessSelectorsAny: check.readinessSelectorsAny,
  }))
  const skippedGuestProtectedRedirectChecks = authSmokeEnabled
    ? guestBrowserChecks.filter(isGuestProtectedRedirectCheck)
    : []
  const effectiveGuestBrowserChecks = authSmokeEnabled
    ? guestBrowserChecks.filter((check) => !isGuestProtectedRedirectCheck(check))
    : guestBrowserChecks
  const authenticatedRouteChecks: RouteCheck[] = routeMatrix.auth.map((check) => ({
    name: check.name,
    path: check.path,
    selector: check.shellSelector,
    mode: check.mode,
    expectedPath: check.expectedPath,
    expectedCanonicalPath: check.expectedCanonicalPath,
    readinessSelectorsAll: check.readinessSelectorsAll,
    readinessSelectorsAny: check.readinessSelectorsAny,
  }))
  const recordFailureEvidence = (evidence: FailureEvidence) => {
    summary.lastFailureEvidence = evidence
  }

  let previewServer: PreviewShellManager | null = null
  let browser: puppeteer.Browser | null = null
  let runError: unknown = null
  const getPreviewDiagnostics = () => previewServer?.formatDiagnosticsLines() ?? null

  console.log(`🧾 Auth smoke required: ${authSmokeRequired ? 'yes' : 'no'}`)
  console.log(`🧾 Auth credentials detected: ${authSmokeEnabled ? 'yes' : 'no'}`)
  if (authSkipReason) {
    console.log(`🧾 Auth smoke skip reason (if applicable): ${authSkipReason}`)
  }

  try {
    let baseUrl: string

    if (externalBaseUrl) {
      baseUrl = normalizeBaseUrl(externalBaseUrl)
      console.log(`🌐 Using existing E2E base URL: ${baseUrl}`)
    } else {
      console.log('🏗️ Building production bundle...')
      await withBuildArtifactLock(
        'vite-dist-build',
        () => runBunTask('build', { env: AUDIT_ENV }),
        {
          onWait: () => {
            console.log('🔒 Waiting for another build process to release the dist artifact lock...')
          },
        }
      )
      previewServer = new PreviewShellManager({
        env: AUDIT_ENV,
        candidatePorts: PREVIEW_PORT_CANDIDATES,
        allowRandomPortFallback: !hasAuthSmokeCredentials(AUDIT_ENV),
      })
      await previewServer.start()
      baseUrl = previewServer.baseUrl ?? ''
    }

    summary.baseUrl = baseUrl
    await mkdir(artifactDir, { recursive: true })

    console.log('🧱 Verifying static prerendered HTML...')
    for (const check of STATIC_ROUTE_CHECKS) {
      await recordCheck(
        summary,
        {
          name: check.name,
          kind: 'static',
          mode: 'guest',
          path: check.path,
        },
        () => assertStaticPrerenderedRoute(baseUrl, check.path, check.expected)
      )
    }

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    console.log('🧭 Verifying guest browser routes...')
    if (skippedGuestProtectedRedirectChecks.length > 0) {
      const reason =
        'Skipped during authenticated local audit; protected route access is verified by authenticated smoke routes.'
      markChecksSkipped(summary, skippedGuestProtectedRedirectChecks, reason)
      console.log(
        `   • Skipping ${skippedGuestProtectedRedirectChecks.length} guest protected redirect checks in authenticated local audit`
      )
    }

    for (const check of effectiveGuestBrowserChecks) {
      await recordCheckWithPreviewRecovery(
        summary,
        {
          name: check.name,
          kind: 'browser',
          mode: 'guest',
          path: check.path,
          selector: check.selector,
          readinessSelectorsAll: check.readinessSelectorsAll,
          readinessSelectorsAny: check.readinessSelectorsAny,
          expectedPath: check.expectedPath,
        },
        previewServer,
        () =>
          assertBrowserRoute(
            browser!,
            baseUrl,
            check,
            artifactDir,
            recordFailureEvidence,
            getPreviewDiagnostics
          )
      )
    }

    if (authSmokeEnabled) {
      console.log('🔐 Verifying authenticated smoke routes...')
      summary.authSmokeExecuted = true
      const clearedRateLimitKeys = await clearLocalAuditRateLimitState(AUDIT_ENV)
      if (clearedRateLimitKeys > 0) {
        console.log(`   • Cleared ${clearedRateLimitKeys} local audit rate-limit keys`)
      }
      await recordCheck(
        summary,
        {
          name: 'auth login bootstrap',
          kind: 'auth',
          mode: 'auth',
          path: '/api/v1/auth/login',
        },
        () =>
          authenticateViaApi(
            browser!,
            baseUrl,
            {
              login: authLogin,
              password: authPassword,
            },
            artifactDir,
            recordFailureEvidence,
            getPreviewDiagnostics
          )
      )

      for (const check of authenticatedRouteChecks) {
        await recordCheckWithPreviewRecovery(
          summary,
          {
            name: check.name,
            kind: 'auth',
            mode: 'auth',
            path: check.path,
            selector: check.selector,
            readinessSelectorsAll: check.readinessSelectorsAll,
            readinessSelectorsAny: check.readinessSelectorsAny,
            expectedPath: check.expectedPath,
          },
          previewServer,
          () =>
            assertAuthenticatedRoute(
              browser!,
              baseUrl,
              check,
              artifactDir,
              recordFailureEvidence,
              getPreviewDiagnostics
            )
        )
      }
    } else {
      summary.authSmokeSkipReason = authSkipReason
      markChecksSkipped(
        summary,
        [
          {
            name: 'auth login bootstrap',
            path: '/api/v1/auth/login',
            selector: '',
            mode: 'auth',
          },
          ...authenticatedRouteChecks,
        ],
        authSkipReason ?? 'Auth smoke credentials unavailable'
      )
      console.log(
        `🔐 Skipping authenticated smoke because ${authSkipReason ?? 'credentials are unavailable'} (guest-only local smoke is expected in this mode)`
      )
      if (authSmokeRequired) {
        throw new Error(
          `Authenticated smoke is required, but ${authSkipReason ?? 'credentials are unavailable'}. Provide PRIMARY_USERNAME/PRIMARY_PASSWORD for a seeded non-MFA smoke account. Legacy aliases E2E_AUTH_LOGIN/E2E_AUTH_PASSWORD remain supported.`
        )
      }
    }

    if (!externalBaseUrl) {
      console.log('🛰️ Verifying service worker lifecycle...')
      await recordCheck(
        summary,
        {
          name: 'service worker lifecycle',
          kind: 'service-worker',
          mode: 'guest',
          path: '/',
        },
        () =>
          assertServiceWorkerLifecycle(
            browser!,
            baseUrl,
            artifactDir,
            recordFailureEvidence,
            getPreviewDiagnostics
          )
      )
    } else {
      appendCheck(summary, {
        name: 'service worker lifecycle',
        kind: 'service-worker',
        mode: 'guest',
        status: 'skipped',
        path: '/',
        detail: 'External base URL mode skips local service worker lifecycle audit',
      })
      console.log('🛰️ Skipping local service worker lifecycle audit for external base URL')
    }

    console.log('\n✅ Minimal E2E checks passed')
  } catch (error) {
    runError = error
    console.error('\n❌ Minimal E2E checks failed:', error)
  } finally {
    if (browser) {
      await browser.close().catch(() => {
        // ignore
      })
    }
    if (previewServer) {
      await previewServer.stop()
    }

    try {
      await writeSmokeArtifacts(summary)
      console.log(`🧾 Wrote smoke summary to ${summary.artifactDir}`)
    } catch (artifactError) {
      console.error('Failed to write smoke artifacts:', artifactError)
      if (!runError) {
        runError = artifactError
      }
    }
  }

  if (runError) {
    process.exitCode = 1
  }
}

void main()
