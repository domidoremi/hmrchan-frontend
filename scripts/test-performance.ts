#!/usr/bin/env bun
/**
 * 性能测试脚本
 * 使用 Lighthouse 测试应用性能并生成报告
 */

import { spawn } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const LIGHTHOUSE_REPORTS_DIR = join(process.cwd(), '.lighthouse')
const DEV_SERVER_PORT = 5173

interface TestConfig {
  url: string
  name: string
}

const TEST_URLS: TestConfig[] = [
  { url: `http://localhost:${DEV_SERVER_PORT}/`, name: 'home' },
  { url: `http://localhost:${DEV_SERVER_PORT}/explore`, name: 'explore' },
  { url: `http://localhost:${DEV_SERVER_PORT}/search`, name: 'search' },
]

/**
 * 启动开发服务器
 */
function startDevServer(): Promise<{ kill: () => void }> {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting dev server...')
    const server = spawn('bun', ['run', 'dev'], {
      stdio: 'pipe',
      shell: true,
    })

    let resolved = false

    server.stdout?.on('data', (data: Buffer) => {
      const output = data.toString()
      console.log(output)

      // 检测服务器是否已启动
      if (!resolved && output.includes(`localhost:${DEV_SERVER_PORT}`)) {
        resolved = true
        console.log('✅ Dev server is ready\n')
        // 等待额外 2 秒确保完全启动
        setTimeout(() => resolve({ kill: () => server.kill() }), 2000)
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
    }, 30000)
  })
}

/**
 * 运行 Lighthouse 测试
 */
function runLighthouse(url: string, name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`📊 Running Lighthouse for ${name}...`)

    const outputPath = join(LIGHTHOUSE_REPORTS_DIR, `${name}.html`)

    const lighthouse = spawn(
      'npx',
      [
        'lighthouse',
        url,
        '--preset=desktop',
        '--output=html,json',
        `--output-path=${join(LIGHTHOUSE_REPORTS_DIR, name)}`,
        '--chrome-flags="--headless --no-sandbox"',
        '--quiet',
      ],
      {
        stdio: 'inherit',
        shell: true,
      }
    )

    lighthouse.on('close', (code: number | null) => {
      if (code === 0) {
        console.log(`✅ Lighthouse report saved: ${outputPath}\n`)
        resolve()
      } else {
        reject(new Error(`Lighthouse exited with code ${code}`))
      }
    })

    lighthouse.on('error', reject)
  })
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

  let devServer: { kill: () => void } | null = null

  try {
    // 启动开发服务器
    devServer = await startDevServer()

    // 运行 Lighthouse 测试
    for (const { url, name } of TEST_URLS) {
      await runLighthouse(url, name)
    }

    console.log('✅ All performance tests completed!')
    console.log(`📁 Reports saved in: ${LIGHTHOUSE_REPORTS_DIR}`)
  } catch (error) {
    console.error('❌ Performance testing failed:', error)
    process.exit(1)
  } finally {
    // 关闭开发服务器
    if (devServer) {
      console.log('\n🛑 Stopping dev server...')
      devServer.kill()
    }
  }
}

main()
