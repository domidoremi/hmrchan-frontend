#!/usr/bin/env bun

import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'
import { applyLocalAuditEnvToProcess, createLocalAuditEnv } from './lib/audit-env.js'
import { withBuildArtifactLock } from './lib/build-artifact-lock.js'
import { PreviewShellManager, runBunTask } from './lib/preview-shell.js'

applyLocalAuditEnvToProcess()

const REPORT_DIR = join(process.cwd(), '.lighthouse-a11y')
const TEMP_DIR = join(REPORT_DIR, 'tmp')
const DEFAULT_PREVIEW_PORT = 0
const ENV_CHROME_PATH =
  process.env['LIGHTHOUSE_CHROMIUM_PATH'] ??
  process.env['CHROME_PATH'] ??
  process.env['CHROME_BIN'] ??
  process.env['PUPPETEER_EXECUTABLE_PATH'] ??
  null

let cachedChromePathPromise: Promise<string | null> | null = null

const ROUTES = [
  '/',
  '/explore',
  '/search',
  '/authors',
  '/community',
  '/community/discussions/01900000-0000-7000-8000-000000000002',
  '/post/01900000-0000-7000-8000-000000000001',
  '/author/01900000-0000-7000-8000-000000000003',
  '/schedule',
  '/about',
  '/contact',
  '/favorites',
  '/profile',
  '/profile/settings',
  '/profile/notifications',
  '/profile/security',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/this-route-does-not-exist',
]

interface LighthouseRunnerResult {
  report: string | string[]
  lhr: {
    finalDisplayedUrl?: string
    categories: Record<string, { score: number | null }>
    audits: Record<string, { score: number | null; title: string; scoreDisplayMode: string }>
  }
}

const AUDIT_ENV = {
  ...createLocalAuditEnv(process.env, {
    includeContractFallback: true,
  }),
  VITE_ENABLE_CLIENT_INIT: process.env['VITE_ENABLE_CLIENT_INIT'] ?? 'false',
  VITE_ENABLE_SCHEDULE_API: process.env['VITE_ENABLE_SCHEDULE_API'] ?? 'false',
  VITE_ENABLE_DATA_PREFETCH: process.env['VITE_ENABLE_DATA_PREFETCH'] ?? 'false',
  VITE_DISABLE_PREVIEW_PROXY: process.env['VITE_DISABLE_PREVIEW_PROXY'] ?? 'true',
}

async function resolveChromePath(): Promise<string | null> {
  if (!cachedChromePathPromise) {
    cachedChromePathPromise = (async () => {
      if (ENV_CHROME_PATH) return ENV_CHROME_PATH

      try {
        const puppeteerModule = await import('puppeteer')
        const executablePath =
          puppeteerModule.executablePath?.() ?? puppeteerModule.default?.executablePath?.()

        if (
          typeof executablePath === 'string' &&
          executablePath.length > 0 &&
          existsSync(executablePath)
        ) {
          return executablePath
        }
      } catch {
        // ignore puppeteer fallback failures
      }

      return null
    })()
  }

  return cachedChromePathPromise
}

function getFailingAudits(
  audits: LighthouseRunnerResult['lhr']['audits']
): Array<{ id: string; title: string }> {
  return Object.entries(audits)
    .filter(([, audit]) => {
      if (audit.scoreDisplayMode === 'notApplicable') return false
      return audit.score !== null && audit.score < 1
    })
    .map(([id, audit]) => ({ id, title: audit.title }))
}

async function runAccessibilityAudit(
  url: string,
  name: string,
  chromePort: number
): Promise<number> {
  const result = (await lighthouse(url, {
    port: chromePort,
    logLevel: 'error',
    output: ['json'],
    onlyCategories: ['accessibility'],
    preset: 'desktop',
  })) as LighthouseRunnerResult | undefined

  if (!result) {
    throw new Error(`Lighthouse returned empty result for ${name}`)
  }

  const reportJson = Array.isArray(result.report) ? result.report[0] : result.report
  writeFileSync(join(REPORT_DIR, `${name}.json`), reportJson ?? '{}')

  const score = Math.round((result.lhr.categories.accessibility?.score ?? 0) * 100)
  const failing = getFailingAudits(result.lhr.audits)

  console.log(`\n[${name}] accessibility: ${score}/100`)
  if (failing.length > 0) {
    for (const item of failing.slice(0, 8)) {
      console.log(`- ${item.id}: ${item.title}`)
    }
  } else {
    console.log('- no failing audits')
  }

  return score
}

async function main() {
  console.log('🔎 Running accessibility audit...\n')

  if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true })
  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true })

  const chromeProfileDir = join(TEMP_DIR, 'chrome-profile')
  const launcherProfileDir = join(TEMP_DIR, 'launcher-profile')
  if (!existsSync(chromeProfileDir)) mkdirSync(chromeProfileDir, { recursive: true })
  if (!existsSync(launcherProfileDir)) mkdirSync(launcherProfileDir, { recursive: true })

  let previewServer: PreviewShellManager | null = null
  let chrome: chromeLauncher.LaunchedChrome | null = null

  try {
    console.log('🏗️ Building production bundle...')
    await withBuildArtifactLock('vite-dist-build', () => runBunTask('build', { env: AUDIT_ENV }), {
      onWait: () => {
        console.log('🔒 Waiting for another build process to release the dist artifact lock...')
      },
    })
    console.log('✅ Build completed')

    previewServer = new PreviewShellManager({
      env: AUDIT_ENV,
      preferredPort: DEFAULT_PREVIEW_PORT,
      logOutput: true,
    })
    await previewServer.start()
    const chromePath = await resolveChromePath()
    chrome = await chromeLauncher.launch({
      chromeFlags: [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        `--user-data-dir=${chromeProfileDir}`,
      ],
      userDataDir: launcherProfileDir,
      ...(chromePath ? { chromePath } : {}),
    })

    let pass = 0
    let fail = 0

    for (const route of ROUTES) {
      const routeLabel = route === '/' ? 'home' : route.replace(/\//g, '-').replace(/^-/, '')
      const score = await runAccessibilityAudit(
        `${previewServer.baseUrl}${route}`,
        routeLabel,
        chrome.port
      )
      if (score >= 100) pass++
      else fail++
    }

    console.log('\n=== Accessibility Summary ===')
    console.log(`Reports: ${REPORT_DIR}`)
    console.log(`Pass(100): ${pass}`)
    console.log(`Need Improve(<100): ${fail}`)
  } catch (error) {
    console.error('❌ Accessibility audit failed:', error)
    process.exit(1)
  } finally {
    if (chrome) {
      try {
        await chrome.kill()
      } catch {
        // ignore
      }
    }
    if (previewServer) {
      console.log('\n🛑 Stopping preview server...')
      await previewServer.stop()
    }
  }
}

main()
