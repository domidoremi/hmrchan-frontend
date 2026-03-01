#!/usr/bin/env bun
/**
 * 可访问性专项测试脚本（Lighthouse）
 * - 先 build，再用 preview 服务测试核心路由
 * - 输出每页 accessibility 分数与失败审计项
 */

import { spawn } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { createServer } from 'net'
import { join } from 'path'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'

const REPORT_DIR = join(process.cwd(), '.lighthouse-a11y')
const TEMP_DIR = join(REPORT_DIR, 'tmp')
const DEFAULT_PREVIEW_PORT = 0

const ROUTES = [
  '/',
  '/explore',
  '/search',
  '/authors',
  '/community',
  '/community/discussions/00000000-0000-4000-8000-000000000000',
  '/post/00000000-0000-4000-8000-000000000000',
  '/author/sample-author',
  '/schedule',
  '/about',
  '/contact',
  '/favorites',
  '/profile',
  '/profile/settings',
  '/profile/notifications',
  '/profile/devices',
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
  ...process.env,
  VITE_ENABLE_CLIENT_INIT: process.env['VITE_ENABLE_CLIENT_INIT'] ?? 'false',
  VITE_ENABLE_SCHEDULE_API: process.env['VITE_ENABLE_SCHEDULE_API'] ?? 'false',
  VITE_ENABLE_DATA_PREFETCH: process.env['VITE_ENABLE_DATA_PREFETCH'] ?? 'false',
  VITE_DISABLE_PREVIEW_PROXY: process.env['VITE_DISABLE_PREVIEW_PROXY'] ?? 'true',
}

function getBunExecutable(): string {
  return 'bun'
}

async function findAvailablePort(preferredPort: number): Promise<number> {
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

function startPreviewServer(port: number): Promise<{ kill: () => Promise<void>; port: number }> {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting preview server...')
    const server = spawn(getBunExecutable(), ['run', 'preview', '--port', String(port)], {
      stdio: 'pipe',
      shell: false,
      env: AUDIT_ENV,
    })

    let resolved = false

    server.stdout?.on('data', (data: Buffer) => {
      const output = data.toString()
      process.stdout.write(output)
      const match = output.match(/Local:\s+http:\/\/localhost:(\d+)\//)
      if (!resolved && match?.[1]) {
        const actualPort = Number(match[1])
        resolved = true
        setTimeout(
          () =>
            resolve({
              kill: () => terminateProcessTree(server.pid),
              port: actualPort,
            }),
          1000
        )
      }
    })

    server.stderr?.on('data', (data: Buffer) => {
      process.stderr.write(data.toString())
    })

    server.on('error', (error: Error) => {
      if (!resolved) reject(error)
    })

    setTimeout(() => {
      if (!resolved) {
        void terminateProcessTree(server.pid)
        reject(new Error(`Preview server startup timeout on port ${port}`))
      }
    }, 45_000)
  })
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

  let previewServer: { kill: () => Promise<void>; port: number } | null = null
  let chrome: chromeLauncher.LaunchedChrome | null = null

  try {
    console.log('🏗️ Building production bundle...')
    await runBunTask('build')
    console.log('✅ Build completed')

    const previewPort = await findAvailablePort(DEFAULT_PREVIEW_PORT)
    previewServer = await startPreviewServer(previewPort)
    chrome = await chromeLauncher.launch({
      chromeFlags: [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        `--user-data-dir=${chromeProfileDir}`,
      ],
      userDataDir: launcherProfileDir,
    })

    let pass = 0
    let fail = 0

    for (const route of ROUTES) {
      const routeLabel = route === '/' ? 'home' : route.replace(/\//g, '-').replace(/^-/, '')
      const score = await runAccessibilityAudit(
        `http://localhost:${previewServer.port}${route}`,
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
      await previewServer.kill()
    }
  }
}

main()
