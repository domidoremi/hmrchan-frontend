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
import {
  DEFAULT_SAMPLE_DISCUSSION_ROUTE,
  DEFAULT_SAMPLE_POST_ROUTE,
  getSmokeRouteMatrix,
} from './lib/release-route-contract.js'
import {
  buildAuthBootstrapProbeSummary,
  extractAuthBootstrapError,
  findFatalAuthBootstrapProbe,
  findLocalAuditEnvironmentBlockedProbe,
  formatFatalAuthBootstrapProbe,
  formatLocalAuditEnvironmentBlockedProbe,
  probeAuthBootstrapEndpoints,
} from './lib/auth-bootstrap.js'
import { ensureDetailRouteReadiness, resolveSampleDetailRoute } from './lib/detail-route-utils.js'
import {
  ensureLocalAuditSmokeAccount,
  shouldEnsureLocalAuditSmokeAccount,
} from './lib/local-audit-smoke-account.js'
import { stripTrailingSlash } from './lib/url.js'

applyLocalAuditEnvToProcess()

type SmokeMode = 'guest' | 'auth' | 'both'
type CheckKind = 'static' | 'browser' | 'auth' | 'service-worker'
type CheckStatus = 'passed' | 'failed' | 'skipped'
type SmokeFailureKind =
  | 'environment-blocked'
  | 'auth-contract-failed'
  | 'ui-timeout'
  | 'browser-crash'

type StaticRouteCheck = {
  name: string
  path: string
  expected: {
    title: string
    canonicalPath: string
    robots?: string
  }
}

type RouteCheck = {
  name: string
  path: string
  selector: string
  mode: Extract<SmokeMode, 'guest' | 'auth'>
  securityLevel?: 'authenticated' | 'sensitive'
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

type SmokeSummary = {
  artifactDir: string
  baseUrl: string | null
  authLoginPresent: boolean
  authPasswordPresent: boolean
  authCredentialsDetected: boolean
  authSmokeExecuted: boolean
  authSmokeSkipReason: string | null
  lastStage: string | null
  lastFailedCheck: string | null
  failureKind: SmokeFailureKind | null
  lastFailureEvidence: FailureEvidence | null
  checks: CheckRecord[]
}

type AuthBootstrapProbe = {
  path: string
  method: string
  status: number
  ok?: boolean
  code: string | null
  message: string | null
  body?: unknown
}

type AuthBootstrapClientCredentials = {
  clientToken: string
  clientSecret: string
}

function asJsonRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null
}

function extractAuthBootstrapClientCredentials(
  payload: unknown
): AuthBootstrapClientCredentials | null {
  const envelope = asJsonRecord(asJsonRecord(payload)?.data) ?? asJsonRecord(payload)
  if (!envelope) {
    return null
  }

  const clientToken =
    typeof envelope.client_token === 'string' && envelope.client_token.trim()
      ? envelope.client_token.trim()
      : null
  const clientSecret =
    typeof envelope.client_secret === 'string' && envelope.client_secret.trim()
      ? envelope.client_secret.trim()
      : null

  return clientToken && clientSecret ? { clientToken, clientSecret } : null
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
  VITE_LOCAL_AUDIT_PERSIST_AUTH_SESSION: AUDIT_ENV_HAS_AUTH
    ? 'true'
    : (BASE_AUDIT_ENV['VITE_LOCAL_AUDIT_PERSIST_AUTH_SESSION'] ?? 'false'),
  VITE_ENABLE_CLIENT_INIT: AUDIT_ENV_HAS_AUTH
    ? 'true'
    : (BASE_AUDIT_ENV['VITE_ENABLE_CLIENT_INIT'] ?? 'false'),
  VITE_ENABLE_DATA_PREFETCH: BASE_AUDIT_ENV['VITE_ENABLE_DATA_PREFETCH'] ?? 'false',
  VITE_DISABLE_PREVIEW_PROXY: AUDIT_ENV_HAS_AUTH
    ? 'false'
    : (BASE_AUDIT_ENV['VITE_DISABLE_PREVIEW_PROXY'] ?? 'true'),
}
const AUTH_BOOTSTRAP_CONTRACT_VERSION =
  AUDIT_ENV['VITE_CLIENT_CONTRACT_VERSION']?.trim() ||
  process.env['VITE_CLIENT_CONTRACT_VERSION']?.trim() ||
  ''
const E2E_HARD_TIMEOUT_MS = Number.parseInt(process.env['E2E_HARD_TIMEOUT_MS'] ?? '', 10) || 720_000
const STATIC_PRERENDER_CANONICAL_ORIGIN = 'https://momichan.com'
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
      title: 'MomiChan',
      canonicalPath: '/',
      robots: 'index, follow',
    },
  },
  {
    name: 'explore prerender',
    path: '/explore',
    expected: {
      title: 'Explore · MomiChan',
      canonicalPath: '/explore',
      robots: 'index, follow',
    },
  },
  {
    name: '404 prerender',
    path: '/404/',
    expected: {
      title: 'Page not found · MomiChan',
      canonicalPath: '/404',
      robots: 'noindex, nofollow',
    },
  },
]

function isLocalAuditOrigin(baseUrl: string): boolean {
  try {
    const hostname = new URL(baseUrl).hostname
    return hostname === '127.0.0.1' || hostname === 'localhost'
  } catch {
    return false
  }
}

function createHtmlNavigationHeaders(): Headers {
  return new Headers({
    Accept: 'text/html,application/xhtml+xml',
  })
}

function resolveExpectedCanonical(baseUrl: string, canonicalPath: string): string {
  return new URL(canonicalPath, baseUrl).toString()
}

function resolveAllowedStaticCanonicalUrls(baseUrl: string, canonicalPath: string): Set<string> {
  const allowed = new Set([resolveExpectedCanonical(baseUrl, canonicalPath)])

  if (isLocalAuditOrigin(baseUrl)) {
    allowed.add(resolveExpectedCanonical(STATIC_PRERENDER_CANONICAL_ORIGIN, canonicalPath))
  }

  return allowed
}

async function detectStaticPrerenderMismatch(
  baseUrl: string,
  probe: StaticRouteCheck
): Promise<string | null> {
  try {
    const response = await fetch(`${baseUrl}${probe.path}`, {
      headers: createHtmlNavigationHeaders(),
    })
    const html = await response.text()

    const expectedStatus = probe.path === '/404/' ? 404 : 200
    if (response.status !== expectedStatus || !html.includes('data-prerender-shell="true"')) {
      return `External base URL ${baseUrl} does not expose prerender shell HTML for ${probe.path}`
    }

    const title = html.match(/<title>(.*?)<\/title>/i)?.[1]?.trim() ?? ''
    const canonical = html.match(/<link rel="canonical" href="(.*?)"/i)?.[1]?.trim() ?? ''
    const expectedCanonical = resolveExpectedCanonical(baseUrl, probe.expected.canonicalPath)

    if (title === probe.expected.title && canonical === expectedCanonical) {
      return null
    }

    return `External base URL ${baseUrl} returned a different prerender shell for ${probe.path} (title: ${title || 'unknown'}, canonical: ${canonical || 'unknown'})`
  } catch (error) {
    return `Unable to probe prerender HTML for ${probe.path}: ${formatError(error)}`
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

async function readAuthBootstrapPageProbe(
  response: puppeteer.HTTPResponse | null
): Promise<AuthBootstrapProbe | null> {
  if (!response) return null
  const pathname = new URL(response.url()).pathname
  if (
    pathname !== '/api/v1/client/init' &&
    pathname !== '/api/v1/auth/session:resolve' &&
    pathname !== '/api/v1/auth/login'
  ) {
    return null
  }

  const rawBody = await response.text().catch(() => '')
  let parsedBody: unknown = null
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : null
  } catch {
    parsedBody = null
  }

  const errorMeta = extractAuthBootstrapError(parsedBody, rawBody)

  return {
    path: pathname,
    method: response.request().method(),
    status: response.status(),
    code: errorMeta.code,
    message: errorMeta.message ?? (rawBody.trim().length > 0 ? rawBody.trim() : null),
    body: parsedBody,
  }
}

async function runAuthBootstrapPreflight(
  baseUrl: string,
  clientCredentials?: AuthBootstrapClientCredentials | null
): Promise<AuthBootstrapProbe[]> {
  return probeAuthBootstrapEndpoints(baseUrl, {
    contractVersion: AUTH_BOOTSTRAP_CONTRACT_VERSION,
    clientCredentials: clientCredentials ?? undefined,
  }) as Promise<AuthBootstrapProbe[]>
}

function throwIfFatalAuthBootstrapProbe(probes: AuthBootstrapProbe[]): void {
  const localEnvironmentProbe = findLocalAuditEnvironmentBlockedProbe(probes)
  if (localEnvironmentProbe) {
    const summaries = probes.map((probe) => buildAuthBootstrapProbeSummary(probe)).join(' | ')
    throw new Error(
      `${formatLocalAuditEnvironmentBlockedProbe(localEnvironmentProbe)} Probes: ${summaries}`
    )
  }

  const fatalProbe = findFatalAuthBootstrapProbe(probes)
  if (!fatalProbe) return
  const summaries = probes.map((probe) => buildAuthBootstrapProbeSummary(probe)).join(' | ')
  throw new Error(`${formatFatalAuthBootstrapProbe(fatalProbe)} Probes: ${summaries}`)
}

function logPreviewDiagnostics(
  diagnostics: string[] | null | undefined,
  label = 'preview diagnostics'
): void {
  if (!diagnostics || diagnostics.length === 0) {
    return
  }

  console.log(`🧾 ${label}:`)
  for (const line of diagnostics) {
    console.log(`   • ${line}`)
  }
}

function classifySmokeFailure(
  error: unknown,
  evidence: FailureEvidence | null,
  extraDiagnostics: string[] = []
): SmokeFailureKind {
  const errorText = formatError(error)
  const diagnostics = [
    errorText,
    ...extraDiagnostics,
    ...(evidence?.previewDiagnostics ?? []),
    ...(evidence?.consoleMessages ?? []),
    ...(evidence?.requestFailures ?? []),
    ...(evidence?.badResponses ?? []),
  ].join('\n')

  if (
    /UPSTREAM_TIMEOUT|UPSTREAM_UNREACHABLE|Local audit environment blocked|Local API bridge unavailable|Docker\/local backend|ConnectionRefused|Unable to connect\. Is the computer able to access the url\?|net::ERR_ABORTED/i.test(
      diagnostics
    )
  ) {
    return 'environment-blocked'
  }

  if (
    /passkeys\/login\/options|client init|session resolve|Google start|contract mismatch|SIGNATURE_VERIFIER_UNAVAILABLE/i.test(
      diagnostics
    )
  ) {
    return 'auth-contract-failed'
  }

  if (
    /chrome-error:\/\/|Target closed|browser has disconnected|Protocol error/i.test(diagnostics)
  ) {
    return 'browser-crash'
  }

  return 'ui-timeout'
}

function appendCheck(summary: SmokeSummary, check: CheckRecord): void {
  summary.checks.push(check)
}

async function capturePageFailureEvidence(
  page: Page,
  artifactDir: string,
  metadata: Pick<CheckRecord, 'name' | 'path'>,
  getPreviewDiagnostics?: (() => string[] | null) | null,
  runtimeDiagnostics?: {
    consoleMessages?: string[]
    requestFailures?: string[]
    badResponses?: string[]
  }
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
    consoleMessages: runtimeDiagnostics?.consoleMessages?.slice(-20) ?? null,
    requestFailures: runtimeDiagnostics?.requestFailures?.slice(-20) ?? null,
    badResponses: runtimeDiagnostics?.badResponses?.slice(-20) ?? null,
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

function isGuestOnlyAuthEntryCheck(check: Pick<RouteCheck, 'mode' | 'path'>): boolean {
  return (
    check.mode === 'guest' &&
    (check.path === '/login' || check.path === '/register' || check.path === '/forgot-password')
  )
}

function isSensitiveRouteCheck(check: Pick<RouteCheck, 'securityLevel'>): boolean {
  return check.securityLevel === 'sensitive'
}

function toRouteCheck(check: {
  name: string
  path: string
  shellSelector?: string
  mode: 'guest' | 'auth'
  securityLevel?: 'authenticated' | 'sensitive'
  expectedPath?: string
  expectedCanonicalPath?: string
  readinessSelectorsAll?: string[]
  readinessSelectorsAny?: string[]
}): RouteCheck {
  return {
    name: check.name,
    path: check.path,
    selector: check.shellSelector ?? 'body',
    mode: check.mode,
    securityLevel: check.securityLevel,
    expectedPath: check.expectedPath,
    expectedCanonicalPath: check.expectedCanonicalPath,
    readinessSelectorsAll: check.readinessSelectorsAll,
    readinessSelectorsAny: check.readinessSelectorsAny,
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
        window.localStorage.setItem('hmr.qa.skipPreloader', 'true')

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
        `${context}: login route left /login before auth shell rendered; current path ${state.pathname ?? 'unknown'} (${state.url}, title: ${state.title ?? 'unknown'})`
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

async function runLocalAuditTrustPrewarm(page: Page, baseUrl: string): Promise<boolean> {
  await clearBrowserAuditSession(page, baseUrl)
  await page.goto(`${baseUrl}/`, {
    waitUntil: 'domcontentloaded',
    timeout: 15_000,
  })

  const result = await page.evaluate(async () => {
    const credentialStorageKey = 'momi_client_security'
    const fingerprintStorageKey = 'momi_device_fingerprint_v1'
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 10_000)

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

    try {
      const response = await fetch('/api/v1/client/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
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
    } catch {
      return false
    } finally {
      window.clearTimeout(timeoutId)
    }
  })

  if (!result) {
    if (AUDIT_ENV.LOCAL_AUDIT_DEBUG_CLIENT_TRUST === 'true') {
      console.log('   • Debug: prewarm client/init did not return ok')
    }
    return false
  }

  const trustedVisitorCount = await grantLocalAuditClientTrust(AUDIT_ENV)
  if (trustedVisitorCount <= 0) {
    if (AUDIT_ENV.LOCAL_AUDIT_DEBUG_CLIENT_TRUST === 'true') {
      console.log('   • Debug: prewarm client trust grant found no visitor keys')
    }
    return false
  }

  const trustedTurnstileCount = await grantLocalAuditTurnstileTrust(
    AUDIT_ENV,
    await collectBrowserTrustHeaders(page)
  )

  console.log(`   • Prewarmed local audit client trust for ${trustedVisitorCount} visitor key(s)`)
  if (trustedTurnstileCount > 0) {
    console.log(`   • Prewarmed local audit Turnstile trust for ${trustedTurnstileCount} key(s)`)
  }

  if (AUDIT_ENV.LOCAL_AUDIT_DEBUG_CLIENT_TRUST === 'true') {
    console.log('   • Debug: prewarm local audit trust complete')
  }

  return true
}

async function prewarmLocalAuditTrust(page: Page, baseUrl: string): Promise<boolean> {
  if (!isLocalAuditOrigin(baseUrl)) {
    return false
  }

  if (AUDIT_ENV.LOCAL_AUDIT_DEBUG_CLIENT_TRUST === 'true') {
    console.log('   • Debug: prewarm local audit trust start')
  }

  try {
    return await withTimeout(
      runLocalAuditTrustPrewarm(page, baseUrl),
      20_000,
      'local audit prewarm'
    )
  } catch (error) {
    if (AUDIT_ENV.LOCAL_AUDIT_DEBUG_CLIENT_TRUST === 'true') {
      console.log('   • Debug: prewarm local audit trust timed out or failed', error)
    }
    return false
  }
}

async function withPageFailureEvidence(
  browser: puppeteer.Browser | null,
  artifactDir: string,
  metadata: Pick<CheckRecord, 'name' | 'path'>,
  onFailure: (evidence: FailureEvidence) => void,
  run: (page: Page) => Promise<void>,
  getPreviewDiagnostics?: (() => string[] | null) | null,
  timeout = 20_000,
  existingPage?: Page | null,
  keepCreatedPageOpen = false
): Promise<void> {
  const page = existingPage ?? (await browser!.newPage())
  let completed = false
  page.setDefaultTimeout(timeout)
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
    await run(page)
    completed = true
  } catch (error) {
    onFailure(
      await capturePageFailureEvidence(page, artifactDir, metadata, getPreviewDiagnostics, {
        consoleMessages,
        requestFailures,
        badResponses,
      })
    )
    throw error
  } finally {
    if (!existingPage && !(keepCreatedPageOpen && completed)) {
      await page.close().catch(() => undefined)
    }
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(label + ' timed out after ' + timeoutMs + 'ms')),
          timeoutMs
        )
      }),
    ])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
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
    summary.failureKind = classifySmokeFailure(error, summary.lastFailureEvidence)
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
    canonicalPath: string
    robots?: string
  }
): Promise<void> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: createHtmlNavigationHeaders(),
  })
  const html = await response.text()
  const expectedStatus = path === '/404/' ? 404 : 200

  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected prerendered route ${path} to return ${expectedStatus}, got ${response.status}`
    )
  }

  if (!html.includes(`<title>${expected.title}</title>`)) {
    throw new Error(`Expected ${path} HTML to contain title ${expected.title}`)
  }

  const canonical = html.match(/<link rel="canonical" href="(.*?)"/i)?.[1]?.trim() ?? ''
  const expectedCanonicals = resolveAllowedStaticCanonicalUrls(baseUrl, expected.canonicalPath)
  if (!canonical || !expectedCanonicals.has(canonical)) {
    throw new Error(
      `Expected ${path} HTML to contain canonical ${Array.from(expectedCanonicals).join(' or ')}, got ${canonical || 'missing'}`
    )
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
      if (check.path === '/login') {
        await clearBrowserAuditSession(page, baseUrl)
      }

      await page.goto(`${baseUrl}${check.path}`, {
        waitUntil: 'domcontentloaded',
      })

      if (check.path === '/login' || check.expectedPath === '/login') {
        await waitForRoutePath(page, check.expectedPath ?? '/login', `${check.name} route`)
        await waitForLoginShellSelector(page, check.selector, `${check.name} route`)
      } else {
        await page.waitForSelector(check.selector)
      }
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
      const expectedCanonical = resolveExpectedCanonical(baseUrl, expectedCanonicalPath)
      if (canonicalHref !== expectedCanonical) {
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
  getPreviewDiagnostics?: (() => string[] | null) | null,
  existingPage?: Page | null
): Promise<Page | null> {
  let authenticatedPage: Page | null = null
  await withPageFailureEvidence(
    browser,
    artifactDir,
    { name: 'auth login bootstrap', path: '/api/v1/auth/login' },
    onFailure,
    async (page) => {
      authenticatedPage = page
      const waitForLoginExit = async (timeout: number): Promise<boolean> => {
        try {
          await page.waitForFunction(
            () =>
              window.location.pathname !== '/login' &&
              !window.location.pathname.startsWith('/login/'),
            { timeout }
          )
          return true
        } catch {
          const currentPath = await page.evaluate(() => window.location.pathname).catch(() => null)
          return Boolean(
            currentPath && currentPath !== '/login' && !currentPath.startsWith('/login/')
          )
        }
      }
      const readLoginState = async () =>
        page
          .evaluate(() => ({
            pathname: window.location.pathname,
            title: document.title,
            hasLoginForm: Boolean(document.querySelector('form.hmr-form')),
            hasRiskForm: Boolean(document.querySelector('#risk-code')),
            hasMfaStep: Boolean(document.querySelector('.auth-2fa-back')),
            errorText:
              document.querySelector('.field-error')?.textContent?.trim() ??
              document.querySelector('.auth-inline-state__copy')?.textContent?.trim() ??
              '',
          }))
          .catch(() => null)
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
      const readClientCredentials = async (): Promise<AuthBootstrapClientCredentials | null> =>
        page.evaluate(() => {
          const raw = window.localStorage.getItem('momi_client_security')
          if (!raw) return null

          try {
            const parsed = JSON.parse(raw) as {
              client_token?: unknown
              client_secret?: unknown
            }
            const clientToken =
              typeof parsed.client_token === 'string' ? parsed.client_token.trim() : ''
            const clientSecret =
              typeof parsed.client_secret === 'string' ? parsed.client_secret.trim() : ''

            return clientToken && clientSecret
              ? {
                  clientToken,
                  clientSecret,
                }
              : null
          } catch {
            return null
          }
        })
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
          console.warn(
            `⚠️ Auth smoke login bootstrap could not force issue client credentials: HTTP ${result.status} ${result.detail ?? ''}`.trim()
          )
          return false
        }

        return true
      }
      const ensureClientCredentials = async () => {
        const hasExistingCredentials = await waitForClientCredentials(10_000)
          .then(() => true)
          .catch(() => false)
        if (hasExistingCredentials) {
          return true
        }

        const issuedCredentials = await forceIssueClientCredentials()
        if (!issuedCredentials) {
          return false
        }

        return waitForClientCredentials(2_000)
          .then(() => true)
          .catch(() => false)
      }
      const submitLoginForm = () =>
        page.evaluate(() => {
          const form = document.querySelector('form.hmr-form')
          if (!(form instanceof HTMLFormElement)) {
            throw new Error('auth login form is missing')
          }
          form.requestSubmit()
        })
      const fillInputValue = async (selector: string, value: string) => {
        await page.waitForSelector(selector, { timeout: 10_000 })
        await page.click(selector, { clickCount: 3 })
        await page.keyboard.press('Backspace')
        await page.type(selector, value)
        await page.evaluate((nextSelector) => {
          const input = document.querySelector(nextSelector)
          if (!(input instanceof HTMLInputElement)) {
            throw new Error(`input not found for selector: ${nextSelector}`)
          }
          input.dispatchEvent(new Event('change', { bubbles: true }))
        }, selector)
      }
      const submitLoginFormAndReadProbe = async (): Promise<AuthBootstrapProbe | null> => {
        const loginResponsePromise = page
          .waitForResponse(
            (response) =>
              response.request().method() === 'POST' &&
              response.url().includes('/api/v1/auth/login'),
            { timeout: 10_000 }
          )
          .catch(() => null)

        await submitLoginForm()
        const loginResponse = await loginResponsePromise
        return readAuthBootstrapPageProbe(loginResponse)
      }

      const loginSelector = 'input[autocomplete="username"]'
      const passwordSelector = 'input[autocomplete="current-password"]'
      let latestLoginRequestHeaders: Record<string, string> | null = null
      let pageClientCredentials: AuthBootstrapClientCredentials | null = null
      const loginRequestIds = new Set<string>()
      const pageAuthBootstrapProbes: AuthBootstrapProbe[] = []
      const pendingAuthBootstrapResponses = new Set<Promise<void>>()
      const normalizeHeaders = (headers: Record<string, unknown> | undefined) =>
        Object.fromEntries(
          Object.entries(headers ?? {}).map(([key, value]) => [key.toLowerCase(), String(value)])
        )
      const flushAuthBootstrapResponses = async () => {
        await Promise.all([...pendingAuthBootstrapResponses])
      }
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
      page.on('response', (response) => {
        const pathname = new URL(response.url()).pathname
        if (
          pathname !== '/api/v1/client/init' &&
          pathname !== '/api/v1/auth/session:resolve' &&
          pathname !== '/api/v1/auth/login'
        ) {
          return
        }

        const tracked = (async () => {
          const probe = await readAuthBootstrapPageProbe(response)
          if (probe) {
            pageAuthBootstrapProbes.push(probe)
            if (probe.path === '/api/v1/client/init') {
              pageClientCredentials =
                extractAuthBootstrapClientCredentials(probe.body) ?? pageClientCredentials
            }
          }
        })()
        void tracked.finally(() => {
          pendingAuthBootstrapResponses.delete(tracked)
        })
        pendingAuthBootstrapResponses.add(tracked)
      })
      const openAndFillLoginForm = async (options?: { resetSession?: boolean }) => {
        if (AUDIT_ENV.LOCAL_AUDIT_DEBUG_CLIENT_TRUST === 'true') {
          console.log('   • Debug: open login form', options ?? null)
        }
        if (options?.resetSession) {
          await clearBrowserAuditSession(page, baseUrl)
        }
        await page.goto(`${baseUrl}/login`, {
          waitUntil: 'domcontentloaded',
        })

        await waitForRoutePath(page, '/login', 'auth smoke login bootstrap')
        await waitForLoginShellSelector(page, 'form.hmr-form', 'auth smoke login bootstrap', 20_000)
        await waitForLoginShellSelector(page, loginSelector, 'auth smoke login bootstrap', 20_000)
        await flushAuthBootstrapResponses()
        throwIfFatalAuthBootstrapProbe(pageAuthBootstrapProbes)
        await fillInputValue(loginSelector, credentials.login)
        await fillInputValue(passwordSelector, credentials.password)
        if (AUDIT_ENV.LOCAL_AUDIT_DEBUG_CLIENT_TRUST === 'true') {
          console.log('   • Debug: login form filled')
        }
      }

      if (AUDIT_ENV.LOCAL_AUDIT_DEBUG_CLIENT_TRUST === 'true') {
        console.log('   • Debug: auth bootstrap start')
      }
      const shouldPrewarmLocalTrust = AUDIT_ENV.LOCAL_AUDIT_PREWARM_CLIENT_TRUST === 'true'
      const prewarmedLocalTrust = shouldPrewarmLocalTrust
        ? await prewarmLocalAuditTrust(page, baseUrl)
        : false
      if (AUDIT_ENV.LOCAL_AUDIT_DEBUG_CLIENT_TRUST === 'true') {
        console.log('   • Debug: prewarm result', prewarmedLocalTrust)
      }
      await openAndFillLoginForm({ resetSession: !prewarmedLocalTrust })
      const preflightProbes = await runAuthBootstrapPreflight(
        baseUrl,
        pageClientCredentials ?? (await readClientCredentials())
      )
      if (AUDIT_ENV.LOCAL_AUDIT_DEBUG_CLIENT_TRUST === 'true') {
        console.log('   • Debug: preflight probes', preflightProbes)
      }
      throwIfFatalAuthBootstrapProbe([...pageAuthBootstrapProbes, ...preflightProbes])

      const submitButton = await page.$('form.hmr-form button[type="submit"], form.hmr-form button')
      if (!submitButton) {
        throw new Error('Auth smoke login submit button is missing')
      }
      const firstLoginProbe = await submitLoginFormAndReadProbe()
      await flushAuthBootstrapResponses()
      if (AUDIT_ENV.LOCAL_AUDIT_DEBUG_CLIENT_TRUST === 'true') {
        console.log('   • First login probe:', firstLoginProbe)
        console.log('   • First login state:', await readLoginState())
      }
      if (firstLoginProbe) {
        throwIfFatalAuthBootstrapProbe([
          ...pageAuthBootstrapProbes,
          ...preflightProbes,
          firstLoginProbe,
        ])
      }

      const loginExited = await waitForLoginExit(5_000)
      if (AUDIT_ENV.LOCAL_AUDIT_DEBUG_CLIENT_TRUST === 'true') {
        console.log('   • Debug: login exited after first submit', loginExited)
      }
      if (!loginExited) {
        const ensuredClientCredentials = await ensureClientCredentials()
        if (AUDIT_ENV.LOCAL_AUDIT_DEBUG_CLIENT_TRUST === 'true') {
          console.log('   • Debug: ensured client credentials', ensuredClientCredentials)
        }
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
        const secondLoginProbe = await submitLoginFormAndReadProbe()
        await flushAuthBootstrapResponses()
        if (AUDIT_ENV.LOCAL_AUDIT_DEBUG_CLIENT_TRUST === 'true') {
          console.log('   • Second login probe:', secondLoginProbe)
          console.log('   • Second login state:', await readLoginState())
        }
        if (secondLoginProbe) {
          throwIfFatalAuthBootstrapProbe([
            ...pageAuthBootstrapProbes,
            ...preflightProbes,
            secondLoginProbe,
          ])
        }
        const loginExitedAfterTrust = await waitForLoginExit(25_000)
        if (AUDIT_ENV.LOCAL_AUDIT_DEBUG_CLIENT_TRUST === 'true') {
          console.log('   • Debug: login exited after trust retry', loginExitedAfterTrust)
        }
        if (!loginExitedAfterTrust) {
          if (AUDIT_ENV.LOCAL_AUDIT_DEBUG_CLIENT_TRUST === 'true') {
            console.log('   • Timed out login state:', await readLoginState())
          }
          throw new Error(
            'Timed out waiting for login redirect to leave /login after trust bootstrap'
          )
        }
      }
      await page.waitForNetworkIdle({ idleTime: 500, timeout: 4_000 }).catch(() => {})
      if (AUDIT_ENV.LOCAL_AUDIT_DEBUG_CLIENT_TRUST === 'true') {
        console.log('   • Post-login state:', await readLoginState())
      }
    },
    getPreviewDiagnostics,
    20_000,
    existingPage,
    !existingPage
  )
  return existingPage ? null : authenticatedPage
}

async function assertAuthenticatedRoute(
  browser: puppeteer.Browser,
  baseUrl: string,
  check: RouteCheck,
  artifactDir: string,
  onFailure: (evidence: FailureEvidence) => void,
  getPreviewDiagnostics?: (() => string[] | null) | null,
  recoverAuthSession?: (() => Promise<void>) | null,
  existingPage?: Page | null
): Promise<void> {
  const verifyAuthenticatedRoute = async (page: Page): Promise<void> => {
    await page.goto(`${baseUrl}${check.path}`, {
      waitUntil: 'domcontentloaded',
    })

    const failIfSessionDrifted = async (context: string) => {
      const state = await readPageRouteState(page)
      if (state.pathname === '/login') {
        throw new Error(
          `${context}: authenticated session drift; expected ${check.path} but browser reached /login (${state.url}, title: ${state.title ?? 'unknown'})`
        )
      }
    }

    await page.waitForSelector('body', { timeout: 15_000 })
    await failIfSessionDrifted(`Authenticated route ${check.name}`)

    await page.waitForSelector(check.selector).catch(async (error) => {
      await failIfSessionDrifted(`Authenticated route ${check.name}`)
      throw error
    })

    const currentPath = await page.evaluate(() => window.location.pathname)
    if (currentPath === '/login') {
      throw new Error(
        `Authenticated route ${check.name}: authenticated session drift; expected ${check.path} but browser reached /login`
      )
    }

    if (check.expectedPath && currentPath !== check.expectedPath) {
      throw new Error(
        `Expected authenticated route ${check.path} to resolve to ${check.expectedPath}, got ${currentPath}`
      )
    }

    await ensureDetailRouteReadiness(page, check)
  }

  await withPageFailureEvidence(
    browser,
    artifactDir,
    { name: check.name, path: check.path },
    onFailure,
    async (page) => {
      try {
        await verifyAuthenticatedRoute(page)
      } catch (error) {
        if (!formatError(error).includes('authenticated session drift') || !recoverAuthSession) {
          throw error
        }

        console.warn(
          `   • Auth session drift while checking ${check.path}; re-authenticating once and retrying`
        )
        await recoverAuthSession()
        await verifyAuthenticatedRoute(page)
      }
    },
    getPreviewDiagnostics,
    20_000,
    existingPage
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
      await page.waitForFunction(() =>
        Boolean(
          document.querySelector('.not-found-page') ||
          document.querySelector('[data-prerender-shell-title="Page not found"]') ||
          document.querySelector('[data-prerender-shell-title="页面未找到"]')
        )
      )
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
      await page.goto(`${baseUrl}/explore`, {
        waitUntil: 'domcontentloaded',
      })
      await page.waitForSelector('.hmr-route-page--explore')
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
  const requestedSamplePostRoute = process.env['E2E_SAMPLE_POST_ROUTE'] ?? DEFAULT_SAMPLE_POST_ROUTE
  const requestedSampleDiscussionRoute =
    process.env['E2E_SAMPLE_DISCUSSION_ROUTE'] ?? DEFAULT_SAMPLE_DISCUSSION_ROUTE
  const authSmokeRequired = process.env['E2E_REQUIRE_AUTH'] !== 'false'
  const authSmokeEnabled = authSmokeRequired && Boolean(authLogin && authPassword)
  const authSkipReason = getAuthSkipReason(authLogin, authPassword, authCredentials.source)
  const summary = createSmokeSummary(artifactDir, authLogin, authPassword)
  summary.authSmokeRequired = authSmokeRequired
  const setStage = (stage: string) => {
    summary.lastStage = stage
  }
  setStage('startup')
  const recordFailureEvidence = (evidence: FailureEvidence) => {
    summary.lastFailureEvidence = evidence
  }

  let previewServer: PreviewShellManager | null = null
  let browser: puppeteer.Browser | null = null
  let runError: unknown = null
  const getPreviewDiagnostics = () => previewServer?.formatDiagnosticsLines() ?? null
  let cleanupRequested = false
  let terminationHandled = false

  const cleanupResources = async () => {
    if (cleanupRequested) return
    cleanupRequested = true

    const activeBrowser = browser
    browser = null
    if (activeBrowser) {
      await withTimeout(
        activeBrowser.close().catch(() => {
          // ignore
        }),
        5_000,
        'browser.close'
      ).catch((cleanupError) => console.warn('⚠️ Browser cleanup timed out:', cleanupError))
    }

    const activePreviewServer = previewServer
    previewServer = null
    if (activePreviewServer) {
      await withTimeout(activePreviewServer.stop(), 10_000, 'previewServer.stop').catch(
        (cleanupError) => console.warn('⚠️ Preview cleanup timed out:', cleanupError)
      )
    }
  }

  const hardTimeoutId = setTimeout(() => {
    if (terminationHandled) return
    terminationHandled = true
    const timeoutError = new Error(
      `Minimal E2E checks timed out after ${E2E_HARD_TIMEOUT_MS}ms at stage ${summary.lastStage ?? 'unknown'}`
    )
    runError = runError ?? timeoutError
    summary.failureKind = summary.failureKind ?? 'ui-timeout'
    summary.lastFailedCheck = summary.lastFailedCheck ?? 'hard timeout'
    appendCheck(summary, {
      name: 'hard timeout',
      kind: 'browser',
      mode: 'both',
      status: 'failed',
      detail: timeoutError.message,
    })

    void writeSmokeArtifacts(summary)
      .catch((artifactError) => {
        console.error('Failed to write smoke artifacts:', artifactError)
      })
      .finally(() =>
        cleanupResources().finally(() => {
          console.error('\n❌ Minimal E2E checks failed:', timeoutError)
          process.exit(1)
        })
      )
  }, E2E_HARD_TIMEOUT_MS)

  const handleTermination = (signal: NodeJS.Signals) => {
    if (terminationHandled) return
    terminationHandled = true
    runError = runError ?? new Error(`Minimal E2E checks interrupted by ${signal}`)
    void cleanupResources().finally(() => {
      console.warn(`⚠️ Minimal E2E checks interrupted by ${signal}`)
      process.exit(1)
    })
  }

  process.once('SIGINT', handleTermination)
  process.once('SIGTERM', handleTermination)

  console.log(`🧾 Auth smoke required: ${authSmokeRequired ? 'yes' : 'no'}`)
  console.log(`🧾 Auth credentials detected: ${authLogin && authPassword ? 'yes' : 'no'}`)
  if (authSkipReason) {
    console.log(`🧾 Auth smoke skip reason (if applicable): ${authSkipReason}`)
  }

  try {
    let baseUrl: string

    if (externalBaseUrl) {
      setStage('resolve external base URL')
      baseUrl = stripTrailingSlash(externalBaseUrl)
      console.log(`🌐 Using existing E2E base URL: ${baseUrl}`)
    } else {
      setStage('build production bundle')
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
      setStage('start preview server')
      previewServer = new PreviewShellManager({
        env: AUDIT_ENV,
        candidatePorts: PREVIEW_PORT_CANDIDATES,
        allowRandomPortFallback: !hasAuthSmokeCredentials(AUDIT_ENV),
        serverMode: 'pages',
      })
      await previewServer.start()
      baseUrl = previewServer.baseUrl ?? ''
    }

    summary.baseUrl = baseUrl
    await mkdir(artifactDir, { recursive: true })

    setStage('ensure local audit smoke account')
    if (
      shouldEnsureLocalAuditSmokeAccount(baseUrl, {
        login: authLogin,
        password: authPassword,
      })
    ) {
      const ensuredAccount = ensureLocalAuditSmokeAccount(AUDIT_ENV, baseUrl, {
        login: authLogin,
        password: authPassword,
      })
      if (ensuredAccount.ensured) {
        console.log(
          `🔐 Ensured local audit smoke account ${ensuredAccount.username} (${ensuredAccount.email})`
        )
      } else if (ensuredAccount.skipped) {
        console.warn(`⚠️ Skipped local audit smoke account ensure: ${ensuredAccount.reason}`)
      }
    }

    setStage('detect static prerender mismatch')
    const externalLocalPrerenderMismatch =
      externalBaseUrl && isLocalAuditOrigin(baseUrl)
        ? await detectStaticPrerenderMismatch(baseUrl, STATIC_ROUTE_CHECKS[1]!)
        : null

    setStage('auth bootstrap preflight')
    const authBootstrapProbes = await runAuthBootstrapPreflight(baseUrl)
    try {
      throwIfFatalAuthBootstrapProbe(authBootstrapProbes)
    } catch (error) {
      if (!authSmokeRequired) {
        console.warn(
          `⚠️ Auth bootstrap preflight degraded in guest-only smoke; continuing public route checks. ${formatError(error)}`
        )
      } else {
        logPreviewDiagnostics(getPreviewDiagnostics(), 'auth bootstrap preview diagnostics')
        throw error
      }
    }

    if (authSmokeRequired) {
      logPreviewDiagnostics(getPreviewDiagnostics(), 'auth bootstrap preview diagnostics')
    }

    setStage('static prerender checks')
    console.log('🧱 Verifying static prerendered HTML...')
    if (externalLocalPrerenderMismatch) {
      const reason = `${externalLocalPrerenderMismatch}; skipping static prerender assertions for this external local harness`
      markChecksSkipped(
        summary,
        STATIC_ROUTE_CHECKS.map((check) => ({
          name: check.name,
          kind: 'static' as const,
          mode: 'guest' as const,
          path: check.path,
        })),
        reason
      )
      console.log(`   • ${reason}`)
    } else {
      for (const check of STATIC_ROUTE_CHECKS) {
        setStage(`static prerender check: ${check.name}`)
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
    }

    setStage('launch headless browser')
    console.log('🌐 Launching headless browser...')
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    console.log('🌐 Headless browser ready')

    const sampleRouteProbePage = await browser.newPage()
    const skippedSampleChecks: RouteCheck[] = []
    let resolvedSamplePostRoute = DEFAULT_SAMPLE_POST_ROUTE
    let resolvedSampleDiscussionRoute = DEFAULT_SAMPLE_DISCUSSION_ROUTE
    let samplePostSkipReason = 'sample post route unavailable'
    let sampleDiscussionSkipReason = 'sample discussion route unavailable'

    try {
      setStage('resolve sample post route')
      const postResolution = await resolveSampleDetailRoute(sampleRouteProbePage, baseUrl, {
        label: 'sample post route',
        requestedRoute: requestedSamplePostRoute,
        fallbackRoute: DEFAULT_SAMPLE_POST_ROUTE,
        discoveryPath: '/explore',
        detailKind: 'post',
        shellSelector: '.hmr-detail--reader',
        readinessSelectorsAll: ['.hmr-detail-reader-hero'],
        readinessSelectorsAny: ['.hmr-detail-comment-list'],
        dataDependent: true,
      })
      setStage('resolve sample discussion route')
      const discussionResolution = await resolveSampleDetailRoute(sampleRouteProbePage, baseUrl, {
        label: 'sample discussion route',
        requestedRoute: requestedSampleDiscussionRoute,
        fallbackRoute: DEFAULT_SAMPLE_DISCUSSION_ROUTE,
        discoveryPath: '/community',
        detailKind: 'discussion',
        shellSelector: '.discussion-detail-page',
        readinessSelectorsAll: ['.discussion-comments'],
        dataDependent: true,
      })

      if (postResolution.route) {
        resolvedSamplePostRoute = postResolution.route
        if (
          requestedSamplePostRoute !== resolvedSamplePostRoute &&
          requestedSamplePostRoute !== DEFAULT_SAMPLE_POST_ROUTE
        ) {
          console.warn(`⚠️ E2E_SAMPLE_POST_ROUTE 无效，已回退到 ${resolvedSamplePostRoute}`)
        }
      } else if (postResolution.skipReason) {
        samplePostSkipReason = postResolution.skipReason
        console.warn(`⚠️ ${postResolution.skipReason}`)
        skippedSampleChecks.push(
          {
            name: 'sample post route',
            path: resolvedSamplePostRoute,
            selector: '.hmr-detail--reader',
            mode: 'guest',
          },
          {
            name: 'authenticated sample post',
            path: resolvedSamplePostRoute,
            selector: '.hmr-detail--reader',
            mode: 'auth',
          }
        )
      }

      if (discussionResolution.route) {
        resolvedSampleDiscussionRoute = discussionResolution.route
        if (
          requestedSampleDiscussionRoute !== resolvedSampleDiscussionRoute &&
          requestedSampleDiscussionRoute !== DEFAULT_SAMPLE_DISCUSSION_ROUTE
        ) {
          console.warn(
            `⚠️ E2E_SAMPLE_DISCUSSION_ROUTE 无效，已回退到 ${resolvedSampleDiscussionRoute}`
          )
        }
      } else if (discussionResolution.skipReason) {
        sampleDiscussionSkipReason = discussionResolution.skipReason
        console.warn(`⚠️ ${discussionResolution.skipReason}`)
        skippedSampleChecks.push(
          {
            name: 'sample discussion route',
            path: resolvedSampleDiscussionRoute,
            selector: '.discussion-detail-page',
            mode: 'guest',
          },
          {
            name: 'authenticated sample discussion',
            path: resolvedSampleDiscussionRoute,
            selector: '.discussion-detail-page',
            mode: 'auth',
          }
        )
      }
    } finally {
      await sampleRouteProbePage.close().catch(() => undefined)
    }

    const routeMatrix = getSmokeRouteMatrix({
      samplePostRoute: resolvedSamplePostRoute,
      sampleDiscussionRoute: resolvedSampleDiscussionRoute,
    })
    const guestBrowserChecks: RouteCheck[] = routeMatrix.guest.map(toRouteCheck)
    const skippedGuestProtectedRedirectChecks = authSmokeEnabled
      ? guestBrowserChecks.filter(isGuestProtectedRedirectCheck)
      : []
    const skippedGuestOnlyAuthEntryChecks = authSmokeEnabled
      ? guestBrowserChecks.filter(isGuestOnlyAuthEntryCheck)
      : []
    const effectiveGuestBrowserChecks = authSmokeEnabled
      ? guestBrowserChecks.filter(
          (check) => !isGuestProtectedRedirectCheck(check) && !isGuestOnlyAuthEntryCheck(check)
        )
      : guestBrowserChecks
    const authenticatedRouteChecks: RouteCheck[] = routeMatrix.auth.map(toRouteCheck)
    const filteredGuestBrowserChecks = effectiveGuestBrowserChecks.filter(
      (check) => !skippedSampleChecks.some((skipped) => skipped.name === check.name)
    )

    setStage('guest browser route checks')
    console.log('🧭 Verifying guest browser routes...')
    const skippedAuthenticatedAuditGuestChecks = [
      ...skippedGuestProtectedRedirectChecks,
      ...skippedGuestOnlyAuthEntryChecks,
    ]
    if (skippedAuthenticatedAuditGuestChecks.length > 0) {
      const reason =
        'Skipped during authenticated local audit; auth entry and protected route access are verified by authenticated smoke routes.'
      markChecksSkipped(summary, skippedAuthenticatedAuditGuestChecks, reason)
      console.log(
        `   • Skipping ${skippedAuthenticatedAuditGuestChecks.length} guest auth-entry/protected redirect checks in authenticated local audit`
      )
    }
    if (skippedSampleChecks.some((check) => check.mode === 'guest')) {
      markChecksSkipped(
        summary,
        skippedSampleChecks.filter((check) => check.mode === 'guest'),
        skippedSampleChecks
          .filter((check) => check.mode === 'guest')
          .map((check) =>
            check.name === 'sample post route' ? samplePostSkipReason : sampleDiscussionSkipReason
          )
          .join('; ')
      )
    }

    for (const check of filteredGuestBrowserChecks) {
      setStage(`guest browser route: ${check.name}`)
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
      setStage('authenticated smoke routes')
      console.log('🔐 Verifying authenticated smoke routes...')
      summary.authSmokeExecuted = true
      const clearedRateLimitKeys = await clearLocalAuditRateLimitState(AUDIT_ENV)
      if (clearedRateLimitKeys > 0) {
        console.log(`   • Cleared ${clearedRateLimitKeys} local audit rate-limit keys`)
      }
      let authenticatedSmokePage: Page | null = null
      await recordCheck(
        summary,
        {
          name: 'auth login bootstrap',
          kind: 'auth',
          mode: 'auth',
          path: '/api/v1/auth/login',
        },
        async () => {
          setStage('auth login bootstrap')
          authenticatedSmokePage = await authenticateViaApi(
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
        }
      )

      const effectiveAuthenticatedRouteChecks = authenticatedRouteChecks.filter(
        (check) =>
          !skippedSampleChecks.some((skipped) => skipped.name === check.name) &&
          !(isLocalAuditOrigin(baseUrl) && isSensitiveRouteCheck(check))
      )
      const skippedSensitiveLocalAuditChecks = authenticatedRouteChecks.filter(
        (check) =>
          !skippedSampleChecks.some((skipped) => skipped.name === check.name) &&
          isLocalAuditOrigin(baseUrl) &&
          isSensitiveRouteCheck(check)
      )
      if (skippedSampleChecks.some((check) => check.mode === 'auth')) {
        markChecksSkipped(
          summary,
          skippedSampleChecks.filter((check) => check.mode === 'auth'),
          skippedSampleChecks
            .filter((check) => check.mode === 'auth')
            .map((check) =>
              check.name === 'authenticated sample post'
                ? samplePostSkipReason
                : sampleDiscussionSkipReason
            )
            .join('; ')
        )
      }
      if (skippedSensitiveLocalAuditChecks.length > 0) {
        const reason =
          'Skipped during local audit: sensitive routes require explicit re-authentication when runtime integrity is degraded; production regression covers sensitive route access.'
        markChecksSkipped(summary, skippedSensitiveLocalAuditChecks, reason)
        console.log(
          `   • Skipping ${skippedSensitiveLocalAuditChecks.length} sensitive auth route(s) in local audit`
        )
      }

      try {
        for (const check of effectiveAuthenticatedRouteChecks) {
          setStage(`authenticated route: ${check.name}`)
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
                getPreviewDiagnostics,
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
                    getPreviewDiagnostics,
                    authenticatedSmokePage
                  ).then(() => undefined),
                authenticatedSmokePage
              )
          )
        }
      } finally {
        await authenticatedSmokePage?.close().catch(() => undefined)
      }
    } else {
      setStage('authenticated smoke skipped')
      summary.authSmokeSkipReason = authSmokeRequired ? authSkipReason : 'E2E_REQUIRE_AUTH=false'
      markChecksSkipped(
        summary,
        [
          {
            name: 'auth login bootstrap',
            path: '/api/v1/auth/login',
            selector: '',
            mode: 'auth',
          },
          ...authenticatedRouteChecks.filter(
            (check) => !skippedSampleChecks.some((skipped) => skipped.name === check.name)
          ),
        ],
        authSmokeRequired
          ? (authSkipReason ?? 'Auth smoke credentials unavailable')
          : 'E2E_REQUIRE_AUTH=false'
      )
      if (skippedSampleChecks.some((check) => check.mode === 'auth')) {
        markChecksSkipped(
          summary,
          skippedSampleChecks.filter((check) => check.mode === 'auth'),
          skippedSampleChecks
            .filter((check) => check.mode === 'auth')
            .map((check) =>
              check.name === 'authenticated sample post'
                ? samplePostSkipReason
                : sampleDiscussionSkipReason
            )
            .join('; ')
        )
      }
      console.log(
        `🔐 Skipping authenticated smoke because ${authSmokeRequired ? (authSkipReason ?? 'credentials are unavailable') : 'E2E_REQUIRE_AUTH=false'} (guest-only local smoke is expected in this mode)`
      )
      if (authSmokeRequired) {
        throw new Error(
          `Authenticated smoke is required, but ${authSkipReason ?? 'credentials are unavailable'}. Provide PRIMARY_USERNAME/PRIMARY_PASSWORD for a seeded non-MFA smoke account. Legacy aliases E2E_AUTH_LOGIN/E2E_AUTH_PASSWORD remain supported.`
        )
      }
    }

    if (!externalBaseUrl) {
      setStage('service worker lifecycle')
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
      setStage('service worker lifecycle skipped')
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

    setStage('completed')
    console.log('\n✅ Minimal E2E checks passed')
  } catch (error) {
    runError = error
    const previewDiagnostics = getPreviewDiagnostics()
    if (!summary.lastFailureEvidence && previewDiagnostics?.length) {
      summary.lastFailureEvidence = {
        checkName: summary.lastFailedCheck,
        route: null,
        url: summary.baseUrl,
        pathname: null,
        title: null,
        screenshotPath: null,
        htmlSnapshotPath: null,
        previewDiagnostics,
        consoleMessages: null,
        requestFailures: null,
        badResponses: null,
      }
    }
    if (!summary.failureKind) {
      summary.failureKind = classifySmokeFailure(
        error,
        summary.lastFailureEvidence,
        previewDiagnostics ?? []
      )
    }
    console.error('\n❌ Minimal E2E checks failed:', error)
  } finally {
    process.off('SIGINT', handleTermination)
    process.off('SIGTERM', handleTermination)
    clearTimeout(hardTimeoutId)
    try {
      await writeSmokeArtifacts(summary)
      console.log('🧾 Wrote smoke summary to ' + summary.artifactDir)
    } catch (artifactError) {
      console.error('Failed to write smoke artifacts:', artifactError)
      if (!runError) {
        runError = artifactError
      }
    }

    await cleanupResources()
  }

  if (runError) {
    process.exitCode = 1
  }
}

void main()
