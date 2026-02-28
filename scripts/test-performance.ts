#!/usr/bin/env bun
/**
 * 性能测试脚本
 * 使用 Lighthouse 测试应用性能并生成报告
 */

import { spawn } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'

const LIGHTHOUSE_REPORTS_DIR = join(process.cwd(), '.lighthouse')
const LIGHTHOUSE_TEMP_DIR = join(LIGHTHOUSE_REPORTS_DIR, 'tmp')

interface TestConfig {
  url: string
  name: string
}

function getTestUrls(port: number): TestConfig[] {
  return [
    { url: `http://localhost:${port}/`, name: 'home' },
    { url: `http://localhost:${port}/explore`, name: 'explore' },
    { url: `http://localhost:${port}/search`, name: 'search' },
  ]
}

function getExecutable(name: 'bun' | 'npx'): string {
  if (name === 'bun') {
    return 'bun'
  }
  return process.platform === 'win32' ? 'npx.cmd' : 'npx'
}

/**
 * 启动开发服务器
 */
function startDevServer(): Promise<{ kill: () => void; port: number }> {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting dev server...')
    const server = spawn(getExecutable('bun'), ['run', 'dev'], {
      stdio: 'pipe',
      shell: false,
    })

    let resolved = false

    server.stdout?.on('data', (data: Buffer) => {
      const output = data.toString()
      console.log(output)

      // 检测服务器是否已启动
      const match = output.match(/Local:\s+http:\/\/localhost:(\d+)\//)
      if (!resolved && match?.[1]) {
        const actualPort = Number(match[1])
        resolved = true
        console.log(`✅ Dev server is ready on ${actualPort}\n`)
        // 等待额外 2 秒确保完全启动
        setTimeout(
          () =>
            resolve({
              kill: () => server.kill(),
              port: actualPort,
            }),
          2000
        )
      }
    })

    server.stderr?.on('data', (data: Buffer) => {
      console.error(data.toString())
    })

    server.on('error', (error: Error) => {
      if (!resolved) {
        reject(error)
      }
    })

    // 超时保护
    setTimeout(() => {
      if (!resolved) {
        reject(new Error('Dev server startup timeout'))
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

  let devServer: { kill: () => void; port: number } | null = null
  let chrome: chromeLauncher.LaunchedChrome | null = null

  try {
    // 启动开发服务器
    devServer = await startDevServer()
    const tests = getTestUrls(devServer.port)

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
    if (devServer) {
      console.log('\n🛑 Stopping dev server...')
      devServer.kill()
    }
  }
}

main()
