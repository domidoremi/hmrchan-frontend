#!/usr/bin/env bun

import { spawn, type ChildProcess } from 'child_process'
import { mkdir, writeFile } from 'fs/promises'
import { createServer } from 'net'
import { join } from 'path'
import puppeteer, { type Page } from 'puppeteer'
import {
  createSmokeSummary,
  getAuthSkipReason,
  writeSmokeArtifacts,
} from './lib/e2e-smoke-report.js'
import { withBuildArtifactLock } from './lib/build-artifact-lock.js'
import { getSmokeRouteMatrix } from './lib/release-route-contract.js'

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
  return Boolean(env['E2E_AUTH_LOGIN']?.trim() && env['E2E_AUTH_PASSWORD']?.trim())
}

const AUDIT_ENV = {
  ...process.env,
  VITE_ENABLE_CLIENT_INIT: process.env['VITE_ENABLE_CLIENT_INIT'] ?? 'false',
  VITE_ENABLE_DATA_PREFETCH: process.env['VITE_ENABLE_DATA_PREFETCH'] ?? 'false',
  VITE_DISABLE_PREVIEW_PROXY:
    process.env['VITE_DISABLE_PREVIEW_PROXY'] ??
    (hasAuthSmokeCredentials(process.env) ? 'false' : 'true'),
}

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

function getBunExecutable(): string {
  return 'bun'
}

function normalizeBaseUrl(rawUrl: string): string {
  return rawUrl.replace(/\/$/, '')
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function appendCheck(summary: SmokeSummary, check: CheckRecord): void {
  summary.checks.push(check)
}

async function capturePageFailureEvidence(
  page: Page,
  artifactDir: string,
  metadata: Pick<CheckRecord, 'name' | 'path'>
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

async function withPageFailureEvidence(
  browser: puppeteer.Browser,
  artifactDir: string,
  metadata: Pick<CheckRecord, 'name' | 'path'>,
  onFailure: (evidence: FailureEvidence) => void,
  run: (page: Page) => Promise<void>,
  timeout = 20_000
): Promise<void> {
  const page = await browser.newPage()
  page.setDefaultTimeout(timeout)

  try {
    await run(page)
  } catch (error) {
    onFailure(await capturePageFailureEvidence(page, artifactDir, metadata))
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

async function findAvailablePort(preferredPort = 0): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.once('error', reject)
    server.listen(preferredPort, () => {
      const address = server.address()
      const actualPort =
        typeof address === 'object' && address && typeof address.port === 'number'
          ? address.port
          : preferredPort
      server.close((error) => {
        if (error) reject(error)
        else resolve(actualPort)
      })
    })
  })
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

function startPreviewServer(port: number): Promise<{ kill: () => Promise<void>; port: number }> {
  return new Promise((resolve, reject) => {
    const server = spawn(getBunExecutable(), ['run', 'preview', '--port', String(port)], {
      stdio: 'ignore',
      shell: false,
      env: AUDIT_ENV,
    })

    let resolved = false
    let startupCheck: ReturnType<typeof setInterval> | null = null

    function cleanupStartupCheck() {
      if (startupCheck) {
        clearInterval(startupCheck)
        startupCheck = null
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
          server.unref()
          resolve({
            kill: async () => {
              await terminateProcessTree(server.pid)
              await waitForProcessExit(server)
            },
            port,
          })
        }
      } catch {
        // preview server not ready yet
      }
    }

    server.on('error', (error) => {
      cleanupStartupCheck()
      if (!resolved) reject(error)
    })

    server.on('close', (code) => {
      cleanupStartupCheck()
      if (!resolved) {
        reject(new Error(`Preview server exited before becoming ready (code ${code ?? 'unknown'})`))
      }
    })

    startupCheck = setInterval(() => {
      void tryResolveWhenReady()
    }, 500)
    void tryResolveWhenReady()

    setTimeout(() => {
      if (!resolved) {
        cleanupStartupCheck()
        void terminateProcessTree(server.pid)
        reject(new Error(`Preview server startup timeout on port ${port}`))
      }
    }, 45_000)
  })
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
  onFailure: (evidence: FailureEvidence) => void
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
    15_000
  )
}

async function authenticateViaApi(
  browser: puppeteer.Browser,
  baseUrl: string,
  credentials: { login: string; password: string },
  artifactDir: string,
  onFailure: (evidence: FailureEvidence) => void
): Promise<void> {
  await withPageFailureEvidence(
    browser,
    artifactDir,
    { name: 'auth login bootstrap', path: '/api/v1/auth/login' },
    onFailure,
    async (page) => {
      await page.goto(`${baseUrl}/login`, {
        waitUntil: 'domcontentloaded',
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
            device_name: 'CI Smoke Browser',
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
          `Auth smoke login failed with status ${result.status}: ${JSON.stringify(result.payload)}`
        )
      }
    }
  )
}

async function assertAuthenticatedRoute(
  browser: puppeteer.Browser,
  baseUrl: string,
  check: RouteCheck,
  artifactDir: string,
  onFailure: (evidence: FailureEvidence) => void
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
    }
  )
}

async function assertServiceWorkerLifecycle(
  browser: puppeteer.Browser,
  baseUrl: string,
  artifactDir: string,
  onFailure: (evidence: FailureEvidence) => void
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
    }
  )
}

async function main(): Promise<void> {
  console.log('🔎 Running minimal E2E checks...\n')

  const artifactDir = process.env['E2E_ARTIFACT_DIR']?.trim() || '.e2e-smoke'
  const externalBaseUrl = process.env['E2E_BASE_URL']?.trim()
  const authLogin = process.env['E2E_AUTH_LOGIN']?.trim() ?? ''
  const authPassword = process.env['E2E_AUTH_PASSWORD']?.trim() ?? ''
  const samplePostRoute =
    process.env['E2E_SAMPLE_POST_ROUTE'] ?? '/post/6c73f45a-a7ec-481d-9bc5-9b09ee560fcc'
  const sampleDiscussionRoute =
    process.env['E2E_SAMPLE_DISCUSSION_ROUTE'] ??
    '/community/discussions/dd8173a9-7ecc-4ecb-a362-0286d0eee53c'
  const authSmokeEnabled = Boolean(authLogin && authPassword)
  const authSmokeRequired = process.env['E2E_REQUIRE_AUTH'] === 'true'
  const authSkipReason = getAuthSkipReason(authLogin, authPassword)
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

  let previewServer: { kill: () => Promise<void>; port: number } | null = null
  let browser: puppeteer.Browser | null = null
  let runError: unknown = null

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
      await withBuildArtifactLock('vite-dist-build', () => runBunTask('build'), {
        onWait: () => {
          console.log('🔒 Waiting for another build process to release the dist artifact lock...')
        },
      })

      const previewPort = await findAvailablePort(0)
      previewServer = await startPreviewServer(previewPort)
      baseUrl = `http://localhost:${previewServer.port}`
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
    for (const check of guestBrowserChecks) {
      await recordCheck(
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
        () => assertBrowserRoute(browser!, baseUrl, check, artifactDir, recordFailureEvidence)
      )
    }

    if (authSmokeEnabled) {
      console.log('🔐 Verifying authenticated smoke routes...')
      summary.authSmokeExecuted = true
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
            recordFailureEvidence
          )
      )

      for (const check of authenticatedRouteChecks) {
        await recordCheck(
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
          () =>
            assertAuthenticatedRoute(browser!, baseUrl, check, artifactDir, recordFailureEvidence)
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
          `Authenticated smoke is required, but ${authSkipReason ?? 'credentials are unavailable'}. Provide E2E_AUTH_LOGIN/E2E_AUTH_PASSWORD for a seeded non-MFA smoke account.`
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
        () => assertServiceWorkerLifecycle(browser!, baseUrl, artifactDir, recordFailureEvidence)
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
      await previewServer.kill()
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
