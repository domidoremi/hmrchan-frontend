#!/usr/bin/env node
/**
 * 自动生成 PWA 应用截图
 *
 * 使用 Puppeteer 自动截取应用的移动端和桌面端截图
 *
 * 前置条件：
 *   npm install puppeteer
 *
 * 使用：
 *   # 确保开发服务器正在运行
 *   bun run dev
 *
 *   # 在另一个终端运行
 *   node scripts/generate-screenshots.js
 */

import puppeteer from 'puppeteer'
import { existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'

const OUTPUT_DIR = resolve(process.cwd(), 'public/screenshots')
const BASE_URL = 'http://localhost:5173'

// 截图配置
const SCREENSHOTS = [
  {
    name: 'home-mobile.png',
    url: '/',
    viewport: { width: 390, height: 844 }, // iPhone 12 Pro
    description: '首页 - 移动端',
  },
  {
    name: 'home-desktop.png',
    url: '/',
    viewport: { width: 1920, height: 1080 }, // 桌面端
    description: '首页 - 桌面端',
  },
  {
    name: 'explore-mobile.png',
    url: '/explore',
    viewport: { width: 390, height: 844 },
    description: '探索页 - 移动端',
  },
  {
    name: 'explore-desktop.png',
    url: '/explore',
    viewport: { width: 1920, height: 1080 },
    description: '探索页 - 桌面端',
  },
]

/**
 * 检查开发服务器是否运行
 */
async function checkServer() {
  try {
    const response = await fetch(BASE_URL)
    return response.ok
  } catch {
    return false
  }
}

/**
 * 生成截图
 */
async function generateScreenshot(browser, config) {
  const { name, url, viewport, description } = config
  const outputPath = resolve(OUTPUT_DIR, name)

  console.log(`📸 生成截图: ${description}`)
  console.log(`   URL: ${BASE_URL}${url}`)
  console.log(`   尺寸: ${viewport.width}x${viewport.height}`)

  try {
    const page = await browser.newPage()

    // 设置视口
    await page.setViewport(viewport)

    // 访问页面
    await page.goto(`${BASE_URL}${url}`, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    })

    // 等待页面完全加载
    await page.waitForTimeout(2000)

    // 截图
    await page.screenshot({
      path: outputPath,
      fullPage: false, // 只截取视口内容
    })

    await page.close()

    console.log(`✅ 已保存: ${name}`)
    console.log('')
  } catch (error) {
    console.error(`❌ 生成 ${name} 失败:`, error.message)
    console.log('')
  }
}

/**
 * 主执行函数
 */
async function main() {
  console.log('📸 PWA 应用截图生成器')
  console.log('═'.repeat(60))
  console.log('')

  // 检查开发服务器
  console.log('🔍 检查开发服务器...')
  const serverRunning = await checkServer()

  if (!serverRunning) {
    console.error('❌ 错误：开发服务器未运行')
    console.log('')
    console.log('请先启动开发服务器：')
    console.log('  bun run dev')
    console.log('')
    console.log('然后在另一个终端运行此脚本')
    process.exit(1)
  }

  console.log('✅ 开发服务器正在运行')
  console.log('')

  // 确保输出目录存在
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  // 启动浏览器
  console.log('🚀 启动浏览器...')
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  console.log('✅ 浏览器已启动')
  console.log('')

  // 生成所有截图
  for (const config of SCREENSHOTS) {
    await generateScreenshot(browser, config)
  }

  // 关闭浏览器
  await browser.close()

  console.log('═'.repeat(60))
  console.log('✅ 所有截图生成完成！')
  console.log('')
  console.log('📁 输出目录:', OUTPUT_DIR)
  console.log('')
  console.log('💡 下一步：')
  console.log('  1. 检查截图质量')
  console.log('  2. 根据需要调整截图内容')
  console.log('  3. 提交到 Git 仓库')
}

main().catch((error) => {
  console.error('❌ 执行失败:', error)
  process.exit(1)
})
