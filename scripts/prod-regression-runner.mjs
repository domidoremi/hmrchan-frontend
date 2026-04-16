#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline/promises'

import puppeteer from 'puppeteer'
import { applyLocalAuditEnvToProcess } from './lib/audit-env.js'
import {
  getManualRunnerProtectedRoutes,
  getReleaseRouteContractOverview,
  validateReleaseRouteContract,
} from './lib/release-route-contract.js'
import {
  buildRunnerPreflightChecks,
  buildRunnerPreflightSummary,
  renderSkippedChecks,
  writeRunnerPreflightArtifacts,
} from './lib/prod-regression-report.js'

applyLocalAuditEnvToProcess()

const DEFAULT_BASE_URL = 'https://momichan.xyz'
const DEFAULT_SECONDARY_EMAIL_MODE = 'user-assisted'
const SITE_NAME = 'MomiChan'
const EN_LOCALE_PATH = path.resolve('src', 'i18n', 'locales', 'en.json')
const RETIRED_AUTH_PAGE_TERMS = Object.freeze([
  ['Auth', 'entik'].join(''),
  ['OI', 'DC'].join(''),
  ['统一', '登录'].join(''),
  ['历史认证', '子域'].join(''),
  ['历史后台', '子域'].join(''),
])
const CHECKPOINT_TYPES = {
  registerCode: 'register-code',
  login2fa: 'login-2fa',
  loginRisk: 'login-risk-verification',
  turnstile: 'turnstile',
  verifyEmailLink: 'verify-email-link',
  forgotPasswordLink: 'forgot-password-link',
  qaEmail: 'qa-email',
}

class SkipCheckError extends Error {
  constructor(reason, classification = 'coverage-gap') {
    super(reason)
    this.name = 'SkipCheckError'
    this.reason = reason
    this.classification = classification
  }
}

function parseArgs(argv) {
  const options = {
    help: false,
    headless: false,
    preflight: false,
  }

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }
    if (arg === '--headless') {
      options.headless = true
      continue
    }
    if (arg === '--preflight') {
      options.preflight = true
      continue
    }
    throw new Error(`未知参数: ${arg}`)
  }

  if (String(process.env.HEADLESS ?? '').toLowerCase() === 'true') {
    options.headless = true
  }

  return options
}

function printHelp() {
  console.log(`
momichan.xyz 生产深度回归 runner

用法:
  BASE_URL=https://momichan.xyz \\
  PRIMARY_USERNAME=<main account> \\
  PRIMARY_PASSWORD=<main password> \\
  SECONDARY_EMAIL_MODE=user-assisted \\
  ARTIFACT_DIR=<absolute path> \\
  QA_PREFIX=qa-prod-<timestamp> \\
  node scripts/prod-regression-runner.mjs

可选参数:
  --preflight  仅执行预检，不启动浏览器或任何 round-trip
  --headless   以 headless 模式启动浏览器（默认 false，推荐本地人工协助时保持可视）
  --help       显示帮助

固定输入契约:
  BASE_URL                默认 https://momichan.xyz
  PRIMARY_USERNAME        必填
  PRIMARY_PASSWORD        必填
  SECONDARY_EMAIL_MODE    必须为 user-assisted
  ARTIFACT_DIR            默认 output/prod-regression/<timestamp>
  QA_PREFIX               默认 qa-prod-<timestamp>

运行时人工协助暂停点:
  - 注册验证码
  - 登录 2FA / 风险验证码（若触发）
  - 验证邮箱链接
  - 忘记密码重置链接
  - Turnstile（若触发）
`)
}

function formatTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('')
}

function normalizeBaseUrl(raw) {
  const url = new URL(raw || DEFAULT_BASE_URL)
  url.hash = ''
  if (url.pathname === '/') {
    url.pathname = ''
  }
  return url.toString().replace(/\/$/, '')
}

function toAbsoluteArtifactDir(input, timestamp) {
  if (input && path.isAbsolute(input)) {
    return path.normalize(input)
  }
  if (input) {
    return path.resolve(input)
  }
  return path.resolve(process.cwd(), 'output', 'prod-regression', timestamp)
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function slugify(value, fallback = 'item') {
  const normalized = String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .toLowerCase()
  return normalized || fallback
}

function truncate(value, max = 140) {
  const text = String(value ?? '')
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 1))}…`
}

function normalizePageText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function maskEmail(email) {
  if (!email) return ''
  const [local, domain] = String(email).split('@')
  if (!local || !domain) return truncate(String(email), 60)
  const visible = local.length <= 2 ? local : local.slice(0, 2)
  return `${visible}***@${domain}`
}

function maskIdentifier(value) {
  if (!value) return ''
  if (String(value).includes('@')) return maskEmail(value)
  const text = String(value)
  if (text.length <= 4) return `${text[0] ?? ''}***`
  return `${text.slice(0, 2)}***${text.slice(-2)}`
}

function sanitizeCode(raw) {
  return String(raw ?? '')
    .replace(/\D/g, '')
    .slice(0, 6)
}

function maskUrl(raw) {
  if (!raw) return ''
  try {
    const url = new URL(raw)
    const paramKeys = [...url.searchParams.keys()]
    return `${url.origin}${url.pathname}${paramKeys.length > 0 ? `?[${paramKeys.join(',')}]` : ''}`
  } catch {
    return truncate(String(raw), 120)
  }
}

function getNestedValue(object, keyPath) {
  return String(keyPath)
    .split('.')
    .reduce(
      (current, segment) => (current && segment in current ? current[segment] : undefined),
      object
    )
}

function loadEnglishLocale() {
  try {
    return JSON.parse(fs.readFileSync(EN_LOCALE_PATH, 'utf8'))
  } catch (error) {
    throw new Error(`无法读取英文语言包: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function buildExpectedTitleFromKey(locale, keyPath) {
  const value = getNestedValue(locale, keyPath)
  if (!value || typeof value !== 'string') return null
  return value === SITE_NAME ? SITE_NAME : `${value} · ${SITE_NAME}`
}

function getManualRunnerRouteName(route) {
  if (route.path === '/favorites') return 'favorites redirect accessible'
  if (route.path === '/profile') return 'profile accessible'
  return `${route.name} accessible`
}

function getManualRunnerPrivateRoutes(locale) {
  return getManualRunnerProtectedRoutes()
    .filter((route) => route.path === '/favorites' || route.path.startsWith('/profile'))
    .map((route) => ({
      name: getManualRunnerRouteName(route),
      path: route.path,
      selector: route.shellSelector,
      expectedFinalPath: route.expectedPath ?? route.path,
      titleKey: route.expectedTitleKey,
      readinessSelectorsAll: route.readinessSelectorsAll,
      readinessSelectorsAny: route.runnerReadinessSelectorsAny,
      expectedTitleExact: route.expectedTitleKey
        ? buildExpectedTitleFromKey(locale, route.expectedTitleKey)
        : null,
    }))
}

function createStrongPassword(label) {
  const token = crypto.randomBytes(6).toString('base64url')
  const base = `${label}Aa!9${token}`
  return base.slice(0, 28)
}

function createState(config) {
  return {
    generatedAt: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    baseUrl: config.baseUrl,
    artifactDir: config.artifactDir,
    checks: [],
    issues: [],
    skips: [],
    cleanup: [],
    notes: [],
    checkpoints: [],
    discoveries: {},
    diagnostics: [],
    lighthouse: {
      status: 'pending',
      outputDir: config.lighthouseDir,
      logFile: config.lighthouseLogFile,
      summaryPath: path.join(config.lighthouseDir, 'summary.json'),
      analysisPath: path.join(config.lighthouseDir, 'analysis.md'),
    },
    qa: {
      emailMasked: null,
      username: null,
      createdDiscussionUrl: null,
      createdDiscussionDeleted: false,
      initialPasswordMasked: null,
      resetPasswordMasked: null,
    },
    config: {
      baseUrl: config.baseUrl,
      artifactDir: config.artifactDir,
      qaPrefix: config.qaPrefix,
      primaryUsernameMasked: maskIdentifier(config.primaryUsername),
      secondaryEmailMode: config.secondaryEmailMode,
      browserMode: config.headless ? 'headless' : 'headed',
    },
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`)
}

function writeText(filePath, text) {
  fs.writeFileSync(filePath, `${text.endsWith('\n') ? text : `${text}\n`}`)
}

function appendText(filePath, text) {
  fs.appendFileSync(filePath, text)
}

function summarizeError(error) {
  if (error instanceof SkipCheckError) {
    return error.reason
  }
  if (error instanceof Error) {
    return error.stack || error.message
  }
  return String(error)
}

function logNote(state, message) {
  state.notes.push(message)
  console.log(`ℹ️  ${message}`)
}

function logCleanup(state, item) {
  state.cleanup.push(item)
}

function recordCheckpoint(state, checkpoint) {
  state.checkpoints.push({
    ...checkpoint,
    at: new Date().toISOString(),
  })
}

async function fetchJson(url, label) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  })

  if (!response.ok) {
    throw new Error(`${label} 请求失败: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

function extractHomeCandidates(homePayload) {
  const featuredItems = homePayload?.data?.featured?.items ?? []
  const trends = homePayload?.data?.trends ?? {}
  const authorFromFeatured =
    featuredItems
      .flatMap((item) => item?.related_authors ?? [])
      .find((author) => author?.deep_link) ?? null
  const authorFromTrends = (trends.authors ?? []).find((author) => author?.deep_link) ?? null
  const scheduleFromTrends =
    (trends.schedules ?? []).find((schedule) => schedule?.deep_link || schedule?.id) ?? null
  const featuredPost =
    featuredItems
      .flatMap((item) => [
        item?.related_posts?.[0] ?? null,
        item?.primary_cta?.target
          ? { id: item.id, deep_link: item.primary_cta.target, title: item.title }
          : null,
      ])
      .find((post) => post?.deep_link || post?.id) ?? null

  const tagCandidate =
    (trends.tags ?? []).find((tag) => typeof tag?.name === 'string' && tag.name.trim()) ?? null

  return {
    featuredItems,
    author: authorFromTrends || authorFromFeatured,
    schedule: scheduleFromTrends,
    post: featuredPost,
    tag: tagCandidate,
  }
}

async function discoverProductionEntities(baseUrl) {
  const homeUrl = new URL('/api/v1/home', baseUrl).toString()
  const discussionUrl = new URL(
    '/api/v1/discussions?page=1&page_size=2&sort=latest',
    baseUrl
  ).toString()
  const homePayload = await fetchJson(homeUrl, 'home API')
  const discussionPayload = await fetchJson(discussionUrl, 'discussions API')
  const candidates = extractHomeCandidates(homePayload)

  const postPath =
    candidates.post?.deep_link ??
    candidates.post?.primary_cta?.target ??
    (candidates.post?.id ? `/post/${candidates.post.id}` : null)

  const authorPath =
    candidates.author?.deep_link ??
    (candidates.author?.id ? `/author/${candidates.author.id}` : null)

  const schedulePath =
    candidates.schedule?.deep_link ??
    (candidates.schedule?.id ? `/schedule/${candidates.schedule.id}` : null)

  const discussions = Array.isArray(discussionPayload?.data) ? discussionPayload.data : []
  const publicDiscussionPath =
    discussions.length > 0 ? `/community/discussions/${discussions[0]?.id ?? ''}` : null
  const discussionAliasPath =
    discussions.length > 0 ? `/discussion/${discussions[0]?.id ?? ''}` : null

  const searchTerms = [
    candidates.post?.title,
    candidates.author?.display_name,
    candidates.author?.username,
    candidates.tag?.name,
    candidates.featuredItems?.[0]?.title,
  ]
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => String(value).trim())

  return {
    post: postPath
      ? {
          id: candidates.post?.id ?? null,
          path: postPath,
          title: candidates.post?.title ?? candidates.featuredItems?.[0]?.title ?? null,
        }
      : null,
    author: authorPath
      ? {
          id: candidates.author?.id ?? null,
          path: authorPath,
          title:
            candidates.author?.display_name ??
            candidates.author?.name ??
            candidates.author?.username ??
            null,
        }
      : null,
    schedule: schedulePath
      ? {
          id: candidates.schedule?.id ?? null,
          path: schedulePath,
          title: candidates.schedule?.title ?? candidates.schedule?.name ?? null,
        }
      : null,
    publicDiscussionPath,
    discussionAliasPath,
    publicDiscussionCount: discussions.length,
    searchTerms,
  }
}

function startLighthouseAudit(config, state) {
  ensureDir(config.lighthouseDir)

  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        path.resolve('scripts', 'lighthouse-prod-full-audit.mjs'),
        '--base',
        config.baseUrl,
        '--output',
        config.lighthouseDir,
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )

    const logPrefix = `[lighthouse] `
    const writeChunk = (chunk) => {
      const text = chunk.toString()
      const lines = text.split(/\r?\n/)
      for (const line of lines) {
        if (!line.trim()) continue
        const prefixed = `${logPrefix}${line}${os.EOL}`
        appendText(config.lighthouseLogFile, prefixed)
        process.stdout.write(prefixed)
      }
      state.lighthouse.lastUpdateAt = new Date().toISOString()
    }

    child.stdout?.on('data', (chunk) => writeChunk(chunk))
    child.stderr?.on('data', (chunk) => writeChunk(chunk))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`lighthouse-prod-full-audit.mjs exited with code ${code}`))
    })
  })
}

function createDiagnosticsCollector(page, origin) {
  const entries = []

  const push = (entry) => {
    entries.push({
      ts: Date.now(),
      pageUrl: page.url(),
      ...entry,
    })
  }

  page.on('console', (message) => {
    push({
      kind: 'console',
      level: message.type(),
      text: message.text(),
      location: message.location(),
    })
  })

  page.on('pageerror', (error) => {
    push({
      kind: 'pageerror',
      level: 'error',
      text: error instanceof Error ? error.stack || error.message : String(error),
    })
  })

  page.on('response', (response) => {
    const url = response.url()
    if (!url.startsWith(origin)) return
    if (!url.includes('/api/')) return

    push({
      kind: 'response',
      status: response.status(),
      method: response.request().method(),
      resourceType: response.request().resourceType(),
      url,
    })
  })

  page.on('requestfailed', (request) => {
    const url = request.url()
    const sameOrigin = url.startsWith(origin)
    const resourceType = request.resourceType()
    if (!sameOrigin && !['document', 'script', 'xhr', 'fetch'].includes(resourceType)) {
      return
    }

    push({
      kind: 'requestfailed',
      level: 'error',
      resourceType,
      url,
      text: request.failure()?.errorText ?? 'request failed',
    })
  })

  return {
    entries,
  }
}

async function captureDiagnosticsWindow(collector, fn, settleMs = 500) {
  const startedAt = Date.now()
  const result = await fn()
  await sleep(settleMs)
  return {
    result,
    diagnostics: collector.entries.filter((entry) => entry.ts >= startedAt),
  }
}

function evaluateDiagnostics(diagnostics) {
  const severe = []
  const warnings = []

  for (const entry of diagnostics) {
    if (entry.kind === 'pageerror') {
      severe.push(`pageerror: ${truncate(entry.text, 240)}`)
      continue
    }

    if (entry.kind === 'requestfailed') {
      severe.push(
        `requestfailed(${entry.resourceType}) ${truncate(new URL(entry.url).pathname, 120)}: ${truncate(entry.text, 120)}`
      )
      continue
    }

    if (entry.kind === 'response') {
      const pathName = new URL(entry.url).pathname
      if (entry.status >= 500) {
        severe.push(`api ${entry.status} ${entry.method} ${pathName}`)
      } else if (entry.status >= 400) {
        warnings.push(`api ${entry.status} ${entry.method} ${pathName}`)
      }
      continue
    }

    if (entry.kind === 'console' && entry.level === 'error') {
      const text = String(entry.text || '')
      if (
        /(TypeError|ReferenceError|SyntaxError|ChunkLoadError|Failed to fetch|Cannot read|Unhandled)/i.test(
          text
        )
      ) {
        severe.push(`console error: ${truncate(text, 240)}`)
      } else {
        warnings.push(`console error: ${truncate(text, 180)}`)
      }
    }
  }

  return {
    severe,
    warnings,
    summary: {
      consoleErrors: diagnostics.filter(
        (entry) => entry.kind === 'console' && entry.level === 'error'
      ).length,
      pageErrors: diagnostics.filter((entry) => entry.kind === 'pageerror').length,
      api4xx: diagnostics.filter(
        (entry) => entry.kind === 'response' && entry.status >= 400 && entry.status < 500
      ).length,
      api5xx: diagnostics.filter((entry) => entry.kind === 'response' && entry.status >= 500)
        .length,
      requestFailed: diagnostics.filter((entry) => entry.kind === 'requestfailed').length,
    },
  }
}

async function createPageHarness(context, origin) {
  const page = await context.newPage()
  page.setDefaultTimeout(20_000)
  page.setDefaultNavigationTimeout(30_000)
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1 })
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' })
  const diagnostics = createDiagnosticsCollector(page, origin)
  return { page, diagnostics }
}

async function closeQuietly(resource) {
  if (!resource) return
  try {
    await resource.close()
  } catch {
    // noop
  }
}

async function waitForRouteIdle(page, selector, timeout = 20_000) {
  await page.waitForSelector(selector, { timeout })
  await page.waitForFunction(
    () => document.readyState === 'complete' || document.readyState === 'interactive',
    {
      timeout,
    }
  )
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 4_000 }).catch(() => {})
}

async function gotoPath(page, baseUrl, target, selector, timeout = 20_000) {
  const absolute = /^https?:\/\//i.test(target) ? target : new URL(target, baseUrl).toString()
  const response = await page.goto(absolute, { waitUntil: 'domcontentloaded' })
  if (selector) {
    await waitForRouteIdle(page, selector, timeout)
  }
  return response
}

async function takeScreenshot(page, screenshotDir, fileBase) {
  const fileName = `${slugify(fileBase)}.png`
  const filePath = path.join(screenshotDir, fileName)
  await page.screenshot({ path: filePath, fullPage: true })
  return filePath
}

async function waitForAllSelectors(page, selectors, timeout = 12_000) {
  const matchedSelectors = []
  for (const selector of selectors ?? []) {
    await page.waitForSelector(selector, { timeout })
    matchedSelectors.push(selector)
  }
  return matchedSelectors
}

async function waitForAnySelector(page, selectors, timeout = 12_000) {
  const candidates = (selectors ?? []).filter(Boolean)
  if (candidates.length === 0) {
    return null
  }

  await page.waitForFunction(
    (selectorList) =>
      selectorList.some((selector) => {
        const element = document.querySelector(selector)
        if (!element) return false
        const styles = window.getComputedStyle(element)
        return styles.display !== 'none' && styles.visibility !== 'hidden'
      }),
    { timeout },
    candidates
  )

  return page.evaluate((selectorList) => {
    return (
      selectorList.find((selector) => {
        const element = document.querySelector(selector)
        if (!element) return false
        const styles = window.getComputedStyle(element)
        return styles.display !== 'none' && styles.visibility !== 'hidden'
      }) ?? null
    )
  }, candidates)
}

function createCheckEntry(meta, state, durationMs, result) {
  const entry = {
    id: `${meta.category}:${slugify(meta.scope)}:${slugify(meta.name)}:${state.checks.length + 1}`,
    category: meta.category,
    scope: meta.scope,
    name: meta.name,
    severity: meta.severity,
    status: result.status,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    durationMs,
    url: result.url ?? meta.url ?? null,
    finalUrl: result.finalUrl ?? null,
    title: result.title ?? null,
    canonical: result.canonical ?? null,
    details: result.details ?? null,
    diagnostics: result.diagnostics ?? null,
    artifacts: result.artifacts ?? [],
    error: result.error ?? null,
  }

  state.checks.push(entry)

  if (entry.status === 'failed') {
    state.issues.push({
      scope: entry.scope,
      name: entry.name,
      severity: entry.severity,
      error: entry.error,
      url: entry.url,
      finalUrl: entry.finalUrl,
      artifacts: entry.artifacts,
    })
  }

  if (entry.status === 'skipped') {
    state.skips.push({
      scope: entry.scope,
      name: entry.name,
      reason: entry.error,
      severity: entry.severity,
      classification: result.skipClassification ?? meta.skipClassification ?? 'coverage-gap',
    })
  }

  return entry
}

async function runCheck(state, meta, fn) {
  const startedAtIso = new Date().toISOString()
  const start = Date.now()
  const label = `[${meta.scope}] ${meta.name}`
  console.log(`\n▶️  ${label}`)

  try {
    const result = (await fn()) ?? {}
    if (result.skipReason) {
      throw new SkipCheckError(
        result.skipReason,
        result.skipClassification ?? meta.skipClassification ?? 'coverage-gap'
      )
    }

    const durationMs = Date.now() - start
    const finishedAtIso = new Date().toISOString()
    const entry = createCheckEntry(meta, state, durationMs, {
      status: 'passed',
      startedAt: startedAtIso,
      finishedAt: finishedAtIso,
      ...result,
    })

    console.log(`✅ ${label} (${durationMs}ms)`)
    return entry
  } catch (error) {
    const durationMs = Date.now() - start
    const finishedAtIso = new Date().toISOString()
    const skip = error instanceof SkipCheckError
    const entry = createCheckEntry(meta, state, durationMs, {
      status: skip ? 'skipped' : 'failed',
      startedAt: startedAtIso,
      finishedAt: finishedAtIso,
      error: skip ? error.reason : summarizeError(error),
      artifacts: [],
      skipClassification: skip ? error.classification : null,
    })

    console.log(`${skip ? '⏭️' : '❌'} ${label} (${durationMs}ms)`)
    if (!skip) {
      console.error(entry.error)
    }
    return entry
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function readCanonical(page) {
  return page.$eval('link[rel="canonical"]', (element) => element.getAttribute('href') || '')
}

async function isVisible(page, selector) {
  const handle = await page.$(selector)
  if (!handle) return false
  const box = await handle.boundingBox()
  return Boolean(box)
}

async function promptLine(rl, question, { allowEmpty = false } = {}) {
  while (true) {
    const answer = (await rl.question(question)).trim()
    if (answer || allowEmpty) {
      return answer
    }
  }
}

async function waitForEnter(rl, message) {
  await rl.question(`${message}${os.EOL}按 Enter 继续...`)
}

async function promptForCode(rl, state, promptMessage, checkpointType) {
  while (true) {
    const answer = sanitizeCode(await promptLine(rl, `${promptMessage}${os.EOL}> `))
    if (answer.length === 6) {
      recordCheckpoint(state, {
        type: checkpointType,
        prompt: promptMessage,
        responseMasked: '******',
      })
      return answer
    }
    console.log('请输入 6 位数字验证码。')
  }
}

async function promptForUrl(rl, state, promptMessage, checkpointType) {
  while (true) {
    const raw = (await promptLine(rl, `${promptMessage}${os.EOL}> `)).replace(/^<|>$/g, '')
    try {
      const url = new URL(raw)
      recordCheckpoint(state, {
        type: checkpointType,
        prompt: promptMessage,
        responseMasked: maskUrl(url.toString()),
      })
      return url.toString()
    } catch {
      console.log('请输入完整 URL（需包含 http/https）。')
    }
  }
}

async function promptForQaEmail(rl, state) {
  while (true) {
    const email = await promptLine(
      rl,
      `请输入临时 QA 邮箱（用于注册/验证邮箱/忘记密码）${os.EOL}> `
    )
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      recordCheckpoint(state, {
        type: CHECKPOINT_TYPES.qaEmail,
        prompt: 'QA email provided',
        responseMasked: maskEmail(email),
      })
      return email
    }
    console.log('邮箱格式无效，请重试。')
  }
}

async function handleTurnstileIfNeeded(page, rl, state, scopeLabel) {
  if (!(await isVisible(page, '.turnstile-block'))) {
    return false
  }

  const screenshotPath = await takeScreenshot(
    page,
    state._paths.screenshots,
    `${scopeLabel}-turnstile`
  )
  console.log(`⚠️  检测到 Turnstile: ${screenshotPath}`)
  await waitForEnter(rl, `请在浏览器中完成 ${scopeLabel} 的 Turnstile/人机验证。`)
  recordCheckpoint(state, {
    type: CHECKPOINT_TYPES.turnstile,
    prompt: scopeLabel,
    responseMasked: 'user-completed',
  })
  return true
}

async function fillOtpInputs(page, selector, code) {
  const inputs = await page.$$(selector)
  assert(inputs.length >= code.length, `OTP 输入框数量不足: ${selector}`)
  for (let index = 0; index < code.length; index += 1) {
    await inputs[index].click({ clickCount: 3 })
    await inputs[index].type(code[index], { delay: 25 })
  }
}

async function maybeHandleLoginChallenges(page, rl, state, scopeLabel) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await sleep(400)

    if (await isVisible(page, '#twoFactorCode')) {
      const code = await promptForCode(
        rl,
        state,
        `检测到 ${scopeLabel} 需要 2FA 验证码，请输入 6 位验证码`,
        CHECKPOINT_TYPES.login2fa
      )
      await page.click('#twoFactorCode', { clickCount: 3 })
      await page.type('#twoFactorCode', code, { delay: 25 })
      const verifyButton = await page.$('.auth-form button')
      assert(verifyButton, '未找到 2FA 验证按钮')
      await verifyButton.click()
      continue
    }

    if (await isVisible(page, '#riskVerificationCode')) {
      const code = await promptForCode(
        rl,
        state,
        `检测到 ${scopeLabel} 需要邮箱风险验证码，请输入 6 位验证码`,
        CHECKPOINT_TYPES.loginRisk
      )
      await page.click('#riskVerificationCode', { clickCount: 3 })
      await page.type('#riskVerificationCode', code, { delay: 25 })
      const verifyButton = await page.$('.auth-form button')
      assert(verifyButton, '未找到风险验证按钮')
      await verifyButton.click()
      continue
    }

    if (await handleTurnstileIfNeeded(page, rl, state, `${scopeLabel}-login`)) {
      const submitButton = await page.$(
        'form.auth-form button[type="submit"], form.auth-form button'
      )
      if (submitButton) {
        await submitButton.click().catch(() => {})
      }
      continue
    }

    return
  }
}

async function waitForPath(page, predicate, timeoutMs = 20_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const current = new URL(page.url())
    if (predicate(current)) {
      return current
    }
    await sleep(200)
  }
  throw new Error(`等待路径变化超时，当前: ${page.url()}`)
}

async function loginViaUi(page, rl, state, credentials, { expectedPath, label }) {
  await page.waitForSelector('#usernameOrEmail')
  await page.click('#usernameOrEmail', { clickCount: 3 })
  await page.type('#usernameOrEmail', credentials.username, { delay: 20 })
  await page.click('#password', { clickCount: 3 })
  await page.type('#password', credentials.password, { delay: 20 })

  await handleTurnstileIfNeeded(page, rl, state, `${label}-pre-submit`)

  const [submitButton] = await page.$$(
    'form.auth-form button[type="submit"], form.auth-form button'
  )
  assert(submitButton, '未找到登录提交按钮')
  await submitButton.click()

  await maybeHandleLoginChallenges(page, rl, state, label)

  await waitForPath(
    page,
    (url) => url.pathname !== '/login' && !url.pathname.startsWith('/login/'),
    25_000
  )

  if (expectedPath) {
    await waitForPath(page, (url) => url.pathname === expectedPath, 20_000)
  }

  await page.waitForNetworkIdle({ idleTime: 500, timeout: 4_000 }).catch(() => {})
}

async function logoutViaNavbar(page) {
  await page.waitForSelector('.nav-user-btn', { timeout: 15_000 })
  await page.click('.nav-user-btn')
  await page.waitForSelector('.user-dropdown .dropdown-link--danger', { timeout: 10_000 })
  await page.click('.user-dropdown .dropdown-link--danger')
  await waitForPath(page, (url) => url.pathname === '/login' || url.pathname === '/', 20_000).catch(
    async () => {
      await page.waitForSelector('.login-btn', { timeout: 10_000 })
    }
  )
}

async function prepareRouteEvidence(page, expected) {
  const finalUrl = page.url()
  const finalUrlObject = new URL(finalUrl)
  const canonical = await readCanonical(page)
  const title = await page.title()
  const pageText = normalizePageText(
    await page.evaluate(() => document.body?.innerText || document.documentElement?.innerText || '')
  )

  if (expected.expectedFinalPath) {
    assert(
      finalUrlObject.pathname === expected.expectedFinalPath,
      `最终路径不匹配，期望 ${expected.expectedFinalPath}，实际 ${finalUrlObject.pathname}`
    )
  }

  const expectedCanonical =
    expected.expectedCanonicalPath !== undefined
      ? new URL(expected.expectedCanonicalPath, expected.baseUrl).toString()
      : new URL(finalUrlObject.pathname, expected.baseUrl).toString()

  assert(
    canonical === expectedCanonical,
    `canonical 不匹配，期望 ${expectedCanonical}，实际 ${canonical}`
  )

  if (expected.expectedTitleExact) {
    assert(
      title === expected.expectedTitleExact,
      `title 不匹配，期望 "${expected.expectedTitleExact}"，实际 "${title}"`
    )
  }

  if (expected.expectedTitleIncludes?.length) {
    for (const part of expected.expectedTitleIncludes) {
      assert(title.includes(part), `title 未包含 "${part}"，实际 "${title}"`)
    }
  }

  if (expected.expectedTextIncludes?.length) {
    for (const part of expected.expectedTextIncludes) {
      assert(pageText.includes(part), `页面内容未包含 "${part}"`)
    }
  }

  if (expected.forbiddenTextIncludes?.length) {
    for (const part of expected.forbiddenTextIncludes) {
      assert(!pageText.includes(part), `页面内容不应包含 "${part}"`)
    }
  }

  return {
    finalUrl,
    title,
    canonical,
  }
}

function summarizeDiagnosticsForCheck(diagnostics) {
  const evaluation = evaluateDiagnostics(diagnostics)
  return {
    ...evaluation.summary,
    severeMessages: evaluation.severe,
    warningMessages: evaluation.warnings,
  }
}

function assertNoSevereDiagnostics(diagnostics, label) {
  const evaluation = evaluateDiagnostics(diagnostics)
  if (evaluation.severe.length > 0) {
    throw new Error(`${label} 发现阻断级诊断信号:\n- ${evaluation.severe.join('\n- ')}`)
  }
  return evaluation
}

async function verifyRoute({
  state,
  harness,
  meta,
  baseUrl,
  pathOrUrl,
  selector,
  readinessSelectorsAll = [],
  readinessSelectorsAny = [],
  expectedFinalPath,
  expectedCanonicalPath,
  expectedTitleExact,
  expectedTitleIncludes,
  expectedTextIncludes,
  forbiddenTextIncludes,
  expectedCacheControlIncludes,
  captureScreenshot = false,
}) {
  return runCheck(state, meta, async () => {
    const { result: navigationResponse, diagnostics } = await captureDiagnosticsWindow(
      harness.diagnostics,
      async () => {
        return gotoPath(harness.page, baseUrl, pathOrUrl, selector)
      }
    )

    const responseHeaders =
      navigationResponse && typeof navigationResponse.headers === 'function'
        ? navigationResponse.headers()
        : {}

    if (expectedCacheControlIncludes?.length) {
      const cacheControl = String(
        responseHeaders['cache-control'] ?? responseHeaders['Cache-Control'] ?? ''
      )
      assert(cacheControl.length > 0, '未读取到主文档 Cache-Control 响应头')
      for (const part of expectedCacheControlIncludes) {
        assert(
          cacheControl.toLowerCase().includes(String(part).toLowerCase()),
          `Cache-Control 未包含 "${part}"，实际 "${cacheControl}"`
        )
      }
    }

    const evidence = await prepareRouteEvidence(harness.page, {
      baseUrl,
      expectedFinalPath,
      expectedCanonicalPath,
      expectedTitleExact,
      expectedTitleIncludes,
      expectedTextIncludes,
      forbiddenTextIncludes,
    })
    const readinessAllMatched = await waitForAllSelectors(harness.page, readinessSelectorsAll)
    const readinessAnyMatched = await waitForAnySelector(harness.page, readinessSelectorsAny)

    const diagnosticSummary = summarizeDiagnosticsForCheck(diagnostics)
    assertNoSevereDiagnostics(diagnostics, meta.name)

    const artifacts = []
    if (captureScreenshot) {
      artifacts.push(
        await takeScreenshot(harness.page, state._paths.screenshots, `${meta.scope}-${meta.name}`)
      )
    }

    state.diagnostics.push(
      ...diagnostics.map((entry) => ({
        ...entry,
        scope: meta.scope,
        checkName: meta.name,
      }))
    )

    return {
      ...evidence,
      diagnostics: diagnosticSummary,
      artifacts,
      details: {
        selector,
        readinessSelectorsAll: readinessAllMatched,
        readinessSelectorMatched: readinessAnyMatched,
        cacheControl: responseHeaders['cache-control'] ?? responseHeaders['Cache-Control'] ?? null,
      },
    }
  })
}

async function verifyProtectedGuard(state, harness, baseUrl, routePath) {
  const targetUrl = new URL(routePath, baseUrl).toString()
  return runCheck(
    state,
    {
      category: 'auth',
      scope: 'main-account',
      name: `unauth guard ${routePath}`,
      severity: 'P1',
      url: targetUrl,
    },
    async () => {
      const { diagnostics } = await captureDiagnosticsWindow(harness.diagnostics, async () => {
        await gotoPath(harness.page, baseUrl, routePath, '.auth-page--login')
      })
      const currentUrl = new URL(harness.page.url())
      assert(
        currentUrl.pathname === '/login',
        `未登录访问 ${routePath} 未跳到 /login，实际 ${currentUrl.pathname}`
      )
      const redirect = currentUrl.searchParams.get('redirect')
      assert(redirect === routePath, `redirect 参数不匹配，期望 ${routePath}，实际 ${redirect}`)
      assertNoSevereDiagnostics(diagnostics, `guard ${routePath}`)

      state.diagnostics.push(
        ...diagnostics.map((entry) => ({
          ...entry,
          scope: 'main-account',
          checkName: `unauth guard ${routePath}`,
        }))
      )

      return {
        finalUrl: harness.page.url(),
        title: await harness.page.title(),
        canonical: await readCanonical(harness.page),
        diagnostics: summarizeDiagnosticsForCheck(diagnostics),
      }
    }
  )
}

async function verifyGuestOnlyRedirect(state, harness, baseUrl, routePath) {
  return runCheck(
    state,
    {
      category: 'auth',
      scope: 'main-account',
      name: `guest-only redirect ${routePath}`,
      severity: 'P1',
      url: new URL(routePath, baseUrl).toString(),
    },
    async () => {
      const { diagnostics } = await captureDiagnosticsWindow(harness.diagnostics, async () => {
        await gotoPath(harness.page, baseUrl, routePath, '.home-page')
      })

      const currentUrl = new URL(harness.page.url())
      assert(
        currentUrl.pathname !== routePath,
        `登录态访问 ${routePath} 不应停留在 guest-only 页面`
      )
      assertNoSevereDiagnostics(diagnostics, `guest-only redirect ${routePath}`)

      state.diagnostics.push(
        ...diagnostics.map((entry) => ({
          ...entry,
          scope: 'main-account',
          checkName: `guest-only redirect ${routePath}`,
        }))
      )

      return {
        finalUrl: harness.page.url(),
        title: await harness.page.title(),
        canonical: await readCanonical(harness.page),
        diagnostics: summarizeDiagnosticsForCheck(diagnostics),
      }
    }
  )
}

async function setInputValue(page, selector, value) {
  await page.waitForSelector(selector)
  await page.click(selector, { clickCount: 3 })
  await page.keyboard.press('Backspace').catch(() => {})
  await page.type(selector, value, { delay: 20 })
}

async function getCurrentDeviceState(page) {
  await page.waitForSelector('.device-card.is-current', { timeout: 20_000 })

  const name = await page.$eval('.device-card.is-current .device-name-display h3', (element) => {
    const textNodes = [...element.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    return textNodes || element.textContent?.replace(/\s+/g, ' ').trim() || ''
  })

  const trusted = await page.$eval('.device-card.is-current .btn-trust', (element) =>
    element.classList.contains('trusted')
  )

  return {
    name,
    trusted,
  }
}

async function renameCurrentDevice(page, nextName) {
  const currentCard = await page.$('.device-card.is-current')
  assert(currentCard, '未找到当前设备卡片')
  const editButton = await currentCard.$('.btn-edit')
  assert(editButton, '未找到设备编辑按钮')
  await editButton.click()
  const input = await currentCard.$('.device-name-input')
  assert(input, '未找到设备名输入框')
  await input.click({ clickCount: 3 })
  await input.type(nextName, { delay: 20 })
  const saveButton = await currentCard.$('.btn-icon[aria-label="Save"]')
  assert(saveButton, '未找到设备名保存按钮')
  await saveButton.click()
  await page.waitForFunction(
    (expected) => {
      const heading = document.querySelector('.device-card.is-current .device-name-display h3')
      if (!heading) return false
      const textNodes = [...heading.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent || '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      return textNodes === expected
    },
    { timeout: 15_000 },
    nextName
  )
}

async function toggleCurrentDeviceTrust(page, expectedState) {
  await page.waitForSelector('.device-card.is-current .btn-trust')
  await page.click('.device-card.is-current .btn-trust')
  await page.waitForFunction(
    (expected) => {
      const button = document.querySelector('.device-card.is-current .btn-trust')
      return Boolean(button && button.classList.contains('trusted') === expected)
    },
    { timeout: 15_000 },
    expectedState
  )
}

async function runSearchFlow(state, harness, baseUrl, discoveredPostPath, searchTerms) {
  const candidates = searchTerms.filter(Boolean)
  if (candidates.length === 0) {
    return runCheck(
      state,
      {
        category: 'route',
        scope: 'public',
        name: 'search flow',
        severity: 'P1',
      },
      async () => ({
        skipReason: '未发现可用搜索词',
      })
    )
  }

  return runCheck(
    state,
    {
      category: 'route',
      scope: 'public',
      name: 'search flow',
      severity: 'P1',
      url: new URL('/search', baseUrl).toString(),
    },
    async () => {
      let finalEvidence = null
      let diagnosticsForReport = null
      let selectedTerm = null
      let resultKind = null

      for (const term of candidates) {
        const { diagnostics } = await captureDiagnosticsWindow(harness.diagnostics, async () => {
          await gotoPath(harness.page, baseUrl, '/search', '.search-page')
          await setInputValue(harness.page, '.search-input', term)
          await harness.page.keyboard.press('Enter')
          await harness.page
            .waitForFunction(
              (expectedTerm) =>
                window.location.pathname === '/search' &&
                window.location.search.includes(`q=${encodeURIComponent(expectedTerm)}`),
              { timeout: 15_000 },
              term
            )
            .catch(() => {})
          await harness.page.waitForNetworkIdle({ idleTime: 500, timeout: 4_000 }).catch(() => {})
        })

        const foundPost = await harness.page.$('.posts-masonry .post-card')
        const foundAuthor = await harness.page.$('.authors-grid .author-card')

        if (!foundPost && !foundAuthor) {
          continue
        }

        selectedTerm = term
        diagnosticsForReport = diagnostics
        if (foundPost) {
          resultKind = 'post'
          await foundPost.click()
          await waitForRouteIdle(harness.page, '.post-detail-page')
          const current = new URL(harness.page.url())
          assert(
            current.pathname.startsWith('/post/'),
            `搜索结果未打开 post 详情，实际 ${current.pathname}`
          )
          if (discoveredPostPath) {
            assert(
              current.pathname === discoveredPostPath,
              `搜索打开的 post 与发现样本不一致，期望 ${discoveredPostPath}，实际 ${current.pathname}`
            )
          }
        } else if (foundAuthor) {
          resultKind = 'author'
          await foundAuthor.click()
          await waitForRouteIdle(harness.page, '.author-detail-page')
          const current = new URL(harness.page.url())
          assert(
            current.pathname.startsWith('/author/'),
            `搜索结果未打开 author 详情，实际 ${current.pathname}`
          )
        }

        finalEvidence = {
          finalUrl: harness.page.url(),
          title: await harness.page.title(),
          canonical: await readCanonical(harness.page),
        }
        break
      }

      assert(finalEvidence, '所有搜索词都未产生可点击结果')
      assertNoSevereDiagnostics(diagnosticsForReport ?? [], 'search flow')

      const screenshot = await takeScreenshot(
        harness.page,
        state._paths.screenshots,
        'public-search-result'
      )
      state.diagnostics.push(
        ...(diagnosticsForReport ?? []).map((entry) => ({
          ...entry,
          scope: 'public',
          checkName: 'search flow',
        }))
      )

      return {
        ...finalEvidence,
        artifacts: [screenshot],
        diagnostics: summarizeDiagnosticsForCheck(diagnosticsForReport ?? []),
        details: {
          searchTerm: selectedTerm,
          resultKind,
        },
      }
    }
  )
}

async function verifyInvalidRouteFallback(state, harness, baseUrl) {
  return verifyRoute({
    state,
    harness,
    meta: {
      category: 'route',
      scope: 'public',
      name: '404 route fallback',
      severity: 'P1',
      url: new URL('/__prod-regression_missing__', baseUrl).toString(),
    },
    baseUrl,
    pathOrUrl: '/__prod-regression_missing__',
    selector: '.not-found-page',
    expectedFinalPath: '/__prod-regression_missing__',
    expectedCanonicalPath: '/__prod-regression_missing__',
    expectedTitleExact: `${getNestedValue(state._locale, 'error.notFound')} · ${SITE_NAME}`,
  })
}

async function verifyInvalidPostFallback(state, harness, baseUrl) {
  return verifyRoute({
    state,
    harness,
    meta: {
      category: 'route',
      scope: 'public',
      name: 'invalid post param fallback',
      severity: 'P1',
      url: new URL('/post/not-a-valid-id', baseUrl).toString(),
    },
    baseUrl,
    pathOrUrl: '/post/not-a-valid-id',
    selector: '.not-found-page',
    expectedFinalPath: '/post/not-a-valid-id',
    expectedCanonicalPath: '/post/not-a-valid-id',
    expectedTitleExact: `${getNestedValue(state._locale, 'error.notFound')} · ${SITE_NAME}`,
  })
}

async function runPublicRegression(state, harness, config, discovered) {
  const staticRoutes = [
    {
      name: 'home',
      path: '/',
      selector: '.home-page',
      expectedFinalPath: '/',
      titleKey: 'nav.home',
      screenshot: true,
    },
    {
      name: 'explore',
      path: '/explore',
      selector: '.explore-page',
      expectedFinalPath: '/explore',
      titleKey: 'nav.explore',
    },
    {
      name: 'search page',
      path: '/search',
      selector: '.search-page',
      expectedFinalPath: '/search',
      titleKey: 'nav.search',
    },
    {
      name: 'authors page',
      path: '/authors',
      selector: '.authors-page',
      expectedFinalPath: '/authors',
      titleKey: 'nav.authors',
    },
    {
      name: 'community page',
      path: '/community',
      selector: '.community-page',
      expectedFinalPath: '/community',
      titleKey: 'community.title',
    },
    {
      name: 'schedule page',
      path: '/schedule',
      selector: '.schedule-page',
      expectedFinalPath: '/schedule',
      titleKey: 'nav.schedule',
    },
    {
      name: 'about',
      path: '/about',
      selector: '.about-page',
      expectedFinalPath: '/about',
      titleKey: 'nav.about',
    },
    {
      name: 'contact',
      path: '/contact',
      selector: '.contact-page',
      expectedFinalPath: '/contact',
      titleKey: 'nav.contact',
    },
    {
      name: 'login',
      path: '/login',
      selector: '.auth-page--login',
      expectedFinalPath: '/login',
      titleKey: 'nav.login',
      expectedTextIncludes: [
        getNestedValue(state._locale, 'auth.loginButton'),
        getNestedValue(state._locale, 'auth.googleLoginButton'),
      ].filter(Boolean),
      forbiddenTextIncludes: RETIRED_AUTH_PAGE_TERMS,
      expectedCacheControlIncludes: ['no-store'],
      screenshot: true,
    },
    {
      name: 'register',
      path: '/register',
      selector: '.auth-page--register',
      expectedFinalPath: '/register',
      titleKey: 'nav.register',
      expectedCacheControlIncludes: ['no-store'],
    },
    {
      name: 'forgot password',
      path: '/forgot-password',
      selector: '.auth-page--forgot',
      expectedFinalPath: '/forgot-password',
      titleKey: 'email.forgotPasswordTitle',
      expectedCacheControlIncludes: ['no-store'],
    },
    {
      name: 'reset password',
      path: '/reset-password',
      selector: '.auth-page',
      expectedFinalPath: '/reset-password',
      titleKey: 'email.resetPasswordTitle',
      expectedCacheControlIncludes: ['no-store'],
    },
    {
      name: 'verify email',
      path: '/verify-email',
      selector: '.auth-page',
      expectedFinalPath: '/verify-email',
      titleKey: 'email.verifyTitle',
      expectedCacheControlIncludes: ['no-store'],
    },
  ]

  for (const route of staticRoutes) {
    await verifyRoute({
      state,
      harness,
      meta: {
        category: 'route',
        scope: 'public',
        name: route.name,
        severity: 'P1',
        url: new URL(route.path, config.baseUrl).toString(),
      },
      baseUrl: config.baseUrl,
      pathOrUrl: route.path,
      selector: route.selector,
      expectedFinalPath: route.expectedFinalPath,
      expectedCanonicalPath: route.expectedFinalPath,
      expectedTitleExact: buildExpectedTitleFromKey(state._locale, route.titleKey),
      expectedTextIncludes: route.expectedTextIncludes,
      forbiddenTextIncludes: route.forbiddenTextIncludes,
      expectedCacheControlIncludes: route.expectedCacheControlIncludes,
      captureScreenshot: route.screenshot,
    })
  }

  if (!discovered.author?.path) {
    await runCheck(
      state,
      {
        category: 'route',
        scope: 'public',
        name: 'author detail',
        severity: 'P1',
      },
      async () => ({ skipReason: '生产公开面未发现 author 样本' })
    )
  } else {
    await verifyRoute({
      state,
      harness,
      meta: {
        category: 'route',
        scope: 'public',
        name: 'author detail',
        severity: 'P1',
        url: new URL(discovered.author.path, config.baseUrl).toString(),
      },
      baseUrl: config.baseUrl,
      pathOrUrl: discovered.author.path,
      selector: '.author-detail-page',
      expectedFinalPath: discovered.author.path,
      expectedCanonicalPath: discovered.author.path,
      expectedTitleIncludes: [discovered.author.title ?? SITE_NAME, SITE_NAME],
    })
  }

  if (!discovered.schedule?.path) {
    await runCheck(
      state,
      {
        category: 'route',
        scope: 'public',
        name: 'schedule detail',
        severity: 'P1',
      },
      async () => ({ skipReason: '生产公开面未发现 schedule 样本' })
    )
  } else {
    await verifyRoute({
      state,
      harness,
      meta: {
        category: 'route',
        scope: 'public',
        name: 'schedule detail',
        severity: 'P1',
        url: new URL(discovered.schedule.path, config.baseUrl).toString(),
      },
      baseUrl: config.baseUrl,
      pathOrUrl: discovered.schedule.path,
      selector: '.schedule-page',
      expectedFinalPath: discovered.schedule.path,
      expectedCanonicalPath: discovered.schedule.path,
      expectedTitleIncludes: [discovered.schedule.title ?? SITE_NAME, SITE_NAME],
    })
  }

  if (!discovered.post?.path) {
    await runCheck(
      state,
      {
        category: 'route',
        scope: 'public',
        name: 'public post detail',
        severity: 'P1',
      },
      async () => ({ skipReason: '生产公开面未发现 post 样本' })
    )
  } else {
    await verifyRoute({
      state,
      harness,
      meta: {
        category: 'route',
        scope: 'public',
        name: 'public post detail',
        severity: 'P1',
        url: new URL(discovered.post.path, config.baseUrl).toString(),
      },
      baseUrl: config.baseUrl,
      pathOrUrl: discovered.post.path,
      selector: '.post-detail-page',
      expectedFinalPath: discovered.post.path,
      expectedCanonicalPath: discovered.post.path,
      expectedTitleIncludes: [discovered.post.title ?? SITE_NAME, SITE_NAME],
    })
  }

  if (!discovered.publicDiscussionPath) {
    await runCheck(
      state,
      {
        category: 'route',
        scope: 'public',
        name: 'public discussion detail',
        severity: 'P2',
      },
      async () => ({
        skipReason:
          '生产公开 discussions 为空，已改为验证 community empty-state / empty collection',
      })
    )
  } else {
    await verifyRoute({
      state,
      harness,
      meta: {
        category: 'route',
        scope: 'public',
        name: 'public discussion detail',
        severity: 'P1',
        url: new URL(discovered.publicDiscussionPath, config.baseUrl).toString(),
      },
      baseUrl: config.baseUrl,
      pathOrUrl: discovered.publicDiscussionPath,
      selector: '.discussion-detail-page',
      expectedFinalPath: discovered.publicDiscussionPath,
      expectedCanonicalPath: discovered.publicDiscussionPath,
      expectedTitleExact: `${getNestedValue(state._locale, 'community.recentDiscussions')} · ${SITE_NAME}`,
    })

    if (discovered.discussionAliasPath) {
      await verifyRoute({
        state,
        harness,
        meta: {
          category: 'route',
          scope: 'public',
          name: 'discussion alias redirect',
          severity: 'P2',
          url: new URL(discovered.discussionAliasPath, config.baseUrl).toString(),
        },
        baseUrl: config.baseUrl,
        pathOrUrl: discovered.discussionAliasPath,
        selector: '.discussion-detail-page',
        expectedFinalPath: discovered.publicDiscussionPath,
        expectedCanonicalPath: discovered.publicDiscussionPath,
        expectedTitleExact: `${getNestedValue(state._locale, 'community.recentDiscussions')} · ${SITE_NAME}`,
      })
    }
  }

  await runSearchFlow(
    state,
    harness,
    config.baseUrl,
    discovered.post?.path ?? null,
    discovered.searchTerms
  )
  await verifyInvalidRouteFallback(state, harness, config.baseUrl)
  await verifyInvalidPostFallback(state, harness, config.baseUrl)
}

async function runMainAccountRegression(state, harness, config) {
  const protectedRoutes = [
    '/favorites',
    '/profile',
    '/profile/favorites',
    '/profile/comments',
    '/profile/likes',
    '/profile/comment-favorites',
    '/profile/history',
    '/profile/reports',
    '/profile/security-activity',
    '/profile/followers',
    '/profile/following',
    '/profile/blocked',
    '/profile/settings',
    '/profile/notifications',
    '/profile/devices',
  ]
  for (const routePath of protectedRoutes) {
    await verifyProtectedGuard(state, harness, config.baseUrl, routePath)
  }

  const loginEntry = await runCheck(
    state,
    {
      category: 'auth',
      scope: 'main-account',
      name: 'login redirect-back',
      severity: 'P0',
      url: new URL('/profile/devices', config.baseUrl).toString(),
    },
    async () => {
      const { diagnostics } = await captureDiagnosticsWindow(harness.diagnostics, async () => {
        await gotoPath(harness.page, config.baseUrl, '/profile/devices', '.auth-page--login')
        await loginViaUi(
          harness.page,
          state._rl,
          state,
          {
            username: config.primaryUsername,
            password: config.primaryPassword,
          },
          {
            expectedPath: '/profile/devices',
            label: 'main-account',
          }
        )
        await waitForRouteIdle(harness.page, '.devices-page')
      })

      assertNoSevereDiagnostics(diagnostics, 'main login redirect-back')
      const screenshot = await takeScreenshot(
        harness.page,
        state._paths.screenshots,
        'main-devices-after-login'
      )
      state.diagnostics.push(
        ...diagnostics.map((entry) => ({
          ...entry,
          scope: 'main-account',
          checkName: 'login redirect-back',
        }))
      )

      return {
        finalUrl: harness.page.url(),
        title: await harness.page.title(),
        canonical: await readCanonical(harness.page),
        diagnostics: summarizeDiagnosticsForCheck(diagnostics),
        artifacts: [screenshot],
      }
    }
  )

  if (loginEntry.status !== 'passed') {
    const dependentChecks = [
      'guest-only redirect /login',
      'guest-only redirect /register',
      'favorites redirect accessible',
      'profile accessible',
      'profile comments accessible',
      'profile likes accessible',
      'profile comment favorites accessible',
      'profile history accessible',
      'profile reports accessible',
      'profile security activity accessible',
      'profile followers accessible',
      'profile following accessible',
      'profile blocked accessible',
      'profile settings accessible',
      'profile notifications accessible',
      'profile devices accessible',
      'profile settings reload',
      'current device rename round-trip',
      'current device trust toggle restore',
      'logout/login loop',
    ]

    for (const checkName of dependentChecks) {
      await runCheck(
        state,
        {
          category: 'auth',
          scope: 'main-account',
          name: checkName,
          severity: 'P2',
          skipClassification: 'dependency',
        },
        async () => ({ skipReason: '主账号登录失败，依赖项跳过', skipClassification: 'dependency' })
      )
    }
    return
  }

  await verifyGuestOnlyRedirect(state, harness, config.baseUrl, '/login')
  await verifyGuestOnlyRedirect(state, harness, config.baseUrl, '/register')

  const privateRoutes = getManualRunnerPrivateRoutes(state._locale)

  for (const route of privateRoutes) {
    await verifyRoute({
      state,
      harness,
      meta: {
        category: 'route',
        scope: 'main-account',
        name: route.name,
        severity: 'P1',
        url: new URL(route.path, config.baseUrl).toString(),
      },
      baseUrl: config.baseUrl,
      pathOrUrl: route.path,
      selector: route.selector,
      readinessSelectorsAll: route.readinessSelectorsAll,
      readinessSelectorsAny: route.readinessSelectorsAny,
      expectedFinalPath: route.expectedFinalPath ?? route.path,
      expectedCanonicalPath: route.expectedFinalPath ?? route.path,
      expectedTitleExact: route.expectedTitleExact,
    })
  }

  await runCheck(
    state,
    {
      category: 'flow',
      scope: 'main-account',
      name: 'profile settings reload',
      severity: 'P2',
      url: new URL('/profile/settings', config.baseUrl).toString(),
    },
    async () => {
      const { diagnostics } = await captureDiagnosticsWindow(harness.diagnostics, async () => {
        await gotoPath(harness.page, config.baseUrl, '/profile/settings', '.settings-page')
        await harness.page.reload({ waitUntil: 'domcontentloaded' })
        await waitForRouteIdle(harness.page, '.settings-page')
      })
      assertNoSevereDiagnostics(diagnostics, 'profile settings reload')

      state.diagnostics.push(
        ...diagnostics.map((entry) => ({
          ...entry,
          scope: 'main-account',
          checkName: 'profile settings reload',
        }))
      )

      return {
        finalUrl: harness.page.url(),
        title: await harness.page.title(),
        canonical: await readCanonical(harness.page),
        diagnostics: summarizeDiagnosticsForCheck(diagnostics),
      }
    }
  )

  await runCheck(
    state,
    {
      category: 'flow',
      scope: 'main-account',
      name: 'current device rename round-trip',
      severity: 'P2',
      url: new URL('/profile/devices', config.baseUrl).toString(),
    },
    async () => {
      await gotoPath(harness.page, config.baseUrl, '/profile/devices', '.devices-page')
      const original = await getCurrentDeviceState(harness.page)
      const renamed = truncate(`${config.qaPrefix}-device`, 32)
      const artifacts = [
        await takeScreenshot(harness.page, state._paths.screenshots, 'main-device-rename-before'),
      ]

      const { diagnostics } = await captureDiagnosticsWindow(harness.diagnostics, async () => {
        await renameCurrentDevice(harness.page, renamed)
        await harness.page.reload({ waitUntil: 'domcontentloaded' })
        await waitForRouteIdle(harness.page, '.devices-page')
        const afterRename = await getCurrentDeviceState(harness.page)
        assert(
          afterRename.name === renamed,
          `设备名未持久化，期望 ${renamed}，实际 ${afterRename.name}`
        )
        artifacts.push(
          await takeScreenshot(harness.page, state._paths.screenshots, 'main-device-rename-after')
        )

        await renameCurrentDevice(harness.page, original.name)
        await harness.page.reload({ waitUntil: 'domcontentloaded' })
        await waitForRouteIdle(harness.page, '.devices-page')
        const restored = await getCurrentDeviceState(harness.page)
        assert(
          restored.name === original.name,
          `设备名未恢复，期望 ${original.name}，实际 ${restored.name}`
        )
        artifacts.push(
          await takeScreenshot(
            harness.page,
            state._paths.screenshots,
            'main-device-rename-restored'
          )
        )
      })

      assertNoSevereDiagnostics(diagnostics, 'current device rename round-trip')
      logCleanup(state, {
        scope: 'main-account',
        item: 'device name',
        restored: true,
        value: original.name,
      })
      state.diagnostics.push(
        ...diagnostics.map((entry) => ({
          ...entry,
          scope: 'main-account',
          checkName: 'current device rename round-trip',
        }))
      )

      return {
        finalUrl: harness.page.url(),
        title: await harness.page.title(),
        canonical: await readCanonical(harness.page),
        diagnostics: summarizeDiagnosticsForCheck(diagnostics),
        artifacts,
        details: {
          originalName: truncate(original.name, 40),
          temporaryName: renamed,
        },
      }
    }
  )

  await runCheck(
    state,
    {
      category: 'flow',
      scope: 'main-account',
      name: 'current device trust toggle restore',
      severity: 'P2',
      url: new URL('/profile/devices', config.baseUrl).toString(),
    },
    async () => {
      await gotoPath(harness.page, config.baseUrl, '/profile/devices', '.devices-page')
      const original = await getCurrentDeviceState(harness.page)
      const toggledState = !original.trusted
      const artifacts = [
        await takeScreenshot(harness.page, state._paths.screenshots, 'main-device-trust-before'),
      ]

      const { diagnostics } = await captureDiagnosticsWindow(harness.diagnostics, async () => {
        await toggleCurrentDeviceTrust(harness.page, toggledState)
        await harness.page.reload({ waitUntil: 'domcontentloaded' })
        await waitForRouteIdle(harness.page, '.devices-page')
        const afterToggle = await getCurrentDeviceState(harness.page)
        assert(
          afterToggle.trusted === toggledState,
          `trust 状态未切换，期望 ${toggledState}，实际 ${afterToggle.trusted}`
        )
        artifacts.push(
          await takeScreenshot(harness.page, state._paths.screenshots, 'main-device-trust-after')
        )

        await toggleCurrentDeviceTrust(harness.page, original.trusted)
        await harness.page.reload({ waitUntil: 'domcontentloaded' })
        await waitForRouteIdle(harness.page, '.devices-page')
        const restored = await getCurrentDeviceState(harness.page)
        assert(
          restored.trusted === original.trusted,
          `trust 状态未恢复，期望 ${original.trusted}，实际 ${restored.trusted}`
        )
        artifacts.push(
          await takeScreenshot(harness.page, state._paths.screenshots, 'main-device-trust-restored')
        )
      })

      assertNoSevereDiagnostics(diagnostics, 'current device trust toggle restore')
      logCleanup(state, {
        scope: 'main-account',
        item: 'device trust',
        restored: true,
        value: original.trusted,
      })
      state.diagnostics.push(
        ...diagnostics.map((entry) => ({
          ...entry,
          scope: 'main-account',
          checkName: 'current device trust toggle restore',
        }))
      )

      return {
        finalUrl: harness.page.url(),
        title: await harness.page.title(),
        canonical: await readCanonical(harness.page),
        diagnostics: summarizeDiagnosticsForCheck(diagnostics),
        artifacts,
        details: {
          originalTrusted: original.trusted,
          toggledState,
        },
      }
    }
  )

  await runCheck(
    state,
    {
      category: 'flow',
      scope: 'main-account',
      name: 'logout/login loop',
      severity: 'P1',
      url: new URL('/profile', config.baseUrl).toString(),
    },
    async () => {
      const { diagnostics } = await captureDiagnosticsWindow(harness.diagnostics, async () => {
        await gotoPath(harness.page, config.baseUrl, '/profile/devices', '.devices-page')
        await logoutViaNavbar(harness.page)
        await gotoPath(harness.page, config.baseUrl, '/login', '.auth-page--login')
        await loginViaUi(
          harness.page,
          state._rl,
          state,
          { username: config.primaryUsername, password: config.primaryPassword },
          { expectedPath: '/', label: 'main-account-relogin' }
        )
        await gotoPath(harness.page, config.baseUrl, '/profile', '.profile-page')
      })

      assertNoSevereDiagnostics(diagnostics, 'main logout/login loop')
      const screenshot = await takeScreenshot(
        harness.page,
        state._paths.screenshots,
        'main-profile-relogin'
      )
      state.diagnostics.push(
        ...diagnostics.map((entry) => ({
          ...entry,
          scope: 'main-account',
          checkName: 'logout/login loop',
        }))
      )

      return {
        finalUrl: harness.page.url(),
        title: await harness.page.title(),
        canonical: await readCanonical(harness.page),
        diagnostics: summarizeDiagnosticsForCheck(diagnostics),
        artifacts: [screenshot],
      }
    }
  )
}

async function runQaAccountRegression(state, harness, config, discovered) {
  const qaEmail = process.env.QA_EMAIL
    ? process.env.QA_EMAIL.trim()
    : await promptForQaEmail(state._rl, state)
  const username = truncate(`${config.qaPrefix}-user`, 40)
  const initialPassword = createStrongPassword('QaReg')
  const resetPassword = createStrongPassword('QaReset')

  state.qa.emailMasked = maskEmail(qaEmail)
  state.qa.username = username
  state.qa.initialPasswordMasked = `${initialPassword.slice(0, 3)}***`
  state.qa.resetPasswordMasked = `${resetPassword.slice(0, 3)}***`

  const registerEntry = await runCheck(
    state,
    {
      category: 'auth',
      scope: 'qa-account',
      name: 'register temp QA account',
      severity: 'P0',
      url: new URL('/register', config.baseUrl).toString(),
    },
    async () => {
      const { diagnostics } = await captureDiagnosticsWindow(harness.diagnostics, async () => {
        await gotoPath(harness.page, config.baseUrl, '/register', '.auth-page--register')
        await setInputValue(harness.page, '#reg-email', qaEmail)
        await handleTurnstileIfNeeded(harness.page, state._rl, state, 'qa-register-send-code')

        const sendButton = await harness.page.$(
          'form.auth-form button[type="submit"], form.auth-form button'
        )
        assert(sendButton, '未找到注册 send code 按钮')
        await sendButton.click()
        await harness.page.waitForSelector('#reg-username', { timeout: 20_000 })

        await setInputValue(harness.page, '#reg-username', username)
        await setInputValue(harness.page, '#reg-password', initialPassword)
        await setInputValue(harness.page, '#reg-confirm-password', initialPassword)
        const registerCode = await promptForCode(
          state._rl,
          state,
          '请输入注册验证码（临时 QA 邮箱收到的 6 位验证码）',
          CHECKPOINT_TYPES.registerCode
        )
        await fillOtpInputs(harness.page, '.code-digit', registerCode)
        await handleTurnstileIfNeeded(harness.page, state._rl, state, 'qa-register-submit')

        const registerButtons = await harness.page.$$('form.auth-form button')
        const submitButton = registerButtons[registerButtons.length - 1]
        assert(submitButton, '未找到注册提交按钮')
        await submitButton.click()
        await waitForPath(harness.page, (url) => url.pathname === '/', 25_000)
        await waitForRouteIdle(harness.page, '.home-page')
      })

      assertNoSevereDiagnostics(diagnostics, 'qa registration')
      const screenshot = await takeScreenshot(
        harness.page,
        state._paths.screenshots,
        'qa-home-after-register'
      )
      state.diagnostics.push(
        ...diagnostics.map((entry) => ({
          ...entry,
          scope: 'qa-account',
          checkName: 'register temp QA account',
        }))
      )

      return {
        finalUrl: harness.page.url(),
        title: await harness.page.title(),
        canonical: await readCanonical(harness.page),
        diagnostics: summarizeDiagnosticsForCheck(diagnostics),
        artifacts: [screenshot],
        details: {
          qaEmailMasked: maskEmail(qaEmail),
          username,
        },
      }
    }
  )

  if (registerEntry.status !== 'passed') {
    const skipped = [
      'first login landing',
      'logout/login loop',
      'verify email flow',
      'forgot password flow',
      'favorite/unfavorite round-trip',
      'discussion create/delete round-trip',
    ]

    for (const name of skipped) {
      await runCheck(
        state,
        {
          category: 'flow',
          scope: 'qa-account',
          name,
          severity: 'P2',
        },
        async () => ({ skipReason: 'QA 注册失败，依赖项跳过' })
      )
    }
    return
  }

  await runCheck(
    state,
    {
      category: 'flow',
      scope: 'qa-account',
      name: 'first login landing',
      severity: 'P2',
    },
    async () => ({
      finalUrl: harness.page.url(),
      title: await harness.page.title(),
      canonical: await readCanonical(harness.page),
      details: {
        landingPath: new URL(harness.page.url()).pathname,
      },
    })
  )

  await runCheck(
    state,
    {
      category: 'auth',
      scope: 'qa-account',
      name: 'logout/login loop',
      severity: 'P1',
      url: new URL('/login', config.baseUrl).toString(),
    },
    async () => {
      const { diagnostics } = await captureDiagnosticsWindow(harness.diagnostics, async () => {
        await logoutViaNavbar(harness.page)
        await gotoPath(harness.page, config.baseUrl, '/login', '.auth-page--login')
        await loginViaUi(
          harness.page,
          state._rl,
          state,
          { username: qaEmail, password: initialPassword },
          { expectedPath: '/', label: 'qa-account-login-loop' }
        )
        await waitForRouteIdle(harness.page, '.home-page')
      })

      assertNoSevereDiagnostics(diagnostics, 'qa logout/login loop')
      state.diagnostics.push(
        ...diagnostics.map((entry) => ({
          ...entry,
          scope: 'qa-account',
          checkName: 'logout/login loop',
        }))
      )

      return {
        finalUrl: harness.page.url(),
        title: await harness.page.title(),
        canonical: await readCanonical(harness.page),
        diagnostics: summarizeDiagnosticsForCheck(diagnostics),
      }
    }
  )

  await runCheck(
    state,
    {
      category: 'auth',
      scope: 'qa-account',
      name: 'verify email flow',
      severity: 'P0',
      url: new URL(
        `/verify-email?token=invalid&email=${encodeURIComponent(qaEmail)}`,
        config.baseUrl
      ).toString(),
    },
    async () => {
      const { diagnostics } = await captureDiagnosticsWindow(harness.diagnostics, async () => {
        const triggerUrl = `/verify-email?token=invalid&email=${encodeURIComponent(qaEmail)}`
        await gotoPath(harness.page, config.baseUrl, triggerUrl, '.auth-page')
        await harness.page
          .waitForFunction(
            () =>
              document.body.textContent?.includes('Verify') ||
              document.querySelector('.action-group'),
            { timeout: 15_000 }
          )
          .catch(() => {})
        const resendButtons = await harness.page.$$('.action-group button')
        assert(resendButtons.length >= 2, '未找到 verify-email resend 按钮')
        await resendButtons[1].click()
        const verifyLink = await promptForUrl(
          state._rl,
          state,
          '请输入验证邮箱邮件中的完整链接',
          CHECKPOINT_TYPES.verifyEmailLink
        )
        await gotoPath(harness.page, config.baseUrl, verifyLink, '.auth-page')
        await harness.page.waitForSelector('.status-icon--success', { timeout: 20_000 })
      })

      const screenshot = await takeScreenshot(
        harness.page,
        state._paths.screenshots,
        'qa-verify-email-success'
      )
      const evaluation = evaluateDiagnostics(diagnostics)
      const severe = evaluation.severe.filter(
        (message) => !/api 400 .*\/api\/v1\/auth\/verify-email/.test(message)
      )
      if (severe.length > 0) {
        throw new Error(`verify email flow 发现阻断诊断:\n- ${severe.join('\n- ')}`)
      }

      state.diagnostics.push(
        ...diagnostics.map((entry) => ({
          ...entry,
          scope: 'qa-account',
          checkName: 'verify email flow',
        }))
      )

      return {
        finalUrl: harness.page.url(),
        title: await harness.page.title(),
        canonical: await readCanonical(harness.page),
        diagnostics: summarizeDiagnosticsForCheck(diagnostics),
        artifacts: [screenshot],
      }
    }
  )

  await runCheck(
    state,
    {
      category: 'auth',
      scope: 'qa-account',
      name: 'forgot password flow',
      severity: 'P0',
      url: new URL('/forgot-password', config.baseUrl).toString(),
    },
    async () => {
      const { diagnostics } = await captureDiagnosticsWindow(harness.diagnostics, async () => {
        await logoutViaNavbar(harness.page)
        await gotoPath(harness.page, config.baseUrl, '/forgot-password', '.auth-page--forgot')
        await setInputValue(harness.page, '#email', qaEmail)
        await handleTurnstileIfNeeded(harness.page, state._rl, state, 'qa-forgot-password')
        const submitButton = await harness.page.$(
          'form.auth-form button[type="submit"], form.auth-form button'
        )
        assert(submitButton, '未找到 forgot-password 提交按钮')
        await submitButton.click()
        await harness.page.waitForSelector('.status-icon--success', { timeout: 20_000 })

        const resetLink = await promptForUrl(
          state._rl,
          state,
          '请输入忘记密码邮件中的 reset-password 完整链接',
          CHECKPOINT_TYPES.forgotPasswordLink
        )
        await gotoPath(harness.page, config.baseUrl, resetLink, '.auth-page')
        await setInputValue(harness.page, '#new_password', resetPassword)
        await setInputValue(harness.page, '#confirm_password', resetPassword)
        const resetButton = await harness.page.$(
          'form.auth-form button[type="submit"], form.auth-form button'
        )
        assert(resetButton, '未找到 reset-password 提交按钮')
        await resetButton.click()
        await harness.page.waitForSelector('.status-icon--success', { timeout: 20_000 })

        const buttons = await harness.page.$$('button')
        if (buttons.length > 0) {
          await buttons[buttons.length - 1].click().catch(() => {})
        }
        await gotoPath(harness.page, config.baseUrl, '/login', '.auth-page--login')
        await loginViaUi(
          harness.page,
          state._rl,
          state,
          { username: qaEmail, password: resetPassword },
          { expectedPath: '/', label: 'qa-account-reset-login' }
        )
        await waitForRouteIdle(harness.page, '.home-page')
      })

      assertNoSevereDiagnostics(diagnostics, 'qa forgot password flow')
      const screenshot = await takeScreenshot(
        harness.page,
        state._paths.screenshots,
        'qa-home-after-reset-login'
      )
      state.diagnostics.push(
        ...diagnostics.map((entry) => ({
          ...entry,
          scope: 'qa-account',
          checkName: 'forgot password flow',
        }))
      )

      return {
        finalUrl: harness.page.url(),
        title: await harness.page.title(),
        canonical: await readCanonical(harness.page),
        diagnostics: summarizeDiagnosticsForCheck(diagnostics),
        artifacts: [screenshot],
      }
    }
  )

  await runCheck(
    state,
    {
      category: 'flow',
      scope: 'qa-account',
      name: 'favorite/unfavorite round-trip',
      severity: 'P1',
      url: discovered.post?.path ? new URL(discovered.post.path, config.baseUrl).toString() : null,
    },
    async () => {
      if (!discovered.post?.path || !discovered.post?.title) {
        return { skipReason: '未发现公开 post 样本，无法执行收藏回归' }
      }

      const artifacts = []

      const { diagnostics } = await captureDiagnosticsWindow(harness.diagnostics, async () => {
        await gotoPath(harness.page, config.baseUrl, discovered.post.path, '.post-detail-page')
        const favoriteButtonSelector = 'button.action-btn[aria-pressed]'
        await harness.page.waitForSelector(favoriteButtonSelector)
        artifacts.push(
          await takeScreenshot(harness.page, state._paths.screenshots, 'qa-favorite-before')
        )
        const currentlyFavorited = await harness.page.$eval(
          favoriteButtonSelector,
          (element) => element.getAttribute('aria-pressed') === 'true'
        )
        if (currentlyFavorited) {
          await harness.page.click(favoriteButtonSelector)
          await harness.page.waitForFunction(
            (selector) => {
              const button = document.querySelector(selector)
              return Boolean(button && button.getAttribute('aria-pressed') === 'false')
            },
            { timeout: 15_000 },
            favoriteButtonSelector
          )
        }

        await harness.page.click(favoriteButtonSelector)
        await harness.page.waitForFunction(
          (selector) => {
            const button = document.querySelector(selector)
            return Boolean(button && button.getAttribute('aria-pressed') === 'true')
          },
          { timeout: 15_000 },
          favoriteButtonSelector
        )
        await harness.page.reload({ waitUntil: 'domcontentloaded' })
        await waitForRouteIdle(harness.page, '.post-detail-page')
        const persisted = await harness.page.$eval(
          favoriteButtonSelector,
          (element) => element.getAttribute('aria-pressed') === 'true'
        )
        assert(persisted, '刷新后收藏状态未保持')
        artifacts.push(
          await takeScreenshot(harness.page, state._paths.screenshots, 'qa-favorite-after')
        )

        await gotoPath(
          harness.page,
          config.baseUrl,
          '/favorites',
          '[data-testid="profile-section-shell"]'
        )
        await harness.page.waitForFunction(
          (postTitle) =>
            [...document.querySelectorAll('.favorite-card .post-preview-card__title')].some(
              (element) => element.textContent?.includes(postTitle)
            ),
          { timeout: 15_000 },
          discovered.post.title
        )

        const removeButtons = await harness.page.$$('.favorite-card .remove-btn')
        assert(removeButtons.length > 0, '未找到 favorites remove 按钮')
        await removeButtons[0].click()
        await harness.page.waitForNetworkIdle({ idleTime: 500, timeout: 5_000 }).catch(() => {})
        await harness.page.reload({ waitUntil: 'domcontentloaded' })
        await waitForRouteIdle(harness.page, '[data-testid="profile-section-shell"]')
        const stillPresent = await harness.page.evaluate(
          (postTitle) =>
            [...document.querySelectorAll('.favorite-card .post-preview-card__title')].some(
              (element) => element.textContent?.includes(postTitle)
            ),
          discovered.post.title
        )
        assert(!stillPresent, '收藏清理失败，favorites 中仍存在测试项目')
        artifacts.push(
          await takeScreenshot(harness.page, state._paths.screenshots, 'qa-favorite-restored')
        )
      })

      assertNoSevereDiagnostics(diagnostics, 'favorite/unfavorite round-trip')
      logCleanup(state, {
        scope: 'qa-account',
        item: 'favorite',
        restored: true,
        value: discovered.post.path,
      })
      state.diagnostics.push(
        ...diagnostics.map((entry) => ({
          ...entry,
          scope: 'qa-account',
          checkName: 'favorite/unfavorite round-trip',
        }))
      )

      return {
        finalUrl: harness.page.url(),
        title: await harness.page.title(),
        canonical: await readCanonical(harness.page),
        diagnostics: summarizeDiagnosticsForCheck(diagnostics),
        artifacts,
      }
    }
  )

  await runCheck(
    state,
    {
      category: 'flow',
      scope: 'qa-account',
      name: 'discussion create/delete round-trip',
      severity: 'P1',
      url: new URL('/community', config.baseUrl).toString(),
    },
    async () => {
      const discussionTitle = `${config.qaPrefix} discussion`
      const discussionBody = `${config.qaPrefix} production regression discussion body`
      const discussionTag = slugify(config.qaPrefix).slice(0, 24)
      const artifacts = []

      const { diagnostics } = await captureDiagnosticsWindow(harness.diagnostics, async () => {
        await gotoPath(harness.page, config.baseUrl, '/community', '.community-page')
        await harness.page.waitForSelector('.discussion-composer', { timeout: 20_000 })
        artifacts.push(
          await takeScreenshot(harness.page, state._paths.screenshots, 'qa-discussion-before')
        )
        await setInputValue(harness.page, '.composer-title-input', discussionTitle)
        await harness.page.click('.category-btn:nth-of-type(2)').catch(() => {})
        await setInputValue(harness.page, '.composer-textarea', discussionBody)
        await setInputValue(harness.page, '.tag-input', discussionTag)
        await harness.page.keyboard.press('Enter')
        const publishButtons = await harness.page.$$('.composer-footer button')
        assert(publishButtons.length > 0, '未找到 discussion publish 按钮')
        await publishButtons[publishButtons.length - 1].click()
        await harness.page.waitForFunction(
          (title) =>
            [...document.querySelectorAll('.discussion-card .discussion-title')].some((element) =>
              element.textContent?.includes(title)
            ),
          { timeout: 20_000 },
          discussionTitle
        )

        const discussionCardHandle = await harness.page.evaluateHandle((title) => {
          return (
            [...document.querySelectorAll('.discussion-card')].find((card) =>
              card.querySelector('.discussion-title')?.textContent?.includes(title)
            ) || null
          )
        }, discussionTitle)

        const clickable = discussionCardHandle.asElement()
        assert(clickable, '未找到新建 discussion 卡片')
        await clickable.click()
        await waitForRouteIdle(harness.page, '.discussion-detail-page')
        const createdUrl = harness.page.url()
        state.qa.createdDiscussionUrl = createdUrl
        artifacts.push(
          await takeScreenshot(harness.page, state._paths.screenshots, 'qa-discussion-after-create')
        )

        const deleteButtons = await harness.page.$$('.discussion-actions .action-danger')
        assert(deleteButtons.length > 0, 'Discussion detail 未提供删除按钮')
        await deleteButtons[0].click()
        await harness.page.waitForSelector('.confirm-dialog__actions button', { timeout: 10_000 })
        const confirmButtons = await harness.page.$$('.confirm-dialog__actions button')
        assert(confirmButtons.length >= 2, '未找到 discussion 删除确认按钮')
        await confirmButtons[confirmButtons.length - 1].click()
        await waitForPath(harness.page, (url) => url.pathname === '/community', 20_000)
        artifacts.push(
          await takeScreenshot(harness.page, state._paths.screenshots, 'qa-discussion-restored')
        )
      })

      const detailDeleted = state.qa.createdDiscussionUrl ? true : false
      state.qa.createdDiscussionDeleted = detailDeleted
      logCleanup(state, {
        scope: 'qa-account',
        item: 'discussion',
        restored: detailDeleted,
        value: state.qa.createdDiscussionUrl ? maskUrl(state.qa.createdDiscussionUrl) : null,
      })

      assertNoSevereDiagnostics(diagnostics, 'discussion create/delete round-trip')
      state.diagnostics.push(
        ...diagnostics.map((entry) => ({
          ...entry,
          scope: 'qa-account',
          checkName: 'discussion create/delete round-trip',
        }))
      )

      await runCheck(
        state,
        {
          category: 'flow',
          scope: 'qa-account',
          name: 'discussion edit unsupported',
          severity: 'P3',
          skipClassification: 'capability-gap',
        },
        async () => ({
          skipReason: '当前 UI 未发现 discussion 编辑入口，按计划记录为 skipped',
          skipClassification: 'capability-gap',
        })
      )

      return {
        finalUrl: harness.page.url(),
        title: await harness.page.title(),
        canonical: await readCanonical(harness.page),
        diagnostics: summarizeDiagnosticsForCheck(diagnostics),
        artifacts,
        details: {
          createdDiscussionUrlMasked: state.qa.createdDiscussionUrl
            ? maskUrl(state.qa.createdDiscussionUrl)
            : null,
        },
      }
    }
  )

  if (state.qa.createdDiscussionUrl && !state.qa.createdDiscussionDeleted) {
    logCleanup(state, {
      scope: 'qa-account',
      item: 'discussion-backlog',
      restored: false,
      value: maskUrl(state.qa.createdDiscussionUrl),
    })
  }
}

async function runFinalRecheck(state, publicHarness, mainHarness, qaHarness, config, discovered) {
  await verifyRoute({
    state,
    harness: publicHarness,
    meta: {
      category: 'recheck',
      scope: 'final',
      name: 'home recheck',
      severity: 'P2',
      url: new URL('/', config.baseUrl).toString(),
    },
    baseUrl: config.baseUrl,
    pathOrUrl: '/',
    selector: '.home-page',
    expectedFinalPath: '/',
    expectedCanonicalPath: '/',
    expectedTitleExact: buildExpectedTitleFromKey(state._locale, 'nav.home'),
  })

  await verifyRoute({
    state,
    harness: publicHarness,
    meta: {
      category: 'recheck',
      scope: 'final',
      name: 'login recheck',
      severity: 'P2',
      url: new URL('/login', config.baseUrl).toString(),
    },
    baseUrl: config.baseUrl,
    pathOrUrl: '/login',
    selector: '.auth-page--login',
    expectedFinalPath: '/login',
    expectedCanonicalPath: '/login',
    expectedTitleExact: buildExpectedTitleFromKey(state._locale, 'nav.login'),
    expectedTextIncludes: [
      getNestedValue(state._locale, 'auth.loginButton'),
      getNestedValue(state._locale, 'auth.googleLoginButton'),
    ].filter(Boolean),
    forbiddenTextIncludes: RETIRED_AUTH_PAGE_TERMS,
    expectedCacheControlIncludes: ['no-store'],
  })

  await verifyRoute({
    state,
    harness: mainHarness,
    meta: {
      category: 'recheck',
      scope: 'final',
      name: 'protected route recheck',
      severity: 'P2',
      url: new URL('/profile', config.baseUrl).toString(),
    },
    baseUrl: config.baseUrl,
    pathOrUrl: '/profile',
    selector: '.profile-page',
    expectedFinalPath: '/profile',
    expectedCanonicalPath: '/profile',
    expectedTitleExact: buildExpectedTitleFromKey(state._locale, 'nav.profile'),
  })

  if (discovered.post?.path) {
    await runCheck(
      state,
      {
        category: 'recheck',
        scope: 'final',
        name: 'favorite cleanup recheck',
        severity: 'P2',
        url: new URL(discovered.post.path, config.baseUrl).toString(),
      },
      async () => {
        const { diagnostics } = await captureDiagnosticsWindow(qaHarness.diagnostics, async () => {
          await gotoPath(qaHarness.page, config.baseUrl, discovered.post.path, '.post-detail-page')
          await qaHarness.page.waitForSelector('button.action-btn[aria-pressed]')
        })
        const isFavorited = await qaHarness.page.$eval(
          'button.action-btn[aria-pressed]',
          (element) => element.getAttribute('aria-pressed') === 'true'
        )
        assert(!isFavorited, '收藏回滚后按钮仍显示已收藏')
        assertNoSevereDiagnostics(diagnostics, 'favorite cleanup recheck')
        state.diagnostics.push(
          ...diagnostics.map((entry) => ({
            ...entry,
            scope: 'final',
            checkName: 'favorite cleanup recheck',
          }))
        )
        return {
          finalUrl: qaHarness.page.url(),
          title: await qaHarness.page.title(),
          canonical: await readCanonical(qaHarness.page),
          diagnostics: summarizeDiagnosticsForCheck(diagnostics),
        }
      }
    )
  } else {
    await runCheck(
      state,
      {
        category: 'recheck',
        scope: 'final',
        name: 'favorite cleanup recheck',
        severity: 'P3',
      },
      async () => ({ skipReason: '无公开 post 样本，无法执行收藏回滚复查' })
    )
  }
}

function severityRank(severity) {
  return { P0: 0, P1: 1, P2: 2, P3: 3 }[severity] ?? 9
}

function escapeTable(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>')
}

function renderIssuesBySeverity(issues) {
  const severities = ['P0', 'P1', 'P2', 'P3']
  const sections = []

  for (const severity of severities) {
    const subset = issues.filter((issue) => issue.severity === severity)
    if (subset.length === 0) continue
    sections.push(`### ${severity}`)
    for (const issue of subset) {
      sections.push(`- **${issue.scope} / ${issue.name}**: ${truncate(issue.error, 400)}`)
      if (issue.finalUrl) {
        sections.push(`  - finalUrl: ${issue.finalUrl}`)
      }
    }
    sections.push('')
  }

  if (sections.length === 0) {
    return ['- 无失败项', '']
  }

  return sections
}

function renderLighthouseSummary(state) {
  if (state.lighthouse.status !== 'passed' || !state.lighthouse.summary) {
    return [
      '- Lighthouse 未成功完成',
      `- 输出目录: ${state.lighthouse.outputDir}`,
      `- 日志: ${state.lighthouse.logFile}`,
      '',
    ]
  }

  const summary = state.lighthouse.summary
  const results = Array.isArray(summary.results) ? summary.results : []
  const successful = results.filter((entry) => !entry.error)
  const averageFor = (profile, field) => {
    const values = successful
      .filter((entry) => entry.profile === profile && typeof entry[field] === 'number')
      .map((entry) => entry[field])
    if (values.length === 0) return 'n/a'
    return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
  }
  const worstByProfile = (profile) =>
    successful
      .filter((entry) => entry.profile === profile && typeof entry.performance === 'number')
      .sort((left, right) => left.performance - right.performance)
      .slice(0, 5)

  const lines = [
    `- 状态: ${state.lighthouse.status}`,
    `- 输出目录: ${state.lighthouse.outputDir}`,
    `- summary: ${state.lighthouse.summaryPath}`,
    `- analysis: ${state.lighthouse.analysisPath}`,
    `- mobile 平均 performance: ${averageFor('mobile', 'performance')}`,
    `- desktop 平均 performance: ${averageFor('desktop', 'performance')}`,
  ]

  for (const profile of ['mobile', 'desktop']) {
    const worst = worstByProfile(profile)
    if (worst.length > 0) {
      lines.push(`- ${profile} 最差页面:`)
      for (const entry of worst) {
        lines.push(
          `  - ${new URL(entry.url).pathname}: performance=${entry.performance}, LCP=${entry.lcpMs ?? 'n/a'}ms`
        )
      }
    }
  }

  lines.push('')
  return lines
}

function buildMarkdownReport(state) {
  const routeRows = state.checks
    .filter((check) => ['route', 'auth', 'recheck'].includes(check.category))
    .map((check) => {
      const pathDisplay = check.finalUrl
        ? new URL(check.finalUrl).pathname
        : check.url
          ? new URL(check.url).pathname
          : ''
      return `| ${escapeTable(check.scope)} | ${escapeTable(check.name)} | ${check.status} | ${escapeTable(pathDisplay)} | ${escapeTable(check.title ?? '')} | ${escapeTable(check.canonical ?? '')} | ${escapeTable(check.error ?? '')} |`
    })

  const lingeringData = state.cleanup.filter((item) => item.restored === false)

  const lines = [
    '# momichan.xyz 生产深度回归报告',
    '',
    `- 开始时间: ${state.startedAt}`,
    `- 结束时间: ${state.finishedAt}`,
    `- Base URL: ${state.baseUrl}`,
    `- Artifact Dir: ${state.artifactDir}`,
    `- 主账号: ${state.config.primaryUsernameMasked}`,
    `- QA 邮箱: ${state.qa.emailMasked ?? 'n/a'}`,
    `- QA 用户名: ${state.qa.username ?? 'n/a'}`,
    '',
    '## Discovery',
    `- Public post: ${state.discoveries.post?.path ?? 'n/a'}`,
    `- Public author: ${state.discoveries.author?.path ?? 'n/a'}`,
    `- Public schedule: ${state.discoveries.schedule?.path ?? 'n/a'}`,
    `- Public discussion count: ${state.discoveries.publicDiscussionCount ?? 'n/a'}`,
    `- Search terms: ${(state.discoveries.searchTerms ?? []).join(', ') || 'n/a'}`,
    '',
    '## Route Matrix',
    '',
    '| Scope | Check | Status | Final Path | Title | Canonical | Error |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...(routeRows.length > 0 ? routeRows : ['| n/a | n/a | n/a | n/a | n/a | n/a | n/a |']),
    '',
    '## Failures by Severity',
    '',
    ...renderIssuesBySeverity(
      [...state.issues].sort(
        (left, right) => severityRank(left.severity) - severityRank(right.severity)
      )
    ),
    '## Skipped Checks',
    '',
    ...renderSkippedChecks(state.skips),
    '## Checkpoints',
    '',
    ...(state.checkpoints.length > 0
      ? state.checkpoints.map(
          (checkpoint) =>
            `- ${checkpoint.at} · ${checkpoint.type} · ${checkpoint.responseMasked ?? 'user-assisted'}`
        )
      : ['- 无人工协助断点记录']),
    '',
    '## Cleanup',
    '',
    ...(state.cleanup.length > 0
      ? state.cleanup.map(
          (item) =>
            `- ${item.scope}: ${item.item} · restored=${item.restored ? 'yes' : 'no'}${item.value ? ` · ${item.value}` : ''}`
        )
      : ['- 无 cleanup 记录']),
    '',
    '## Lighthouse Summary',
    '',
    ...renderLighthouseSummary(state),
    '## Residual Production Data',
    '',
    ...(lingeringData.length > 0
      ? lingeringData.map(
          (item) => `- ${item.scope}: ${item.item}${item.value ? ` · ${item.value}` : ''}`
        )
      : ['- 无已知残留数据']),
    '',
    '## Notes',
    '',
    ...(state.notes.length > 0 ? state.notes.map((note) => `- ${note}`) : ['- 无额外备注']),
    '',
  ]

  return lines.join('\n')
}

function finalizeState(state) {
  state.generatedAt = new Date().toISOString()
  state.finishedAt = state.generatedAt
  delete state._locale
  delete state._paths
  delete state._rl
}

function buildConfig(options) {
  const timestamp = formatTimestamp()
  const baseUrl = normalizeBaseUrl(process.env.BASE_URL ?? DEFAULT_BASE_URL)
  const primaryUsername = (process.env.PRIMARY_USERNAME ?? '').trim()
  const primaryPassword = process.env.PRIMARY_PASSWORD ?? ''
  const secondaryEmailMode = (
    process.env.SECONDARY_EMAIL_MODE ?? DEFAULT_SECONDARY_EMAIL_MODE
  ).trim()
  const qaPrefix = (process.env.QA_PREFIX ?? `qa-prod-${timestamp}`).trim()
  const artifactDir = toAbsoluteArtifactDir(process.env.ARTIFACT_DIR, timestamp)

  return {
    baseUrl,
    primaryUsername,
    primaryPassword,
    secondaryEmailMode,
    qaPrefix,
    artifactDir,
    headless: options.headless,
    timestamp,
    lighthouseDir: path.join(artifactDir, 'lighthouse'),
    lighthouseLogFile: path.join(artifactDir, 'logs', 'lighthouse.log'),
  }
}

function assertRunnableConfig(config) {
  if (!config.primaryUsername) {
    throw new Error('缺少 PRIMARY_USERNAME')
  }
  if (!config.primaryPassword) {
    throw new Error('缺少 PRIMARY_PASSWORD')
  }
  if (config.secondaryEmailMode !== DEFAULT_SECONDARY_EMAIL_MODE) {
    throw new Error(
      `SECONDARY_EMAIL_MODE 必须为 ${DEFAULT_SECONDARY_EMAIL_MODE}，收到: ${config.secondaryEmailMode}`
    )
  }
}

async function runPreflight(config) {
  let artifactDirReady = false
  let artifactDirError = null

  try {
    ensureDir(config.artifactDir)
    ensureDir(path.join(config.artifactDir, 'diagnostics'))
    artifactDirReady = true
  } catch (error) {
    artifactDirError = summarizeError(error)
  }

  const routeOverview = getReleaseRouteContractOverview()
  const contractIssues = validateReleaseRouteContract()
  const checks = buildRunnerPreflightChecks({
    config,
    artifactDirReady,
    artifactDirError,
    contractIssues,
    routeOverview,
  })
  const summary = buildRunnerPreflightSummary({
    config,
    checks,
    routeOverview,
  })

  if (!artifactDirReady) {
    throw new Error(
      `预检无法写入 artifact 目录 ${config.artifactDir}: ${artifactDirError ?? 'unknown error'}`
    )
  }

  await writeRunnerPreflightArtifacts(summary)
  console.log(`\n📦 Preflight summary: ${path.join(config.artifactDir, 'summary.json')}`)
  console.log(`📝 Preflight report: ${path.join(config.artifactDir, 'summary.md')}`)
  console.log(`🧾 Preflight diagnostics: ${path.join(config.artifactDir, 'diagnostics', 'preflight.json')}`)

  if (summary.status !== 'passed') {
    process.exitCode = 1
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  const config = buildConfig(options)
  if (options.preflight) {
    await runPreflight(config)
    return
  }
  assertRunnableConfig(config)
  const locale = loadEnglishLocale()

  const artifactPaths = {
    root: config.artifactDir,
    screenshots: path.join(config.artifactDir, 'screenshots'),
    logs: path.join(config.artifactDir, 'logs'),
    checkpoints: path.join(config.artifactDir, 'checkpoints'),
    diagnosticsDir: path.join(config.artifactDir, 'diagnostics'),
    summary: path.join(config.artifactDir, 'summary.json'),
    summaryMd: path.join(config.artifactDir, 'summary.md'),
    report: path.join(config.artifactDir, 'report.md'),
    diagnostics: path.join(config.artifactDir, 'diagnostics.json'),
  }

  for (const dirPath of [
    artifactPaths.root,
    artifactPaths.screenshots,
    artifactPaths.logs,
    artifactPaths.checkpoints,
    artifactPaths.diagnosticsDir,
    config.lighthouseDir,
  ]) {
    ensureDir(dirPath)
  }

  writeText(config.lighthouseLogFile, '')

  const state = createState(config)
  state._locale = locale
  state._paths = artifactPaths
  state._rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  logNote(state, `Artifacts 将写入 ${config.artifactDir}`)
  logNote(state, `BASE_URL=${config.baseUrl}`)
  logNote(state, `QA_PREFIX=${config.qaPrefix}`)

  const discovered = await discoverProductionEntities(config.baseUrl)
  state.discoveries = discovered

  const lighthousePromise = startLighthouseAudit(config, state)
    .then(() => {
      state.lighthouse.status = 'passed'
      if (fs.existsSync(state.lighthouse.summaryPath)) {
        state.lighthouse.summary = JSON.parse(fs.readFileSync(state.lighthouse.summaryPath, 'utf8'))
      }
    })
    .catch((error) => {
      state.lighthouse.status = 'failed'
      state.lighthouse.error = summarizeError(error)
      state.issues.push({
        scope: 'quality',
        name: 'lighthouse full audit',
        severity: 'P2',
        error: state.lighthouse.error,
        artifacts: [state.lighthouse.logFile],
      })
    })

  const browser = await puppeteer.launch({
    headless: config.headless ? true : false,
    defaultViewport: null,
    args: ['--lang=en-US', '--window-size=1440,960'],
  })

  const publicContext = await browser.createBrowserContext()
  const mainContext = await browser.createBrowserContext()
  const qaContext = await browser.createBrowserContext()

  const publicHarness = await createPageHarness(publicContext, new URL(config.baseUrl).origin)
  const mainHarness = await createPageHarness(mainContext, new URL(config.baseUrl).origin)
  const qaHarness = await createPageHarness(qaContext, new URL(config.baseUrl).origin)

  try {
    await runPublicRegression(state, publicHarness, config, discovered)
    await runMainAccountRegression(state, mainHarness, config)
    await runQaAccountRegression(state, qaHarness, config, discovered)
    await runFinalRecheck(state, publicHarness, mainHarness, qaHarness, config, discovered)
    await lighthousePromise
  } finally {
    await closeQuietly(publicHarness.page)
    await closeQuietly(mainHarness.page)
    await closeQuietly(qaHarness.page)
    await closeQuietly(publicContext)
    await closeQuietly(mainContext)
    await closeQuietly(qaContext)
    await closeQuietly(browser)
    await closeQuietly(state._rl)
  }

  writeJson(artifactPaths.diagnostics, state.diagnostics)
  writeJson(path.join(artifactPaths.diagnosticsDir, 'entries.json'), state.diagnostics)
  writeJson(path.join(artifactPaths.diagnosticsDir, 'issues.json'), state.issues)
  writeJson(path.join(artifactPaths.diagnosticsDir, 'skips.json'), state.skips)
  finalizeState(state)
  writeJson(artifactPaths.summary, state)
  const markdownReport = buildMarkdownReport(state)
  writeText(artifactPaths.report, markdownReport)
  writeText(artifactPaths.summaryMd, markdownReport)

  console.log(`\n📦 Summary: ${artifactPaths.summary}`)
  console.log(`📝 Report: ${artifactPaths.report}`)
  console.log(`📝 Summary Markdown: ${artifactPaths.summaryMd}`)
  console.log(`🧾 Diagnostics: ${artifactPaths.diagnostics}`)

  const failedChecks = state.checks.filter((check) => check.status === 'failed')
  if (failedChecks.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(
    `❌ 生产回归 runner 执行失败: ${error instanceof Error ? error.stack || error.message : String(error)}`
  )
  process.exit(1)
})
