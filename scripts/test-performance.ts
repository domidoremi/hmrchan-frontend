#!/usr/bin/env bun
/**
 * 性能测试脚本
 * 使用 Lighthouse 测试应用性能并生成报告
 */

import { spawn } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { createServer } from 'net'
import { join } from 'path'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'

const LIGHTHOUSE_REPORTS_DIR = join(process.cwd(), '.lighthouse')
const LIGHTHOUSE_TEMP_DIR = join(LIGHTHOUSE_REPORTS_DIR, 'tmp')
const PREVIEW_SERVER_PORT = 0
const ENV_CHROME_PATH =
  process.env['LIGHTHOUSE_CHROMIUM_PATH'] ??
  process.env['CHROME_PATH'] ??
  process.env['CHROME_BIN'] ??
  process.env['PUPPETEER_EXECUTABLE_PATH'] ??
  null

let cachedChromePathPromise: Promise<string | null> | null = null

interface TestConfig {
  url: string
  name: string
}

const AUDIT_ENV = {
  ...process.env,
  VITE_ENABLE_CLIENT_INIT: process.env['VITE_ENABLE_CLIENT_INIT'] ?? 'false',
  VITE_ENABLE_SCHEDULE_API: process.env['VITE_ENABLE_SCHEDULE_API'] ?? 'false',
  VITE_ENABLE_DATA_PREFETCH: process.env['VITE_ENABLE_DATA_PREFETCH'] ?? 'false',
  VITE_DISABLE_PREVIEW_PROXY: process.env['VITE_DISABLE_PREVIEW_PROXY'] ?? 'true',
}

function getTestUrls(port: number): TestConfig[] {
  return [
    { url: `http://localhost:${port}/`, name: 'home' },
    { url: `http://localhost:${port}/explore`, name: 'explore' },
    { url: `http://localhost:${port}/search`, name: 'search' },
  ]
}

function getBunExecutable(): string {
  return 'bun'
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
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`bun run ${task} exited with code ${code}`))
      }
    })

    child.on('error', reject)
  })
}

/**
 * 启动开发服务器
 */
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
    // Ignore if already closed
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
          resolve({
            kill: () => terminateProcessTree(server.pid),
            port,
          })
        }
      } catch {
        // preview server not ready yet
      }
    }

    server.stdout?.on('data', (data: Buffer) => {
      const output = data.toString()
      process.stdout.write(output)
    })

    server.stderr?.on('data', (data: Buffer) => {
      console.error(data.toString())
    })

    server.on('error', (error: Error) => {
      cleanupStartupCheck()
      if (!resolved) {
        reject(error)
      }
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
    }, 45000)
  })
}

/**
 * 运行 Lighthouse 测试
 */
interface LighthouseRunnerResult {
  report: string | string[]
  lhr: {
    categories: Record<string, { score: number | null }>
  }
}

async function runLighthouseWithApi(url: string, name: string, chromePort: number): Promise<void> {
  console.log(`📊 Running Lighthouse for ${name}...`)

  const runnerResult = (await lighthouse(url, {
    port: chromePort,
    logLevel: 'error',
    output: ['html', 'json'],
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    preset: 'desktop',
  })) as LighthouseRunnerResult | undefined

  if (!runnerResult) {
    throw new Error(`Lighthouse returned empty result for ${name}`)
  }

  const reports = Array.isArray(runnerResult.report) ? runnerResult.report : [runnerResult.report]
  const htmlReport = reports[0]
  const jsonReport = reports[1]

  writeFileSync(join(LIGHTHOUSE_REPORTS_DIR, `${name}.html`), htmlReport ?? '')
  writeFileSync(join(LIGHTHOUSE_REPORTS_DIR, `${name}.json`), jsonReport ?? '{}')

  const perfScore = Math.round((runnerResult.lhr.categories.performance?.score ?? 0) * 100)
  console.log(`✅ Lighthouse report saved: ${join(LIGHTHOUSE_REPORTS_DIR, `${name}.html`)}`)
  console.log(`   Performance: ${perfScore}/100\n`)
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log('🔍 MomiChan Performance Testing\n')

  // 创建报告目录
  if (!existsSync(LIGHTHOUSE_REPORTS_DIR)) {
    mkdirSync(LIGHTHOUSE_REPORTS_DIR, { recursive: true })
  }
  if (!existsSync(LIGHTHOUSE_TEMP_DIR)) {
    mkdirSync(LIGHTHOUSE_TEMP_DIR, { recursive: true })
  }
  const chromeProfileDir = join(LIGHTHOUSE_TEMP_DIR, 'chrome-profile')
  const launcherProfileDir = join(LIGHTHOUSE_TEMP_DIR, 'launcher-profile')
  if (!existsSync(chromeProfileDir)) {
    mkdirSync(chromeProfileDir, { recursive: true })
  }
  if (!existsSync(launcherProfileDir)) {
    mkdirSync(launcherProfileDir, { recursive: true })
  }

  let previewServer: { kill: () => Promise<void>; port: number } | null = null
  let chrome: chromeLauncher.LaunchedChrome | null = null

  try {
    // 先构建生产产物，再用 preview 跑 Lighthouse（更接近真实生产表现）
    console.log('🏗️ Building production bundle...')
    await runBunTask('build')
    console.log('✅ Build completed\n')

    // 启动预览服务器
    const previewPort = await findAvailablePort(PREVIEW_SERVER_PORT)
    previewServer = await startPreviewServer(previewPort)
    const tests = getTestUrls(previewServer.port)

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

    // 运行 Lighthouse 测试
    for (const { url, name } of tests) {
      await runLighthouseWithApi(url, name, chrome.port)
    }

    console.log('✅ All performance tests completed!')
    console.log(`📁 Reports saved in: ${LIGHTHOUSE_REPORTS_DIR}`)
  } catch (error) {
    console.error('❌ Performance testing failed:', error)
    process.exit(1)
  } finally {
    if (chrome) {
      try {
        await chrome.kill()
      } catch (error) {
        // Windows 下 chrome-launcher 偶发 EPERM 清理失败，不影响报告输出
        console.warn('⚠️ Failed to fully clean Lighthouse temp directory:', error)
      }
    }

    // 关闭开发服务器
    if (previewServer) {
      console.log('\n🛑 Stopping preview server...')
      await previewServer.kill()
    }
  }
}

main()
