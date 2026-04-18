#!/usr/bin/env bun
/**
 * 前端健康巡检脚本（路由可用性 + 基础可访问性 + 控制台与网络错误）
 *
 * 用法：
 *   bun run scripts/frontend-health-check.ts
 *   FRONTEND_HEALTH_BASE_URL=http://localhost:5174 bun run scripts/frontend-health-check.ts
 */

import puppeteer, { type Viewport, type Page } from 'puppeteer'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import {
  applyLocalAuditEnvToProcess,
  createLocalAuditEnv,
  resolveLocalAuditPreviewPorts,
} from './lib/audit-env.js'
import { shouldIgnoreConsoleError, shouldIgnoreRequestIssue } from './lib/frontend-health'
import { withBuildArtifactLock } from './lib/build-artifact-lock.js'
import {
  PreviewShellManager,
  clearLocalAuditRateLimitState,
  grantLocalAuditClientTrust,
  grantLocalAuditTurnstileTrust,
  runBunTask,
} from './lib/preview-shell.js'
import {
  DEFAULT_SAMPLE_DISCUSSION_ROUTE,
  DEFAULT_SAMPLE_POST_ROUTE,
  getSmokeRouteMatrix,
} from './lib/release-route-contract.js'
import { ensureDetailRouteReadiness, resolveSampleDetailRoute } from './lib/detail-route-utils.js'
import { getAuthSkipReason, resolveAuthSmokeCredentials } from './lib/e2e-smoke-report.js'

applyLocalAuditEnvToProcess()

interface ScanIssue {
  type: string
  message: string
  details?: string[]
}

interface RouteResult {
  route: string
  name: string
  viewport: string
  issues: ScanIssue[]
}

interface HealthRouteDefinition {
  name: string
  path: string
  mode: 'guest' | 'auth'
  shellSelector?: string
  expectedPath?: string
  readinessSelectorsAll?: string[]
  readinessSelectorsAny?: string[]
}

interface RuntimeProbe {
  duplicateIds: Array<{ id: string; count: number }>
  unlabeledButtons: string[]
  unlabeledInputs: string[]
  missingAriaControls: Array<{ selector: string; controls: string }>
  emptyLinks: string[]
  imageWithoutAlt: string[]
  horizontalOverflow: boolean
}

interface HealthFailureEvidence {
  route: string
  viewport: string
  issueType: string
  issueMessage: string
  issueDetails: string[]
  title: string | null
  pathname: string | null
  url: string | null
  screenshotPath: string | null
  htmlSnapshotPath: string | null
  previewDiagnostics: string[] | null
  consoleMessages: string[] | null
  requestFailures: string[] | null
  badResponses: string[] | null
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

interface FrontendHealthSummary {
  artifactDir: string
  baseUrl: string
  authRequired: boolean
  authLoginPresent: boolean
  authPasswordPresent: boolean
  authCredentialsDetected: boolean
  authHealthExecuted: boolean
  authHealthSkipReason: string | null
  scannedRouteViewportCount: number
  issueCount: number
  crashed: boolean
  firstBlockingIssue: HealthFailureEvidence | null
  results: RouteResult[]
}

const BASE_URL = process.env['FRONTEND_HEALTH_BASE_URL'] ?? 'http://localhost:5174'
const ARTIFACT_DIR = process.env['FRONTEND_HEALTH_ARTIFACT_DIR']?.trim() || '.frontend-health'
const AUTO_START = process.env['FRONTEND_HEALTH_AUTOSTART'] !== 'false'
const PREVIEW_PORT = Number(process.env['FRONTEND_HEALTH_PREVIEW_PORT'] ?? '4173')
const INCLUDE_API_ERRORS = process.env['FRONTEND_HEALTH_INCLUDE_API_ERRORS'] === 'true'
const REQUESTED_SAMPLE_POST_ROUTE =
  process.env['FRONTEND_HEALTH_SAMPLE_POST_ROUTE'] ?? DEFAULT_SAMPLE_POST_ROUTE
const REQUESTED_SAMPLE_DISCUSSION_ROUTE =
  process.env['FRONTEND_HEALTH_SAMPLE_DISCUSSION_ROUTE'] ?? DEFAULT_SAMPLE_DISCUSSION_ROUTE
const AUTH_CREDENTIALS = resolveAuthSmokeCredentials(process.env)
const AUTH_LOGIN = AUTH_CREDENTIALS.login
const AUTH_PASSWORD = AUTH_CREDENTIALS.password
const AUTH_REQUIRED =
  (process.env['FRONTEND_HEALTH_REQUIRE_AUTH'] ?? process.env['E2E_REQUIRE_AUTH'] ?? 'true') !==
  'false'
const BASE_AUDIT_ENV = createLocalAuditEnv(process.env, {
  includeContractFallback: true,
})
const AUDIT_ENV_HAS_AUTH = Boolean(AUTH_LOGIN && AUTH_PASSWORD)
const AUDIT_ENV = {
  ...BASE_AUDIT_ENV,
  VITE_LOCAL_AUDIT_PERSIST_AUTH_SESSION: AUDIT_ENV_HAS_AUTH
    ? 'true'
    : (BASE_AUDIT_ENV['VITE_LOCAL_AUDIT_PERSIST_AUTH_SESSION'] ?? 'false'),
  VITE_ENABLE_CLIENT_INIT: AUDIT_ENV_HAS_AUTH
    ? 'true'
    : (BASE_AUDIT_ENV['VITE_ENABLE_CLIENT_INIT'] ?? 'false'),
  VITE_ENABLE_SCHEDULE_API: BASE_AUDIT_ENV['VITE_ENABLE_SCHEDULE_API'] ?? 'false',
  VITE_ENABLE_DATA_PREFETCH: BASE_AUDIT_ENV['VITE_ENABLE_DATA_PREFETCH'] ?? 'false',
  VITE_DISABLE_PREVIEW_PROXY: AUDIT_ENV_HAS_AUTH
    ? 'false'
    : (BASE_AUDIT_ENV['VITE_DISABLE_PREVIEW_PROXY'] ?? 'true'),
}
const PREVIEW_PORT_CANDIDATES = resolveLocalAuditPreviewPorts(AUDIT_ENV, [
  'FRONTEND_HEALTH_PREVIEW_PORTS',
  'FRONTEND_HEALTH_PREVIEW_PORT',
  'LOCAL_AUDIT_PREVIEW_PORTS',
])

const VIEWPORTS: Array<{ name: string; value: Viewport }> = [
  { name: 'desktop', value: { width: 1440, height: 900 } },
  { name: 'mobile', value: { width: 390, height: 844, isMobile: true, hasTouch: true } },
]

const MAX_SAMPLE = 5

function sample<T>(values: T[]): T[] {
  return values.slice(0, MAX_SAMPLE)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isLocalAuditOrigin(baseUrl: string): boolean {
  try {
    const hostname = new URL(baseUrl).hostname
    return hostname === '127.0.0.1' || hostname === 'localhost'
  } catch {
    return false
  }
}

function isGuestProtectedRedirectRoute(
  route: Pick<HealthRouteDefinition, 'mode' | 'expectedPath'>
): boolean {
  return route.mode === 'guest' && route.expectedPath === '/login'
}

function isGuestOnlyAuthEntryRoute(route: Pick<HealthRouteDefinition, 'mode' | 'path'>): boolean {
  return (
    route.mode === 'guest' &&
    (route.path === '/login' || route.path === '/register' || route.path === '/forgot-password')
  )
}

function toHealthRouteDefinition(route: {
  name: string
  path: string
  mode: 'guest' | 'auth'
  shellSelector?: string
  expectedPath?: string
  readinessSelectorsAll?: string[]
  readinessSelectorsAny?: string[]
}): HealthRouteDefinition {
  return {
    name: route.name,
    path: route.path,
    mode: route.mode,
    shellSelector: route.shellSelector,
    expectedPath: route.expectedPath,
    readinessSelectorsAll: route.readinessSelectorsAll,
    readinessSelectorsAny: route.readinessSelectorsAny,
  }
}

function buildGuestRoutes(
  samplePostRoute: string,
  sampleDiscussionRoute: string
): HealthRouteDefinition[] {
  return [
    ...getSmokeRouteMatrix({
      samplePostRoute,
      sampleDiscussionRoute,
    }).guest.map(toHealthRouteDefinition),
    { name: 'schedule route', path: '/schedule', mode: 'guest', shellSelector: '.schedule-page' },
    { name: 'about route', path: '/about', mode: 'guest' },
    { name: 'contact route', path: '/contact', mode: 'guest' },
    {
      name: 'register route',
      path: '/register',
      mode: 'guest',
      shellSelector: '.auth-page--register',
    },
    {
      name: 'forgot password route',
      path: '/forgot-password',
      mode: 'guest',
      shellSelector: '.auth-page--forgot',
    },
  ]
}

function buildAuthRoutes(
  samplePostRoute: string,
  sampleDiscussionRoute: string
): HealthRouteDefinition[] {
  return getSmokeRouteMatrix({
    samplePostRoute,
    sampleDiscussionRoute,
  }).auth.map(toHealthRouteDefinition)
}

function skipRouteResult(route: HealthRouteDefinition, viewport: string): RouteResult {
  return {
    route: route.path,
    name: `${route.name} (skipped)`,
    viewport,
    issues: [],
  }
}

async function clearBrowserAuditSession(page: Page, baseUrl: string): Promise<void> {
  const cdpSession = await page.createCDPSession().catch(() => null)
  try {
    await cdpSession?.send('Network.clearBrowserCookies').catch(() => undefined)
    await cdpSession?.send('Network.clearBrowserCache').catch(() => undefined)
    await page
      .goto(`${baseUrl}/`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })
      .catch(() => undefined)
    await page
      .evaluate(async () => {
        window.localStorage.clear()
        window.sessionStorage.clear()

        if ('caches' in window) {
          const cacheNames = await window.caches.keys()
          await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)))
        }

        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations()
          await Promise.all(registrations.map((registration) => registration.unregister()))
        }
      })
      .catch(() => undefined)
  } finally {
    await cdpSession?.detach().catch(() => undefined)
  }
}

async function readPageRouteState(page: Page): Promise<{
  url: string
  pathname: string | null
  title: string | null
}> {
  const [pathname, title] = await Promise.all([
    page.evaluate(() => window.location.pathname).catch(() => null),
    page.title().catch(() => null),
  ])
  return {
    url: page.url(),
    pathname,
    title,
  }
}

async function waitForRoutePath(
  page: Page,
  expectedPath: string,
  context: string,
  timeout = 5_000
): Promise<void> {
  await page
    .waitForFunction((path) => window.location.pathname === path, { timeout }, expectedPath)
    .catch(async () => {
      const state = await readPageRouteState(page)
      throw new Error(
        `${context}: expected browser path ${expectedPath}, got ${state.pathname ?? 'unknown'} (${state.url}, title: ${state.title ?? 'unknown'})`
      )
    })
}

async function waitForLoginShellSelector(
  page: Page,
  selector: string,
  context: string,
  timeout = 15_000
): Promise<void> {
  try {
    await page.waitForSelector(selector, { timeout })
  } catch (error) {
    const state = await readPageRouteState(page)
    if (state.pathname !== '/login') {
      throw new Error(
        `${context}: auth guard/session state drift; login route left /login before auth shell rendered, current path ${state.pathname ?? 'unknown'} (${state.url}, title: ${state.title ?? 'unknown'})`
      )
    }

    throw new Error(
      `${context}: LoginPage mount/runtime failure; selector ${selector} was not found on /login (title: ${state.title ?? 'unknown'}) after ${timeout}ms. Original error: ${formatError(error)}`
    )
  }
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

async function prewarmLocalAuditTrust(page: Page, baseUrl: string): Promise<boolean> {
  if (!isLocalAuditOrigin(baseUrl)) {
    return false
  }

  await clearBrowserAuditSession(page, baseUrl)
  await page.goto(`${baseUrl}/`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })

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

    return response.ok
  })

  if (!result) {
    return false
  }

  const trustedVisitorCount = await grantLocalAuditClientTrust(AUDIT_ENV)
  if (trustedVisitorCount <= 0) {
    return false
  }

  const trustedTurnstileCount = await grantLocalAuditTurnstileTrust(
    AUDIT_ENV,
    await collectBrowserTrustHeaders(page)
  )

  console.log(`🔐 Prewarmed local audit client trust for ${trustedVisitorCount} visitor key(s)`)
  if (trustedTurnstileCount > 0) {
    console.log(`🔐 Prewarmed local audit Turnstile trust for ${trustedTurnstileCount} key(s)`)
  }

  return true
}

function filterGuestProtectedRedirectNoise(
  route: Pick<HealthRouteDefinition, 'mode' | 'expectedPath'>,
  managedPreview: boolean,
  consoleIssueDetails: string[],
  requestFailures: string[],
  badResponses: string[]
): {
  consoleIssueDetails: string[]
  requestFailures: string[]
  badResponses: string[]
} {
  if (!managedPreview || !isGuestProtectedRedirectRoute(route)) {
    return {
      consoleIssueDetails,
      requestFailures,
      badResponses,
    }
  }

  const ignoredRefreshResponse = badResponses.some((entry) =>
    entry.includes('/api/v1/auth/refresh')
  )
  const ignoredRefreshFailure = requestFailures.some((entry) =>
    entry.includes('/api/v1/auth/refresh')
  )
  const shouldIgnoreGenericRefreshConsole = ignoredRefreshResponse || ignoredRefreshFailure

  return {
    consoleIssueDetails: consoleIssueDetails.filter((entry) => {
      if (entry.includes('/api/v1/auth/refresh')) return false
      if (
        shouldIgnoreGenericRefreshConsole &&
        entry.startsWith('blocking-http-error::') &&
        entry.replace('blocking-http-error::', '').trim() ===
          'Failed to load resource: the server responded with a status of 404 (Not Found)'
      ) {
        return false
      }
      return true
    }),
    requestFailures: requestFailures.filter((entry) => !entry.includes('/api/v1/auth/refresh')),
    badResponses: badResponses.filter((entry) => !entry.includes('/api/v1/auth/refresh')),
  }
}

async function ensureRouteReadiness(
  page: Page,
  route: Pick<HealthRouteDefinition, 'path' | 'readinessSelectorsAll' | 'readinessSelectorsAny'>
): Promise<void> {
  await ensureDetailRouteReadiness(page, route, { timeout: 15_000 })
}

async function assertHealthRouteContract(page: Page, route: HealthRouteDefinition): Promise<void> {
  if (route.shellSelector) {
    const expectedPath = route.expectedPath ?? route.path
    if (expectedPath === '/login' || route.path === '/login') {
      await waitForRoutePath(page, expectedPath, `${route.name} route`)
      await waitForLoginShellSelector(page, route.shellSelector, `${route.name} route`)
    } else {
      await page.waitForSelector(route.shellSelector, { timeout: 15_000 })
    }
  }

  if (route.expectedPath) {
    const currentPath = await page.evaluate(() => window.location.pathname)
    if (currentPath !== route.expectedPath) {
      throw new Error(
        `Expected ${route.path} to resolve to ${route.expectedPath}, got ${currentPath}`
      )
    }
  }

  await ensureRouteReadiness(page, route)
}

async function isBaseUrlReachable(url: string): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4_000)
  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

async function captureFailureEvidence(
  page: Page,
  artifactDir: string,
  route: string,
  viewport: string,
  issue: ScanIssue,
  getPreviewDiagnostics?: (() => string[] | null) | null,
  runtimeDiagnostics?: {
    consoleMessages?: string[]
    requestFailures?: string[]
    badResponses?: string[]
  }
): Promise<HealthFailureEvidence> {
  await mkdir(artifactDir, { recursive: true })

  const screenshotPath = join(artifactDir, 'failure-first.png')
  const htmlSnapshotPath = join(artifactDir, 'failure-first.html')

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
    route,
    viewport,
    issueType: issue.type,
    issueMessage: issue.message,
    issueDetails: issue.details ?? [],
    title,
    pathname,
    url,
    screenshotPath,
    htmlSnapshotPath: typeof html === 'string' ? htmlSnapshotPath : null,
    previewDiagnostics: getPreviewDiagnostics?.() ?? null,
    consoleMessages: runtimeDiagnostics?.consoleMessages?.slice(-20) ?? null,
    requestFailures: runtimeDiagnostics?.requestFailures?.slice(-20) ?? null,
    badResponses: runtimeDiagnostics?.badResponses?.slice(-20) ?? null,
  }
}

async function authenticateViaApi(
  browser: puppeteer.Browser,
  baseUrl: string,
  credentials: { login: string; password: string },
  options?: {
    getPreviewDiagnostics?: (() => string[] | null) | null
    onFailureEvidence?: (evidence: HealthFailureEvidence) => void
  }
): Promise<void> {
  const page = await browser.newPage()
  const consoleMessages: string[] = []
  const requestFailures: string[] = []
  const badResponses: string[] = []

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`)
    }
  })
  page.on('requestfailed', (request) => {
    requestFailures.push(
      `${request.method()} ${request.url()} (${request.failure()?.errorText ?? 'unknown'})`
    )
  })
  page.on('response', (response) => {
    const status = response.status()
    if (status >= 400) {
      badResponses.push(`${status} ${response.request().method()} ${response.url()}`)
    }
  })

  try {
    const waitForLoginExit = (timeout: number) =>
      page.waitForFunction(
        () =>
          window.location.pathname !== '/login' && !window.location.pathname.startsWith('/login/'),
        { timeout }
      )
    const waitForClientCredentials = (timeout: number) =>
      page.waitForFunction(
        () => {
          const raw = window.localStorage.getItem('momi_client_security')
          if (!raw) return false
          try {
            const parsed = JSON.parse(raw) as { client_token?: unknown; client_secret?: unknown }
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
        const asJsonRecord = (value: unknown): Record<string, unknown> | null =>
          value && typeof value === 'object' && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : null

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
        const clientSecret = typeof payload?.client_secret === 'string' ? payload.client_secret : ''
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
          `Frontend health auth bootstrap failed to force issue client credentials: HTTP ${result.status} ${result.detail ?? ''}`.trim()
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
    const openAndFillLoginForm = async (options?: { resetSession?: boolean }): Promise<boolean> => {
      if (options?.resetSession) {
        await clearBrowserAuditSession(page, baseUrl)
      }
      await page.goto(`${baseUrl}/login`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })

      await waitForRoutePath(page, '/login', 'frontend health auth bootstrap')
      const loginInput = await page
        .waitForSelector(loginSelector, { timeout: 20_000 })
        .catch(async (error) => {
          const state = await readPageRouteState(page)
          if (state.pathname !== '/login') {
            return null
          }
          throw new Error(
            `frontend health auth bootstrap: LoginPage mount/runtime failure; selector ${loginSelector} was not found on /login (title: ${state.title ?? 'unknown'}) after 20000ms. Original error: ${formatError(error)}`
          )
        })
      if (!loginInput) {
        return false
      }
      await loginInput.dispose()
      await page.click(loginSelector, { clickCount: 3 })
      await page.type(loginSelector, credentials.login, { delay: 20 })
      await page.click(passwordSelector, { clickCount: 3 })
      await page.type(passwordSelector, credentials.password, { delay: 20 })
      return true
    }

    const prewarmedLocalTrust = await prewarmLocalAuditTrust(page, baseUrl)
    const loginFormReady = await openAndFillLoginForm({ resetSession: !prewarmedLocalTrust })
    if (!loginFormReady) {
      await page.waitForNetworkIdle({ idleTime: 500, timeout: 4_000 }).catch(() => undefined)
      return
    }

    const submitButton = await page.$('form.auth-form button[type="submit"], form.auth-form button')
    if (!submitButton) {
      throw new Error('Frontend health auth bootstrap submit button is missing')
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
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 4_000 }).catch(() => undefined)
  } catch (error) {
    const state = await readPageRouteState(page).catch(() => ({
      url: page.url(),
      pathname: null,
      title: null,
    }))
    const evidence = await captureFailureEvidence(
      page,
      ARTIFACT_DIR,
      state.pathname ?? '/login',
      'auth-bootstrap',
      {
        type: 'auth-bootstrap',
        message: `认证预热失败: ${formatError(error)}`,
        details: [
          `url=${state.url}`,
          `pathname=${state.pathname ?? 'unknown'}`,
          `title=${state.title ?? 'unknown'}`,
        ],
      },
      options?.getPreviewDiagnostics,
      {
        consoleMessages,
        requestFailures,
        badResponses,
      }
    )
    options?.onFailureEvidence?.(evidence)
    throw error
  } finally {
    await page.close().catch(() => undefined)
  }
}

function buildHealthMarkdown(summary: FrontendHealthSummary): string {
  const lines = [
    '## Frontend Health Summary',
    '',
    `- Base URL: \`${summary.baseUrl}\``,
    `- Auth required: ${summary.authRequired ? 'yes' : 'no'}`,
    `- Auth credentials detected: ${summary.authCredentialsDetected ? 'yes' : 'no'} (login: ${summary.authLoginPresent ? 'present' : 'missing'}, password: ${summary.authPasswordPresent ? 'present' : 'missing'})`,
    `- Auth health: ${summary.authHealthExecuted ? 'executed' : `skipped (${summary.authHealthSkipReason ?? 'credentials unavailable'})`}`,
    `- Scanned route/viewport combinations: ${summary.scannedRouteViewportCount}`,
    `- Issues: ${summary.issueCount}`,
    `- Crashed: ${summary.crashed ? 'yes' : 'no'}`,
    `- First blocking route: ${summary.firstBlockingIssue?.route ?? 'none'}`,
    `- First blocking viewport: ${summary.firstBlockingIssue?.viewport ?? 'n/a'}`,
    `- First blocking issue: ${summary.firstBlockingIssue ? `${summary.firstBlockingIssue.issueType} - ${summary.firstBlockingIssue.issueMessage}` : 'none'}`,
    `- Failure screenshot: ${summary.firstBlockingIssue?.screenshotPath ?? 'n/a'}`,
    `- Failure HTML snapshot: ${summary.firstBlockingIssue?.htmlSnapshotPath ?? 'n/a'}`,
    `- Console diagnostics attached: ${summary.firstBlockingIssue?.consoleMessages?.length ? 'yes' : 'no'}`,
    `- Request failure diagnostics attached: ${summary.firstBlockingIssue?.requestFailures?.length ? 'yes' : 'no'}`,
    `- HTTP error diagnostics attached: ${summary.firstBlockingIssue?.badResponses?.length ? 'yes' : 'no'}`,
    '',
    '| Route | Viewport | Issue Count | Types |',
    '| --- | --- | --- | --- |',
  ]

  for (const result of summary.results) {
    const issueTypes = result.issues.length
      ? Array.from(new Set(result.issues.map((issue) => issue.type))).join(', ')
      : '-'
    lines.push(`| ${result.route} | ${result.viewport} | ${result.issues.length} | ${issueTypes} |`)
  }

  if (summary.firstBlockingIssue?.issueDetails.length) {
    lines.push('', '### First Blocking Details', '')
    for (const detail of summary.firstBlockingIssue.issueDetails) {
      lines.push(`- ${detail}`)
    }
  }

  if (summary.firstBlockingIssue?.previewDiagnostics?.length) {
    lines.push('', '### Preview Diagnostics', '')
    for (const detail of summary.firstBlockingIssue.previewDiagnostics) {
      lines.push(`- ${detail}`)
    }
  }

  if (summary.firstBlockingIssue?.consoleMessages?.length) {
    lines.push('', '### Browser Console Diagnostics', '')
    for (const detail of summary.firstBlockingIssue.consoleMessages) {
      lines.push(`- ${detail}`)
    }
  }

  if (summary.firstBlockingIssue?.requestFailures?.length) {
    lines.push('', '### Browser Request Failures', '')
    for (const detail of summary.firstBlockingIssue.requestFailures) {
      lines.push(`- ${detail}`)
    }
  }

  if (summary.firstBlockingIssue?.badResponses?.length) {
    lines.push('', '### Browser HTTP Error Responses', '')
    for (const detail of summary.firstBlockingIssue.badResponses) {
      lines.push(`- ${detail}`)
    }
  }

  lines.push('')
  return lines.join('\n')
}

async function writeHealthArtifacts(summary: FrontendHealthSummary): Promise<void> {
  await mkdir(summary.artifactDir, { recursive: true })
  await writeFile(
    join(summary.artifactDir, 'summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
    'utf8'
  )
  await writeFile(
    join(summary.artifactDir, 'summary.md'),
    `${buildHealthMarkdown(summary)}\n`,
    'utf8'
  )
}

async function probeRuntime(page: Page): Promise<RuntimeProbe> {
  return page.evaluate(() => {
    const normalize = (value: string | null | undefined) =>
      (value ?? '').replace(/\s+/g, ' ').trim()
    const clip = (value: string) => (value.length > 140 ? `${value.slice(0, 140)}…` : value)

    const getSelector = (element: Element): string => {
      const parts: string[] = []
      let current: Element | null = element
      let depth = 0
      while (current && depth < 4) {
        let part = current.tagName.toLowerCase()
        if (current.id) {
          part += `#${current.id}`
          parts.unshift(part)
          break
        }
        if (current.classList.length > 0) {
          part += `.${Array.from(current.classList).slice(0, 2).join('.')}`
        }
        parts.unshift(part)
        current = current.parentElement
        depth++
      }
      return clip(parts.join(' > '))
    }

    const duplicateIds: Array<{ id: string; count: number }> = []
    const idCounts = new Map<string, number>()
    for (const el of document.querySelectorAll<HTMLElement>('[id]')) {
      idCounts.set(el.id, (idCounts.get(el.id) ?? 0) + 1)
    }
    for (const [id, count] of idCounts.entries()) {
      if (count > 1) duplicateIds.push({ id, count })
    }

    const unlabeledButtons: string[] = []
    for (const button of document.querySelectorAll<HTMLButtonElement>('button')) {
      const text = normalize(button.textContent)
      const ariaLabel = normalize(button.getAttribute('aria-label'))
      const ariaLabelledBy = normalize(button.getAttribute('aria-labelledby'))
      const title = normalize(button.getAttribute('title'))
      if (!text && !ariaLabel && !ariaLabelledBy && !title) {
        unlabeledButtons.push(getSelector(button))
      }
    }

    const unlabeledInputs: string[] = []
    for (const input of document.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >('input, textarea, select')) {
      if (input instanceof HTMLInputElement && input.type === 'hidden') continue
      const ariaLabel = normalize(input.getAttribute('aria-label'))
      const ariaLabelledBy = normalize(input.getAttribute('aria-labelledby'))
      const title = normalize(input.getAttribute('title'))
      const inputId = input.id
      const hasLabel = !!(
        inputId && document.querySelector(`label[for="${window.CSS.escape(inputId)}"]`)
      )
      const wrappedLabel = !!input.closest('label')
      if (!ariaLabel && !ariaLabelledBy && !title && !hasLabel && !wrappedLabel) {
        unlabeledInputs.push(getSelector(input))
      }
    }

    const missingAriaControls: Array<{ selector: string; controls: string }> = []
    for (const el of document.querySelectorAll<HTMLElement>('[aria-controls]')) {
      const controls = normalize(el.getAttribute('aria-controls'))
      if (!controls) continue
      const missing = controls
        .split(/\s+/)
        .filter((id) => id.length > 0 && !document.getElementById(id))
      if (missing.length > 0) {
        missingAriaControls.push({
          selector: getSelector(el),
          controls,
        })
      }
    }

    const emptyLinks: string[] = []
    for (const link of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
      const text = normalize(link.textContent)
      const ariaLabel = normalize(link.getAttribute('aria-label'))
      const title = normalize(link.getAttribute('title'))
      if (!text && !ariaLabel && !title) emptyLinks.push(getSelector(link))
    }

    const imageWithoutAlt: string[] = []
    for (const image of document.querySelectorAll<HTMLImageElement>('img')) {
      if (!image.hasAttribute('alt')) imageWithoutAlt.push(getSelector(image))
    }

    const horizontalOverflow = document.documentElement.scrollWidth > window.innerWidth + 1

    return {
      duplicateIds,
      unlabeledButtons,
      unlabeledInputs,
      missingAriaControls,
      emptyLinks,
      imageWithoutAlt,
      horizontalOverflow,
    }
  })
}

function collectProbeIssues(probe: RuntimeProbe): ScanIssue[] {
  const issues: ScanIssue[] = []

  if (probe.duplicateIds.length > 0) {
    issues.push({
      type: 'a11y-shell',
      message: `发现重复 id: ${probe.duplicateIds.map((v) => `${v.id}×${v.count}`).join(', ')}`,
    })
  }

  if (probe.unlabeledButtons.length > 0) {
    issues.push({
      type: 'a11y-shell',
      message: `存在缺少可访问名称的按钮 (${probe.unlabeledButtons.length})`,
      details: sample(probe.unlabeledButtons),
    })
  }

  if (probe.unlabeledInputs.length > 0) {
    issues.push({
      type: 'a11y-shell',
      message: `存在缺少可访问名称/标签的输入控件 (${probe.unlabeledInputs.length})`,
      details: sample(probe.unlabeledInputs),
    })
  }

  if (probe.missingAriaControls.length > 0) {
    issues.push({
      type: 'a11y-shell',
      message: `存在 aria-controls 指向不存在目标 (${probe.missingAriaControls.length})`,
      details: sample(probe.missingAriaControls.map((v) => `${v.selector} -> ${v.controls}`)),
    })
  }

  if (probe.emptyLinks.length > 0) {
    issues.push({
      type: 'a11y-shell',
      message: `存在没有名称的链接 (${probe.emptyLinks.length})`,
      details: sample(probe.emptyLinks),
    })
  }

  if (probe.imageWithoutAlt.length > 0) {
    issues.push({
      type: 'a11y-shell',
      message: `存在缺少 alt 的图片 (${probe.imageWithoutAlt.length})`,
      details: sample(probe.imageWithoutAlt),
    })
  }

  if (probe.horizontalOverflow) {
    issues.push({
      type: 'layout-overflow',
      message: '页面出现横向溢出',
    })
  }

  return issues
}

function attachPageDiagnostics(
  page: Page,
  healthFilterOptions: { baseOrigin: string },
  consoleErrors: Set<string>,
  requestFailures: Set<string>,
  badResponses: Set<string>
): void {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      if (
        shouldIgnoreConsoleError(text, INCLUDE_API_ERRORS, msg.location().url, healthFilterOptions)
      ) {
        return
      }
      const issueType = text.toLowerCase().includes('failed to load resource')
        ? 'blocking-http-error'
        : 'console-error'
      consoleErrors.add(`${issueType}::${msg.text()}`)
    }
  })

  page.on('requestfailed', (req) => {
    if (shouldIgnoreRequestIssue(req.url(), INCLUDE_API_ERRORS, healthFilterOptions)) return
    const reason = req.failure()?.errorText ?? 'unknown'
    requestFailures.add(`${req.method()} ${req.url()} (${reason})`)
  })

  page.on('response', (res) => {
    const status = res.status()
    if (shouldIgnoreRequestIssue(res.url(), INCLUDE_API_ERRORS, healthFilterOptions)) return
    if (status >= 400) {
      badResponses.add(`${status} ${res.request().method()} ${res.url()}`)
    }
  })
}

async function shouldRecoverManagedPreview(
  page: Page,
  managedPreview: PreviewShellManager | null
): Promise<boolean> {
  if (!managedPreview) return false
  if (page.url().startsWith('chrome-error://')) return true
  return !(await managedPreview.isHealthy())
}

async function main() {
  let effectiveBaseUrl = BASE_URL
  let managedServer: PreviewShellManager | null = null
  const results: RouteResult[] = []
  let crashed = false
  let firstBlockingIssue: HealthFailureEvidence | null = null
  const authSkipReason = getAuthSkipReason(AUTH_LOGIN, AUTH_PASSWORD, AUTH_CREDENTIALS.source)
  const authCredentialsDetected = Boolean(AUTH_LOGIN && AUTH_PASSWORD)
  const getPreviewDiagnostics = () => managedServer?.formatDiagnosticsLines() ?? null

  try {
    await mkdir(ARTIFACT_DIR, { recursive: true })

    const reachable = await isBaseUrlReachable(BASE_URL)
    if (!reachable) {
      if (!AUTO_START) {
        throw new Error(
          `Cannot reach ${BASE_URL}. Start a local server or set FRONTEND_HEALTH_AUTOSTART=true.`
        )
      }

      console.log(`⚠️ Base URL unavailable: ${BASE_URL}`)
      console.log('🏗️ Building project for preview-based health check...')
      await withBuildArtifactLock(
        'vite-dist-build',
        () => runBunTask('build', { env: AUDIT_ENV }),
        {
          onWait: () => {
            console.log('🔒 Waiting for another build process to release the dist artifact lock...')
          },
        }
      )
      managedServer = new PreviewShellManager({
        env: AUDIT_ENV,
        preferredPort: PREVIEW_PORT,
        candidatePorts: PREVIEW_PORT_CANDIDATES,
        allowRandomPortFallback: !(AUTH_LOGIN && AUTH_PASSWORD),
        serverMode: 'pages',
      })
      await managedServer.start()
      effectiveBaseUrl = managedServer.baseUrl ?? effectiveBaseUrl
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      executablePath: process.env['PUPPETEER_EXECUTABLE_PATH'],
    })

    const healthFilterOptions = {
      baseOrigin: effectiveBaseUrl,
      allowLocalPreviewApiNoise: Boolean(managedServer),
    }

    try {
      const sampleRouteProbePage = await browser.newPage()
      const skippedRouteReasons = new Map<string, string>()
      let resolvedSamplePostRoute = DEFAULT_SAMPLE_POST_ROUTE
      let resolvedSampleDiscussionRoute = DEFAULT_SAMPLE_DISCUSSION_ROUTE

      try {
        const postResolution = await resolveSampleDetailRoute(
          sampleRouteProbePage,
          effectiveBaseUrl,
          {
            label: 'sample post route',
            requestedRoute: REQUESTED_SAMPLE_POST_ROUTE,
            fallbackRoute: DEFAULT_SAMPLE_POST_ROUTE,
            shellSelector: '.post-detail-page',
            readinessSelectorsAll: ['.post-comments'],
          }
        )
        const discussionResolution = await resolveSampleDetailRoute(
          sampleRouteProbePage,
          effectiveBaseUrl,
          {
            label: 'sample discussion route',
            requestedRoute: REQUESTED_SAMPLE_DISCUSSION_ROUTE,
            fallbackRoute: DEFAULT_SAMPLE_DISCUSSION_ROUTE,
            shellSelector: '.discussion-detail-page',
            readinessSelectorsAll: ['.discussion-comments'],
          }
        )

        if (postResolution.route) {
          resolvedSamplePostRoute = postResolution.route
          if (
            REQUESTED_SAMPLE_POST_ROUTE !== resolvedSamplePostRoute &&
            REQUESTED_SAMPLE_POST_ROUTE !== DEFAULT_SAMPLE_POST_ROUTE
          ) {
            console.warn(
              `⚠️ FRONTEND_HEALTH_SAMPLE_POST_ROUTE 无效，已回退到 ${resolvedSamplePostRoute}`
            )
          }
        } else if (postResolution.skipReason) {
          skippedRouteReasons.set('sample post route', postResolution.skipReason)
          skippedRouteReasons.set('authenticated sample post', postResolution.skipReason)
          console.warn(`⚠️ ${postResolution.skipReason}`)
        }

        if (discussionResolution.route) {
          resolvedSampleDiscussionRoute = discussionResolution.route
          if (
            REQUESTED_SAMPLE_DISCUSSION_ROUTE !== resolvedSampleDiscussionRoute &&
            REQUESTED_SAMPLE_DISCUSSION_ROUTE !== DEFAULT_SAMPLE_DISCUSSION_ROUTE
          ) {
            console.warn(
              `⚠️ FRONTEND_HEALTH_SAMPLE_DISCUSSION_ROUTE 无效，已回退到 ${resolvedSampleDiscussionRoute}`
            )
          }
        } else if (discussionResolution.skipReason) {
          skippedRouteReasons.set('sample discussion route', discussionResolution.skipReason)
          skippedRouteReasons.set(
            'authenticated sample discussion',
            discussionResolution.skipReason
          )
          console.warn(`⚠️ ${discussionResolution.skipReason}`)
        }
      } finally {
        await sampleRouteProbePage.close().catch(() => undefined)
      }

      const guestRoutes = buildGuestRoutes(resolvedSamplePostRoute, resolvedSampleDiscussionRoute)
      const authRoutes = buildAuthRoutes(resolvedSamplePostRoute, resolvedSampleDiscussionRoute)
      const effectiveGuestRoutes = authCredentialsDetected
        ? guestRoutes.filter(
            (route) => !isGuestProtectedRedirectRoute(route) && !isGuestOnlyAuthEntryRoute(route)
          )
        : guestRoutes

      if (authCredentialsDetected) {
        const clearedRateLimitKeys = await clearLocalAuditRateLimitState(AUDIT_ENV)
        if (clearedRateLimitKeys > 0) {
          console.log(`🔐 Cleared ${clearedRateLimitKeys} local audit rate-limit keys`)
        }
        await authenticateViaApi(
          browser,
          effectiveBaseUrl,
          {
            login: AUTH_LOGIN,
            password: AUTH_PASSWORD,
          },
          {
            getPreviewDiagnostics,
            onFailureEvidence: (evidence) => {
              if (!firstBlockingIssue) {
                firstBlockingIssue = evidence
              }
            },
          }
        )
      } else if (AUTH_REQUIRED) {
        throw new Error(
          `Authenticated frontend health is required, but ${authSkipReason ?? 'credentials are unavailable'}. Provide PRIMARY_USERNAME/PRIMARY_PASSWORD for the seeded smoke account. Legacy aliases E2E_AUTH_LOGIN/E2E_AUTH_PASSWORD remain supported.`
        )
      } else {
        console.log(
          `🔐 Skipping authenticated frontend health because ${authSkipReason ?? 'credentials are unavailable'}`
        )
      }

      const routesToScan = authCredentialsDetected
        ? [...effectiveGuestRoutes, ...authRoutes]
        : guestRoutes

      for (const viewport of VIEWPORTS) {
        for (const route of routesToScan) {
          const skipReason = skippedRouteReasons.get(route.name)
          if (skipReason) {
            console.log(`⏭️ Skipping ${route.name} (${route.path}): ${skipReason}`)
            results.push(skipRouteResult(route, viewport.name))
            continue
          }

          let routeIssues: ScanIssue[] = []

          for (let attempt = 0; attempt < (managedServer ? 2 : 1); attempt += 1) {
            const page = await browser.newPage()
            const issues: ScanIssue[] = []
            const consoleErrors = new Set<string>()
            const requestFailures = new Set<string>()
            const badResponses = new Set<string>()

            await page.setViewport(viewport.value)
            attachPageDiagnostics(
              page,
              healthFilterOptions,
              consoleErrors,
              requestFailures,
              badResponses
            )

            try {
              const navigateAndAssertRoute = async () => {
                if (route.path === '/login') {
                  await clearBrowserAuditSession(page, effectiveBaseUrl)
                }
                await page.goto(new URL(route.path, effectiveBaseUrl).toString(), {
                  waitUntil: 'domcontentloaded',
                  timeout: 60_000,
                })
                await page.waitForSelector('body', { timeout: 15_000 })
                await assertHealthRouteContract(page, route)
              }

              try {
                await navigateAndAssertRoute()
              } catch (error) {
                const currentPath =
                  route.mode === 'auth'
                    ? await page.evaluate(() => window.location.pathname).catch(() => null)
                    : null

                if (route.mode !== 'auth' || currentPath !== '/login' || !authCredentialsDetected) {
                  throw error
                }

                console.warn(
                  `⚠️ Auth session drift while scanning ${route.path}; re-authenticating once and retrying...`
                )
                await authenticateViaApi(
                  browser,
                  effectiveBaseUrl,
                  {
                    login: AUTH_LOGIN,
                    password: AUTH_PASSWORD,
                  },
                  {
                    getPreviewDiagnostics,
                    onFailureEvidence: (evidence) => {
                      if (!firstBlockingIssue) {
                        firstBlockingIssue = evidence
                      }
                    },
                  }
                )
                await navigateAndAssertRoute()
              }
              await page.waitForNetworkIdle({ idleTime: 800, timeout: 15_000 }).catch(() => {})
              await sleep(900)

              const probe = await probeRuntime(page)
              issues.push(...collectProbeIssues(probe))

              const filteredIssues = filterGuestProtectedRedirectNoise(
                route,
                Boolean(managedServer),
                [...consoleErrors],
                [...requestFailures],
                [...badResponses]
              )

              if (filteredIssues.consoleIssueDetails.length > 0) {
                const blockingHttpErrors = filteredIssues.consoleIssueDetails
                  .filter((entry) => entry.startsWith('blocking-http-error::'))
                  .map((entry) => entry.replace('blocking-http-error::', ''))
                const runtimeConsoleErrors = filteredIssues.consoleIssueDetails
                  .filter((entry) => entry.startsWith('console-error::'))
                  .map((entry) => entry.replace('console-error::', ''))

                if (blockingHttpErrors.length > 0) {
                  issues.push({
                    type: 'blocking-http-error',
                    message: `资源加载失败 ${blockingHttpErrors.length} 条`,
                    details: sample(blockingHttpErrors),
                  })
                }

                if (runtimeConsoleErrors.length > 0) {
                  issues.push({
                    type: 'console-error',
                    message: `控制台运行时错误 ${runtimeConsoleErrors.length} 条`,
                    details: sample(runtimeConsoleErrors),
                  })
                }
              }

              if (filteredIssues.requestFailures.length > 0) {
                issues.push({
                  type: 'blocking-http-error',
                  message: `请求失败 ${filteredIssues.requestFailures.length} 条`,
                  details: sample(filteredIssues.requestFailures),
                })
              }

              if (filteredIssues.badResponses.length > 0) {
                issues.push({
                  type: 'blocking-http-error',
                  message: `HTTP 4xx/5xx ${filteredIssues.badResponses.length} 条`,
                  details: sample(filteredIssues.badResponses),
                })
              }

              routeIssues = issues
              if (!firstBlockingIssue && routeIssues.length > 0) {
                firstBlockingIssue = await captureFailureEvidence(
                  page,
                  ARTIFACT_DIR,
                  route.path,
                  viewport.name,
                  routeIssues[0],
                  getPreviewDiagnostics,
                  {
                    consoleMessages: [...consoleErrors],
                    requestFailures: [...requestFailures],
                    badResponses: [...badResponses],
                  }
                )
              }
              await page.close()
              break
            } catch (error) {
              const recoverable =
                attempt === 0 && (await shouldRecoverManagedPreview(page, managedServer))

              if (recoverable) {
                console.warn(
                  `⚠️ Preview shell became unhealthy while scanning ${route.path}; restarting once and retrying...`
                )
                await page.close().catch(() => undefined)
                await managedServer?.restart()
                continue
              }

              crashed = true
              issues.push({
                type: 'route-crash',
                message: `页面加载失败: ${(error as Error).message}`,
              })
              routeIssues = issues
              if (!firstBlockingIssue && routeIssues.length > 0) {
                firstBlockingIssue = await captureFailureEvidence(
                  page,
                  ARTIFACT_DIR,
                  route.path,
                  viewport.name,
                  routeIssues[0],
                  getPreviewDiagnostics,
                  {
                    consoleMessages: [...consoleErrors],
                    requestFailures: [...requestFailures],
                    badResponses: [...badResponses],
                  }
                )
              }
              await page.close().catch(() => undefined)
              break
            }
          }

          results.push({
            route: route.path,
            name: route.name,
            viewport: viewport.name,
            issues: routeIssues,
          })
        }
      }
    } finally {
      await browser.close()
    }

    const issueCount = results.reduce((sum, item) => sum + item.issues.length, 0)
    const summary: FrontendHealthSummary = {
      artifactDir: ARTIFACT_DIR,
      baseUrl: effectiveBaseUrl,
      authRequired: AUTH_REQUIRED,
      authLoginPresent: Boolean(AUTH_LOGIN),
      authPasswordPresent: Boolean(AUTH_PASSWORD),
      authCredentialsDetected,
      authHealthExecuted: authCredentialsDetected,
      authHealthSkipReason: authCredentialsDetected ? null : authSkipReason,
      scannedRouteViewportCount: results.length,
      issueCount,
      crashed,
      firstBlockingIssue,
      results,
    }

    await writeHealthArtifacts(summary)

    console.log('\n=== Frontend Health Report ===')
    console.log(`Base URL: ${effectiveBaseUrl}`)
    console.log(`Scanned: ${results.length} route-viewport combinations`)
    console.log(`Issues: ${issueCount}`)
    console.log(`Artifacts: ${ARTIFACT_DIR}\n`)

    for (const result of results) {
      if (result.issues.length === 0) continue
      console.log(`[${result.viewport}] ${result.name} (${result.route})`)
      for (const issue of result.issues) {
        console.log(`- ${issue.type}: ${issue.message}`)
        if (issue.details?.length) {
          for (const detail of issue.details) {
            console.log(`  • ${detail}`)
          }
        }
      }
      console.log('')
    }

    if (issueCount > 0 || crashed) {
      process.exitCode = 1
      return
    }

    console.log('No issues found.')
  } catch (error) {
    crashed = true
    const issueCount = results.reduce((sum, item) => sum + item.issues.length, 0)
    await writeHealthArtifacts({
      artifactDir: ARTIFACT_DIR,
      baseUrl: effectiveBaseUrl,
      authRequired: AUTH_REQUIRED,
      authLoginPresent: Boolean(AUTH_LOGIN),
      authPasswordPresent: Boolean(AUTH_PASSWORD),
      authCredentialsDetected,
      authHealthExecuted: false,
      authHealthSkipReason: authSkipReason,
      scannedRouteViewportCount: results.length,
      issueCount,
      crashed,
      firstBlockingIssue,
      results,
    }).catch(() => undefined)
    throw error
  } finally {
    if (managedServer) {
      await managedServer.stop()
    }
  }
}

main().catch((error) => {
  console.error('Frontend health check crashed:', error)
  process.exitCode = 1
})
