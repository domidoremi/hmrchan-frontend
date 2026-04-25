#!/usr/bin/env bun

import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { $ } from 'bun'
import puppeteer, { type Browser, type BrowserContext, type Page } from 'puppeteer'
import { createLocalAuditEnv, resolveLocalAuditPreviewPorts } from './lib/audit-env.js'
import { PreviewShellManager, clearLocalAuditRateLimitState } from './lib/preview-shell.js'
import {
  appendFunctionalChainCheck,
  createFunctionalChainSummary,
  finalizeFunctionalChainSummary,
  isUuidString,
  resolveFunctionalChainAccounts,
  validateFunctionalChainAccounts,
  writeFunctionalChainArtifacts,
} from './lib/functional-chain-matrix.js'

type MatrixAccount = ReturnType<typeof resolveFunctionalChainAccounts>[number]
type MatrixSummary = ReturnType<typeof createFunctionalChainSummary>
type CheckStatus = 'passed' | 'failed' | 'skipped' | 'environment-blocked'
type SessionResolveProbe = {
  status: number
  body: unknown
}

const projectRoot = resolve(import.meta.dir, '..')
const artifactDir =
  process.env['FUNCTIONAL_CHAIN_ARTIFACT_DIR']?.trim() ||
  join(
    projectRoot,
    'output',
    'functional-chain',
    new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, '')
  )
const externalBaseUrl = process.env['FUNCTIONAL_CHAIN_BASE_URL']?.trim()
const auditEnv = createLocalAuditEnv(process.env, {
  includeContractFallback: true,
  overrides: {
    VITE_LOCAL_AUDIT_PERSIST_AUTH_SESSION: 'true',
    VITE_ENABLE_CLIENT_INIT: 'true',
    VITE_ENABLE_DATA_PREFETCH: process.env['VITE_ENABLE_DATA_PREFETCH'] ?? 'false',
    VITE_DISABLE_PREVIEW_PROXY: 'false',
  },
})
const previewPorts = resolveLocalAuditPreviewPorts(auditEnv, [
  'FUNCTIONAL_CHAIN_PREVIEW_PORTS',
  'FUNCTIONAL_CHAIN_PREVIEW_PORT',
  'LOCAL_AUDIT_PREVIEW_PORTS',
])

function normalizeBaseUrl(rawUrl: string): string {
  return rawUrl.replace(/\/$/, '')
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([operation, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function classifyEnvironmentError(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error)
  if (
    /docker|container|ECONNREFUSED|fetch failed|UPSTREAM_|BFF_NOT_CONFIGURED|Internal API gateway|Cannot reach|timeout|Timed out/i.test(
      message
    )
  ) {
    return message
  }
  return null
}

async function readJsonResponse(response: Response): Promise<Record<string, unknown> | null> {
  const text = await response.text()
  if (!text.trim()) return null
  try {
    const parsed = JSON.parse(text) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return { raw: text }
  }
}

function hasSessionCookie(response: Response): boolean {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] }
  const cookies =
    typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : (response.headers.get('Set-Cookie') ?? '').split(/,(?=\s*__Host-)/)
  return cookies.some(
    (cookie) => /__Host-momi_bff_(at|rt)=/.test(cookie) && !/Max-Age=0/.test(cookie)
  )
}

async function postLogin(baseUrl: string, account: MatrixAccount, password = account.password) {
  const response = await fetch(new URL('/api/v1/auth/login', baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Fingerprint': `functional-chain-${account.role}`,
    },
    body: JSON.stringify({
      username: account.username,
      password,
      client_fingerprint: `functional-chain-${account.role}`,
    }),
    redirect: 'manual',
  })
  return {
    response,
    body: await readJsonResponse(response),
  }
}

async function runCheck(
  summary: MatrixSummary,
  metadata: { name: string; accountRole?: string },
  run: () => Promise<{ status?: CheckStatus; detail?: string } | void>
) {
  try {
    const result = (await run()) ?? {}
    appendFunctionalChainCheck(summary, {
      ...metadata,
      status: result.status ?? 'passed',
      detail: result.detail ?? null,
    })
    const status = result.status ?? 'passed'
    const icon =
      status === 'skipped'
        ? '⏭️'
        : status === 'environment-blocked'
          ? '⚠️'
          : status === 'failed'
            ? '❌'
            : '✅'
    const suffix = result.detail ? `: ${result.detail}` : ''
    console.log(`  ${icon} ${metadata.name}${suffix}`)
  } catch (error) {
    const environmentDetail = classifyEnvironmentError(error)
    const status: CheckStatus = environmentDetail ? 'environment-blocked' : 'failed'
    const detail = environmentDetail ?? (error instanceof Error ? error.message : String(error))
    appendFunctionalChainCheck(summary, {
      ...metadata,
      status,
      detail,
    })
    console.log(`  ${status === 'environment-blocked' ? '⚠️' : '❌'} ${metadata.name}: ${detail}`)
  }
}

async function loginViaFacade(
  page: Page,
  baseUrl: string,
  account: MatrixAccount,
  password = account.password
): Promise<{ status: number; body: unknown }> {
  await page.goto(new URL('/', baseUrl).toString(), {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  return page.evaluate(
    async ({ role, username, password: loginPassword }) => {
      const fingerprint = `functional-chain-${role}`
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Fingerprint': fingerprint,
        },
        body: JSON.stringify({
          username,
          password: loginPassword,
          client_fingerprint: fingerprint,
        }),
      })
      const text = await response.text()
      let body: unknown = null
      try {
        body = text.trim() ? JSON.parse(text) : null
      } catch {
        body = { raw: text }
      }

      return { status: response.status, body }
    },
    { role: account.role, username: account.username, password }
  )
}

async function closeBrowserContext(context: BrowserContext | null): Promise<void> {
  await context?.close().catch(() => undefined)
}

async function newIsolatedPage(browser: Browser): Promise<{
  context: BrowserContext
  page: Page
}> {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  return { context, page }
}

async function resolveSessionViaFacade(
  page: Page,
  baseUrl: string,
  accountRole: string
): Promise<SessionResolveProbe> {
  await page.goto(new URL('/', baseUrl).toString(), {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  return page.evaluate(async (fingerprint) => {
    const response = await fetch('/api/v1/auth/session:resolve', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Fingerprint': fingerprint,
      },
      body: JSON.stringify({ client_fingerprint: fingerprint }),
    })
    const text = await response.text()
    let body: unknown = null
    try {
      body = text.trim() ? JSON.parse(text) : null
    } catch {
      body = { raw: text }
    }

    return { status: response.status, body }
  }, `functional-chain-${accountRole}`)
}

function readSessionUserId(probe: SessionResolveProbe): unknown {
  const body = probe.body as {
    authenticated?: unknown
    user?: { id?: unknown }
    data?: { authenticated?: unknown; user?: { id?: unknown } }
  } | null
  return body?.user?.id ?? body?.data?.user?.id
}

function assertAuthenticatedUuidSession(probe: SessionResolveProbe, label: string): void {
  if (probe.status !== 200) {
    throw new Error(`${label} session:resolve returned HTTP ${probe.status}`)
  }
  const body = probe.body as {
    authenticated?: unknown
    user?: { id?: unknown }
    data?: { authenticated?: unknown; user?: { id?: unknown } }
  } | null
  const authenticated = body?.authenticated ?? body?.data?.authenticated
  if (authenticated !== true) {
    throw new Error(`${label} session:resolve did not return authenticated=true`)
  }
  const userId = readSessionUserId(probe)
  if (!isUuidString(userId)) {
    throw new Error(`${label} user.id is not a UUID string: ${String(userId ?? '')}`)
  }
}

function assertUnauthenticatedSession(probe: SessionResolveProbe, label: string): void {
  if (probe.status !== 200) {
    throw new Error(`${label} session:resolve returned HTTP ${probe.status}`)
  }
  const body = probe.body as { authenticated?: unknown; data?: { authenticated?: unknown } } | null
  const authenticated = body?.authenticated ?? body?.data?.authenticated
  if (authenticated !== false) {
    throw new Error(`${label} session:resolve expected authenticated=false`)
  }
}

async function assertProtectedRouteRedirectsToLogin(browser: Browser, baseUrl: string) {
  let context: BrowserContext | null = null
  try {
    const isolated = await newIsolatedPage(browser)
    context = isolated.context
    const page = isolated.page
    await page.goto(new URL('/profile', baseUrl).toString(), { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.location.pathname === '/login', { timeout: 15_000 })
  } finally {
    await closeBrowserContext(context)
  }
}

async function assertFacadeLoginAndSession(
  browser: Browser,
  baseUrl: string,
  account: MatrixAccount
) {
  let context: BrowserContext | null = null
  try {
    const isolated = await newIsolatedPage(browser)
    context = isolated.context
    const page = isolated.page
    const login = await loginViaFacade(page, baseUrl, account)
    if (login.status !== 200) {
      throw new Error(`primary login returned HTTP ${login.status}`)
    }
    const session = await resolveSessionViaFacade(page, baseUrl, account.role)
    assertAuthenticatedUuidSession(session, 'primary')

    await page.evaluate(async () => {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    })
    await page.goto(new URL('/profile', baseUrl).toString(), { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.location.pathname === '/login', { timeout: 15_000 })
  } finally {
    await closeBrowserContext(context)
  }
}

async function assertPeerSessionIsolation(browser: Browser, baseUrl: string, peer: MatrixAccount) {
  let primaryContext: BrowserContext | null = null
  let peerContext: BrowserContext | null = null
  try {
    const primaryProbe = await newIsolatedPage(browser)
    const peerProbe = await newIsolatedPage(browser)
    primaryContext = primaryProbe.context
    peerContext = peerProbe.context

    const primaryBefore = await resolveSessionViaFacade(primaryProbe.page, baseUrl, 'primary-probe')
    assertUnauthenticatedSession(primaryBefore, 'primary probe before peer login')

    const login = await loginViaFacade(peerProbe.page, baseUrl, peer)
    if (login.status !== 200) {
      throw new Error(`peer login returned HTTP ${login.status}`)
    }
    const peerSession = await resolveSessionViaFacade(peerProbe.page, baseUrl, peer.role)
    assertAuthenticatedUuidSession(peerSession, 'peer')

    const primaryAfter = await resolveSessionViaFacade(primaryProbe.page, baseUrl, 'primary-probe')
    assertUnauthenticatedSession(primaryAfter, 'primary probe after peer login')
  } finally {
    await closeBrowserContext(peerContext)
    await closeBrowserContext(primaryContext)
  }
}

async function assertAdminSignal(baseUrl: string, admin: MatrixAccount) {
  const login = await postLogin(baseUrl, admin)
  if (login.response.status !== 200) {
    throw new Error(`admin login returned HTTP ${login.response.status}`)
  }
  const body = login.body ?? {}
  const user = (body.user ?? (body.data as Record<string, unknown> | undefined)?.user) as
    | Record<string, unknown>
    | undefined
  const isAdmin =
    user?.is_admin === true ||
    user?.role === 'super_admin' ||
    (Array.isArray(user?.roles) && user.roles.includes('super_admin'))
  if (!isAdmin) {
    return {
      status: 'environment-blocked' as const,
      detail:
        'admin login succeeded, but frontend facade did not expose an admin permission signal',
    }
  }
  return undefined
}

async function assertForbiddenLogin(baseUrl: string, account: MatrixAccount, expected: string) {
  const login = await postLogin(baseUrl, account)
  if (login.response.status !== 403) {
    throw new Error(`${expected} account returned HTTP ${login.response.status}, expected 403`)
  }
  if (hasSessionCookie(login.response)) {
    throw new Error(`${expected} account wrote BFF session cookies on 403`)
  }
}

async function assertWrongPassword(baseUrl: string, account: MatrixAccount) {
  const login = await postLogin(baseUrl, account, `${account.password}-wrong`)
  if (![401, 403].includes(login.response.status)) {
    throw new Error(`wrong password returned HTTP ${login.response.status}, expected 401/403`)
  }
  if (hasSessionCookie(login.response)) {
    throw new Error('wrong password wrote BFF session cookies')
  }
}

async function main() {
  console.log('🔎 Running local functional chain account matrix...\n')
  await mkdir(artifactDir, { recursive: true })
  const accounts = resolveFunctionalChainAccounts(process.env)
  const summary = createFunctionalChainSummary({ artifactDir, accounts })
  const accountError = validateFunctionalChainAccounts(accounts)

  if (accountError) {
    appendFunctionalChainCheck(summary, {
      name: 'primary account configured',
      accountRole: 'primary',
      status: 'failed',
      detail: accountError,
    })
    finalizeFunctionalChainSummary(summary)
    await writeFunctionalChainArtifacts(summary)
    console.log(`❌ ${accountError}`)
    console.log(`🧾 Summary: ${join(artifactDir, 'summary.md')}`)
    process.exit(1)
  }

  let previewServer: PreviewShellManager | null = null
  let browser: Browser | null = null
  let exitCode = 0

  try {
    let baseUrl = externalBaseUrl ? normalizeBaseUrl(externalBaseUrl) : ''
    if (!baseUrl) {
      console.log('🏗️ Building project for local Pages preview...')
      await $`node scripts/build.mjs`.env(auditEnv).cwd(projectRoot).quiet()
      previewServer = new PreviewShellManager({
        env: auditEnv,
        candidatePorts: previewPorts,
        allowRandomPortFallback: true,
        serverMode: 'pages',
      })
      await previewServer.start()
      baseUrl = previewServer.baseUrl ?? ''
    }

    summary.baseUrl = baseUrl
    await clearLocalAuditRateLimitState(auditEnv).catch(() => undefined)
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      executablePath: process.env['PUPPETEER_EXECUTABLE_PATH'],
    })

    const byRole = new Map(accounts.map((account) => [account.role, account]))
    const primary = byRole.get('primary')!

    await runCheck(
      summary,
      { name: 'primary login and session resolve', accountRole: 'primary' },
      () => assertFacadeLoginAndSession(browser!, baseUrl, primary)
    )
    await runCheck(
      summary,
      { name: 'guest protected route redirects to login', accountRole: 'primary' },
      () => assertProtectedRouteRedirectsToLogin(browser!, baseUrl)
    )
    await runCheck(summary, { name: 'wrong password is rejected', accountRole: 'primary' }, () =>
      assertWrongPassword(baseUrl, primary)
    )

    for (const role of ['peer', 'admin', 'locked', 'disabled']) {
      const account = byRole.get(role)
      if (!account?.configured) {
        appendFunctionalChainCheck(summary, {
          name: `${role} account configured`,
          accountRole: role,
          status: 'skipped',
          detail: account?.skipReason ?? `${role} account not configured`,
        })
        console.log(`  ⏭️ ${role} account configured`)
        continue
      }

      if (role === 'peer') {
        await runCheck(summary, { name: 'peer isolated login', accountRole: role }, () =>
          assertPeerSessionIsolation(browser!, baseUrl, account)
        )
      } else if (role === 'admin') {
        await runCheck(summary, { name: 'admin login permission signal', accountRole: role }, () =>
          assertAdminSignal(baseUrl, account)
        )
      } else {
        await runCheck(summary, { name: `${role} account rejected`, accountRole: role }, () =>
          assertForbiddenLogin(baseUrl, account, role)
        )
      }
    }
  } catch (error) {
    const environmentDetail = classifyEnvironmentError(error)
    appendFunctionalChainCheck(summary, {
      name: 'functional chain harness',
      status: environmentDetail ? 'environment-blocked' : 'failed',
      detail: environmentDetail ?? (error instanceof Error ? error.message : String(error)),
    })
  } finally {
    await (browser
      ? withTimeout(browser.close(), 10_000, 'browser close').catch(() => undefined)
      : Promise.resolve())
    await (previewServer
      ? withTimeout(previewServer.stop(), 10_000, 'preview stop').catch(() => undefined)
      : Promise.resolve())
    finalizeFunctionalChainSummary(summary)
    await writeFunctionalChainArtifacts(summary)
    console.log(`\n🧾 Summary: ${join(artifactDir, 'summary.md')}`)
    console.log(`Functional chain status: ${summary.status}`)
    if (summary.status === 'failed') exitCode = 1
  }

  process.exit(exitCode)
}

await main()
