#!/usr/bin/env bun
/**
 * 性能测试脚本
 * 使用 Lighthouse 测试应用性能并生成报告
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'
import { applyLocalAuditEnvToProcess, createLocalAuditEnv } from './lib/audit-env.js'
import { withBuildArtifactLock } from './lib/build-artifact-lock.js'
import { PreviewShellManager, runBunTask } from './lib/preview-shell.js'

applyLocalAuditEnvToProcess()

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
  ...createLocalAuditEnv(process.env, {
    includeContractFallback: true,
  }),
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

  let previewServer: PreviewShellManager | null = null
  let chrome: chromeLauncher.LaunchedChrome | null = null

  try {
    // 先构建生产产物，再用 preview 跑 Lighthouse（更接近真实生产表现）
    console.log('🏗️ Building production bundle...')
    await withBuildArtifactLock('vite-dist-build', () => runBunTask('build', { env: AUDIT_ENV }), {
      onWait: () => {
        console.log('🔒 Waiting for another build process to release the dist artifact lock...')
      },
    })
    console.log('✅ Build completed\n')

    // 启动预览服务器
    previewServer = new PreviewShellManager({
      env: AUDIT_ENV,
      preferredPort: PREVIEW_SERVER_PORT,
      logOutput: true,
    })
    await previewServer.start()
    const tests = getTestUrls(previewServer.port ?? PREVIEW_SERVER_PORT)

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
      await previewServer.stop()
    }
  }
}

main()
