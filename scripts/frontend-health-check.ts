#!/usr/bin/env bun
/**
 * 前端健康巡检脚本（路由可用性 + 基础可访问性 + 控制台与网络错误）
 *
 * 用法：
 *   bun run scripts/frontend-health-check.ts
 *   FRONTEND_HEALTH_BASE_URL=http://127.0.0.1:5174 bun run scripts/frontend-health-check.ts
 */

import puppeteer, { type Viewport, type Page } from 'puppeteer'
import { spawn, type ChildProcess } from 'child_process'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { shouldIgnoreConsoleError, shouldIgnoreRequestIssue } from './lib/frontend-health'
import { withBuildArtifactLock } from './lib/build-artifact-lock.js'
import { getSmokeRouteMatrix } from './lib/release-route-contract.js'
import { getAuthSkipReason } from './lib/e2e-smoke-report.js'

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

const BASE_URL = process.env['FRONTEND_HEALTH_BASE_URL'] ?? 'http://127.0.0.1:5174'
const ARTIFACT_DIR = process.env['FRONTEND_HEALTH_ARTIFACT_DIR']?.trim() || '.frontend-health'
const AUTO_START = process.env['FRONTEND_HEALTH_AUTOSTART'] !== 'false'
const PREVIEW_PORT = Number(process.env['FRONTEND_HEALTH_PREVIEW_PORT'] ?? '4174')
const INCLUDE_API_ERRORS = process.env['FRONTEND_HEALTH_INCLUDE_API_ERRORS'] === 'true'
const SAMPLE_POST_ROUTE =
  process.env['FRONTEND_HEALTH_SAMPLE_POST_ROUTE'] ?? '/post/6c73f45a-a7ec-481d-9bc5-9b09ee560fcc'
const SAMPLE_DISCUSSION_ROUTE =
  process.env['FRONTEND_HEALTH_SAMPLE_DISCUSSION_ROUTE'] ??
  '/community/discussions/dd8173a9-7ecc-4ecb-a362-0286d0eee53c'
const AUTH_LOGIN = process.env['E2E_AUTH_LOGIN']?.trim() ?? ''
const AUTH_PASSWORD = process.env['E2E_AUTH_PASSWORD']?.trim() ?? ''
const AUTH_REQUIRED =
  process.env['FRONTEND_HEALTH_REQUIRE_AUTH'] === 'true' ||
  process.env['E2E_REQUIRE_AUTH'] === 'true'
const AUDIT_ENV = {
  ...process.env,
  VITE_ENABLE_CLIENT_INIT: process.env['VITE_ENABLE_CLIENT_INIT'] ?? 'false',
  VITE_ENABLE_SCHEDULE_API: process.env['VITE_ENABLE_SCHEDULE_API'] ?? 'false',
  VITE_ENABLE_DATA_PREFETCH: process.env['VITE_ENABLE_DATA_PREFETCH'] ?? 'false',
  VITE_DISABLE_PREVIEW_PROXY: process.env['VITE_DISABLE_PREVIEW_PROXY'] ?? 'true',
}

const GUEST_ROUTES: HealthRouteDefinition[] = [
  ...getSmokeRouteMatrix({
    samplePostRoute: SAMPLE_POST_ROUTE,
    sampleDiscussionRoute: SAMPLE_DISCUSSION_ROUTE,
  }).guest.map((route) => ({
    name: route.name,
    path: route.path,
    mode: route.mode,
    shellSelector: route.shellSelector,
    expectedPath: route.expectedPath,
    readinessSelectorsAll: route.readinessSelectorsAll,
    readinessSelectorsAny: route.readinessSelectorsAny,
  })),
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

const AUTH_ROUTES: HealthRouteDefinition[] = getSmokeRouteMatrix({
  samplePostRoute: SAMPLE_POST_ROUTE,
  sampleDiscussionRoute: SAMPLE_DISCUSSION_ROUTE,
}).auth.map((route) => ({
  name: route.name,
  path: route.path,
  mode: route.mode,
  shellSelector: route.shellSelector,
  expectedPath: route.expectedPath,
  readinessSelectorsAll: route.readinessSelectorsAll,
  readinessSelectorsAny: route.readinessSelectorsAny,
}))

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

function isGuestProtectedRedirectRoute(
  route: Pick<HealthRouteDefinition, 'mode' | 'expectedPath'>
): boolean {
  return route.mode === 'guest' && route.expectedPath === '/login'
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
  const readinessSelectorsAll = route.readinessSelectorsAll ?? []
  const readinessSelectorsAny = route.readinessSelectorsAny ?? []
  const needsLazyReadinessScroll =
    (route.path.startsWith('/post/') || route.path.startsWith('/community/discussions/')) &&
    (readinessSelectorsAll.length > 0 || readinessSelectorsAny.length > 0)

  if (needsLazyReadinessScroll) {
    const anchorSelectors = route.path.startsWith('/post/')
      ? ['.post-comments']
      : ['.discussion-comments']

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const ready = await page.evaluate(
        ({ all, any }) => {
          const allMatched = all.every((selector) => Boolean(document.querySelector(selector)))
          const anyMatched =
            any.length === 0 || any.some((selector) => Boolean(document.querySelector(selector)))
          return allMatched && anyMatched
        },
        {
          all: readinessSelectorsAll,
          any: readinessSelectorsAny,
        }
      )

      if (ready) break

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

      await sleep(reachedBottom ? 400 : 250)
    }
  }

  for (const selector of readinessSelectorsAll) {
    await page.waitForSelector(selector, { timeout: 15_000 })
  }

  if (readinessSelectorsAny.length) {
    await page.waitForFunction(
      (selectors) => selectors.some((selector) => Boolean(document.querySelector(selector))),
      { timeout: 15_000 },
      readinessSelectorsAny
    )
  }
}

async function assertHealthRouteContract(page: Page, route: HealthRouteDefinition): Promise<void> {
  if (route.shellSelector) {
    await page.waitForSelector(route.shellSelector, { timeout: 15_000 })
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

function getBunExecutable(): string {
  return 'bun'
}

async function runBunTask(task: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(getBunExecutable(), ['run', task], {
      stdio: 'inherit',
      shell: false,
      env: AUDIT_ENV,
    })

    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`bun run ${task} exited with code ${code}`))
    })
    child.on('error', reject)
  })
}

async function terminateProcessTree(pid: number | undefined): Promise<void> {
  if (!pid) return

  if (process.platform === 'win32') {
    await new Promise<void>((resolve) => {
      const killer = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        shell: false,
      })
      killer.on('close', () => resolve())
      killer.on('error', () => resolve())
    })
    return
  }

  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    // ignore
  }
}

async function waitForProcessExit(child: ChildProcess, timeoutMs = 10_000): Promise<void> {
  if (child.exitCode !== null || child.killed) {
    return
  }

  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, timeoutMs)
    const finish = () => {
      clearTimeout(timer)
      resolve()
    }

    child.once('close', finish)
    child.once('error', finish)
  })
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

function startPreviewServer(
  port: number
): Promise<{ kill: () => Promise<void>; baseUrl: string; port: number }> {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Starting preview server on ${port}...`)
    const server = spawn(getBunExecutable(), ['run', 'preview', '--port', String(port)], {
      stdio: 'ignore',
      shell: false,
      env: AUDIT_ENV,
    })

    let resolved = false
    let startupCheck: ReturnType<typeof setInterval> | null = null
    let startupTimeout: ReturnType<typeof setTimeout> | null = null

    function cleanupStartupCheck() {
      if (startupCheck) {
        clearInterval(startupCheck)
        startupCheck = null
      }
    }

    function cleanupStartupTimeout() {
      if (startupTimeout) {
        clearTimeout(startupTimeout)
        startupTimeout = null
      }
    }

    async function tryResolveWhenReady() {
      if (resolved) return

      try {
        const response = await fetch(`http://127.0.0.1:${port}/`, {
          redirect: 'manual',
        })
        if (response.status >= 200 && response.status < 500) {
          resolved = true
          cleanupStartupCheck()
          cleanupStartupTimeout()
          server.unref()
          resolve({
            kill: async () => {
              await terminateProcessTree(server.pid)
              await waitForProcessExit(server)
            },
            baseUrl: `http://127.0.0.1:${port}`,
            port,
          })
        }
      } catch {
        // preview server not ready yet
      }
    }

    server.on('error', (error: Error) => {
      cleanupStartupCheck()
      cleanupStartupTimeout()
      if (!resolved) reject(error)
    })

    server.on('close', (code) => {
      cleanupStartupCheck()
      cleanupStartupTimeout()
      if (!resolved) {
        reject(new Error(`Preview server exited before becoming ready (code ${code ?? 'unknown'})`))
      }
    })

    startupCheck = setInterval(() => {
      void tryResolveWhenReady()
    }, 500)
    void tryResolveWhenReady()

    startupTimeout = setTimeout(() => {
      if (!resolved) {
        cleanupStartupCheck()
        void terminateProcessTree(server.pid)
        reject(new Error('Preview server startup timeout'))
      }
    }, 45_000)
  })
}

async function captureFailureEvidence(
  page: Page,
  artifactDir: string,
  route: string,
  viewport: string,
  issue: ScanIssue
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
  }
}

async function authenticateViaApi(
  browser: puppeteer.Browser,
  baseUrl: string,
  credentials: { login: string; password: string }
): Promise<void> {
  const page = await browser.newPage()

  try {
    await page.goto(`${baseUrl}/login`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })

    const result = await page.evaluate(async ({ login, password }) => {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          username: login,
          password,
          device_name: 'Frontend Health Browser',
          device_type: 'desktop',
        }),
      })

      let payload: unknown = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }

      return {
        ok: response.ok,
        status: response.status,
        payload,
      }
    }, credentials)

    if (!result.ok) {
      throw new Error(
        `Frontend health auth bootstrap failed with status ${result.status}: ${JSON.stringify(result.payload)}`
      )
    }
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

async function main() {
  let effectiveBaseUrl = BASE_URL
  let managedServer: { kill: () => Promise<void>; baseUrl: string; port: number } | null = null
  const results: RouteResult[] = []
  let crashed = false
  let firstBlockingIssue: HealthFailureEvidence | null = null
  const authSkipReason = getAuthSkipReason(AUTH_LOGIN, AUTH_PASSWORD)
  const authCredentialsDetected = Boolean(AUTH_LOGIN && AUTH_PASSWORD)

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
      await withBuildArtifactLock('vite-dist-build', () => runBunTask('build'), {
        onWait: () => {
          console.log('🔒 Waiting for another build process to release the dist artifact lock...')
        },
      })
      managedServer = await startPreviewServer(PREVIEW_PORT)
      effectiveBaseUrl = managedServer.baseUrl
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      executablePath: process.env['PUPPETEER_EXECUTABLE_PATH'],
    })

    const healthFilterOptions = {
      baseOrigin: effectiveBaseUrl,
    }

    try {
      if (authCredentialsDetected) {
        await authenticateViaApi(browser, effectiveBaseUrl, {
          login: AUTH_LOGIN,
          password: AUTH_PASSWORD,
        })
      } else if (AUTH_REQUIRED) {
        throw new Error(
          `Authenticated frontend health is required, but ${authSkipReason ?? 'credentials are unavailable'}. Provide E2E_AUTH_LOGIN/E2E_AUTH_PASSWORD for the seeded smoke account.`
        )
      } else {
        console.log(
          `🔐 Skipping authenticated frontend health because ${authSkipReason ?? 'credentials are unavailable'}`
        )
      }

      const routesToScan = authCredentialsDetected
        ? [...GUEST_ROUTES, ...AUTH_ROUTES]
        : GUEST_ROUTES

      for (const viewport of VIEWPORTS) {
        for (const route of routesToScan) {
          const page = await browser.newPage()
          const issues: ScanIssue[] = []
          const consoleErrors = new Set<string>()
          const requestFailures = new Set<string>()
          const badResponses = new Set<string>()

          await page.setViewport(viewport.value)

          page.on('console', (msg) => {
            if (msg.type() === 'error') {
              const text = msg.text()
              if (
                shouldIgnoreConsoleError(
                  text,
                  INCLUDE_API_ERRORS,
                  msg.location().url,
                  healthFilterOptions
                )
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

          try {
            await page.goto(new URL(route.path, effectiveBaseUrl).toString(), {
              waitUntil: 'domcontentloaded',
              timeout: 60_000,
            })
            await page.waitForSelector('body', { timeout: 15_000 })
            await assertHealthRouteContract(page, route)
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
          } catch (error) {
            crashed = true
            issues.push({
              type: 'route-crash',
              message: `页面加载失败: ${(error as Error).message}`,
            })
          }

          if (!firstBlockingIssue && issues.length > 0) {
            firstBlockingIssue = await captureFailureEvidence(
              page,
              ARTIFACT_DIR,
              route.path,
              viewport.name,
              issues[0]
            )
          }

          await page.close()

          results.push({
            route: route.path,
            name: route.name,
            viewport: viewport.name,
            issues,
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
      scannedRouteViewportCount: results.length,
      issueCount,
      crashed,
      firstBlockingIssue,
      results,
    }).catch(() => undefined)
    throw error
  } finally {
    if (managedServer) {
      await managedServer.kill()
    }
  }
}

main().catch((error) => {
  console.error('Frontend health check crashed:', error)
  process.exitCode = 1
})
