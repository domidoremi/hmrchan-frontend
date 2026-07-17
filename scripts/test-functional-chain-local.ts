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
  resolveFunctionalChainAccounts,
  validateFunctionalChainAccounts,
  writeFunctionalChainArtifacts,
} from './lib/functional-chain-matrix.js'
import {
  assertAuthenticatedUuidSession,
  assertUnauthenticatedSession,
  buildCookieHeaderFromCookieRecords,
  buildCookieHeaderFromSetCookieHeaders,
  buildOriginCsrfMaterial,
  getBffSessionSetCookieHeaders,
  hasSessionSetCookie,
  parseBffSessionCookieForBrowser,
} from './lib/functional-chain-session.js'
import { stripTrailingSlash } from './lib/url.js'

type MatrixAccount = ReturnType<typeof resolveFunctionalChainAccounts>[number]
type MatrixSummary = ReturnType<typeof createFunctionalChainSummary>
type CheckStatus = 'passed' | 'failed' | 'skipped' | 'environment-blocked'
type SessionResolveProbe = {
  status: number
  body: unknown
}
type BrowserCookieParam = Parameters<Page['setCookie']>[number]

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
  return hasSessionSetCookie(getSetCookieHeaders(response))
}

function getSetCookieHeaders(response: Response): string[] {
  return getBffSessionSetCookieHeaders(response.headers)
}

function parseSetCookieForBrowser(baseUrl: string, cookie: string): BrowserCookieParam | null {
  return parseBffSessionCookieForBrowser(baseUrl, cookie) as BrowserCookieParam | null
}

async function applySessionCookiesToPage(
  page: Page,
  baseUrl: string,
  response: Response
): Promise<void> {
  const cookies = getSetCookieHeaders(response)
    .map((cookie) => parseSetCookieForBrowser(baseUrl, cookie))
    .filter((cookie): cookie is BrowserCookieParam => cookie !== null)
  if (cookies.length > 0) {
    await page.setCookie(...cookies)
  }
}

async function buildCookieHeaderFromContext(
  context: BrowserContext,
  baseUrl: string,
  role: string
): Promise<string> {
  const cookies = await context.cookies()
  return buildCookieHeaderFromCookieRecords(baseUrl, role, cookies)
}

function buildCookieHeaderFromLoginResponse(
  response: Response,
  baseUrl: string,
  role: string
): string {
  return buildCookieHeaderFromSetCookieHeaders(getSetCookieHeaders(response), baseUrl, role)
}

async function resolveSessionViaCookieHeader(
  baseUrl: string,
  accountRole: string,
  cookieHeader = buildOriginCsrfMaterial(baseUrl, accountRole).cookieHeader
): Promise<SessionResolveProbe> {
  const csrf = buildOriginCsrfMaterial(baseUrl, accountRole)
  const fingerprint = `functional-chain-${accountRole}`
  const response = await fetch(new URL('/api/v1/auth/session:resolve', baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
      'X-Origin-CSRF': csrf.token,
      'X-Client-Fingerprint': fingerprint,
    },
    body: JSON.stringify({ client_fingerprint: fingerprint }),
    redirect: 'manual',
  })
  return {
    status: response.status,
    body: await readJsonResponse(response),
  }
}

async function resolveSessionViaContext(
  context: BrowserContext,
  baseUrl: string,
  accountRole: string
): Promise<SessionResolveProbe> {
  return resolveSessionViaCookieHeader(
    baseUrl,
    accountRole,
    await buildCookieHeaderFromContext(context, baseUrl, accountRole)
  )
}

async function logoutViaContext(
  context: BrowserContext,
  baseUrl: string,
  accountRole: string
): Promise<void> {
  const csrf = buildOriginCsrfMaterial(baseUrl, accountRole)
  const response = await fetch(new URL('/api/v1/auth/logout', baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: await buildCookieHeaderFromContext(context, baseUrl, accountRole),
      'X-Origin-CSRF': csrf.token,
    },
    body: JSON.stringify({}),
    redirect: 'manual',
  })
  const cookies = await context.cookies()
  if (cookies.length > 0) {
    await context.deleteCookie(...cookies)
  }
  if (hasSessionCookie(response)) {
    throw new Error('logout wrote BFF session cookies')
  }
}

async function postLogin(baseUrl: string, account: MatrixAccount, password = account.password) {
  const csrf = buildOriginCsrfMaterial(baseUrl, account.role)
  const response = await fetch(new URL('/api/v1/auth/login', baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: csrf.cookieHeader,
      'X-Origin-CSRF': csrf.token,
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
  const login = await postLogin(baseUrl, account, password)
  await applySessionCookiesToPage(page, baseUrl, login.response)
  return {
    status: login.response.status,
    body: login.body,
  }
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
  return resolveSessionViaContext(page.browserContext(), baseUrl, accountRole)
}

async function assertProtectedRouteRedirectsToLogin(browser: Browser, baseUrl: string) {
  void browser
  const session = await resolveSessionViaCookieHeader(baseUrl, 'guest-probe')
  assertUnauthenticatedSession(session, 'guest protected route probe')
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

    await logoutViaContext(context, baseUrl, account.role)
    const afterLogout = await resolveSessionViaContext(context, baseUrl, account.role)
    assertUnauthenticatedSession(afterLogout, 'primary after logout')
  } finally {
    await closeBrowserContext(context)
  }
}

async function assertPeerSessionIsolation(browser: Browser, baseUrl: string, peer: MatrixAccount) {
  void browser
  const primaryBefore = await resolveSessionViaCookieHeader(baseUrl, 'primary-probe')
  assertUnauthenticatedSession(primaryBefore, 'primary probe before peer login')

  const login = await postLogin(baseUrl, peer)
  if (login.response.status !== 200) {
    throw new Error(`peer login returned HTTP ${login.response.status}`)
  }
  const peerCookieHeader = buildCookieHeaderFromLoginResponse(login.response, baseUrl, peer.role)
  const peerSession = await resolveSessionViaCookieHeader(baseUrl, peer.role, peerCookieHeader)
  assertAuthenticatedUuidSession(peerSession, 'peer')

  const primaryAfter = await resolveSessionViaCookieHeader(baseUrl, 'primary-probe')
  assertUnauthenticatedSession(primaryAfter, 'primary probe after peer login')
}

async function assertAdminSignal(baseUrl: string, admin: MatrixAccount) {
  const login = await postLogin(baseUrl, admin)
  if (login.response.status !== 200) {
    throw new Error(`admin login returned HTTP ${login.response.status}`)
  }
  const body = login.body ?? {}
  const user = (body.user ?? (body.data as Record<string, unknown> | undefined)?.user) as
    Record<string, unknown> | undefined
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
    let baseUrl = externalBaseUrl ? stripTrailingSlash(externalBaseUrl) : ''
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
