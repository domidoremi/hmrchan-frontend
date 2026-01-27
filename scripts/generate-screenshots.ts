#!/usr/bin/env node
/**
 * Automated PWA screenshot generator
 *
 * Uses Puppeteer to capture mobile and desktop screenshots
 *
 * Prerequisites:
 *   bun add -d puppeteer
 *
 * Usage:
 *   # Start dev server first
 *   bun run dev
 *
 *   # Run in another terminal
 *   bun run scripts/generate-screenshots.ts
 */

import puppeteer, { type Browser, type Viewport } from 'puppeteer'
import { existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'

// Constants
const TIMEOUTS = {
  PAGE_LOAD: 30_000,
  RENDER_WAIT: 2_000,
  SERVER_CHECK: 5_000,
} as const

const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  DELAY_MS: 1_000,
} as const

// Configuration types
interface ScreenshotConfig {
  name: string
  url: string
  viewport: Viewport
  description: string
  waitForSelector?: string
}

interface GeneratorOptions {
  outputDir: string
  baseUrl: string
  waitAfterLoad: number
}

// Environment configuration with validation
function getConfig(): GeneratorOptions {
  const outputDir = process.env.SCREENSHOT_OUTPUT_DIR || 'public/screenshots'
  const baseUrl = process.env.SCREENSHOT_BASE_URL || 'http://localhost:5173'
  const waitAfterLoad = parseInt(process.env.SCREENSHOT_WAIT || '2000', 10)

  if (isNaN(waitAfterLoad) || waitAfterLoad < 0) {
    throw new Error('SCREENSHOT_WAIT must be a positive number')
  }

  return {
    outputDir: resolve(process.cwd(), outputDir),
    baseUrl,
    waitAfterLoad,
  }
}

// Screenshot configurations
const SCREENSHOTS: ScreenshotConfig[] = [
  {
    name: 'home-mobile.png',
    url: '/',
    viewport: { width: 390, height: 844 }, // iPhone 12 Pro
    description: 'Home - Mobile',
  },
  {
    name: 'home-desktop.png',
    url: '/',
    viewport: { width: 1920, height: 1080 },
    description: 'Home - Desktop',
  },
  {
    name: 'explore-mobile.png',
    url: '/explore',
    viewport: { width: 390, height: 844 },
    description: 'Explore - Mobile',
    waitForSelector: '.post-grid',
  },
  {
    name: 'explore-desktop.png',
    url: '/explore',
    viewport: { width: 1920, height: 1080 },
    description: 'Explore - Desktop',
    waitForSelector: '.post-grid',
  },
]

/**
 * Check if development server is running
 */
async function checkServer(baseUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS.SERVER_CHECK)

    const response = await fetch(baseUrl, { signal: controller.signal })
    clearTimeout(timeoutId)

    return response.ok
  } catch {
    return false
  }
}

/**
 * Wait with exponential backoff
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generate a single screenshot with retry logic
 */
async function generateScreenshot(
  browser: Browser,
  config: ScreenshotConfig,
  options: GeneratorOptions,
  attempt = 1
): Promise<void> {
  const { name, url, viewport, description, waitForSelector } = config
  const outputPath = resolve(options.outputDir, name)

  console.log(`📸 Generating: ${description} (attempt ${attempt}/${RETRY_CONFIG.MAX_ATTEMPTS})`)
  console.log(`   URL: ${options.baseUrl}${url}`)
  console.log(`   Size: ${viewport.width}x${viewport.height}`)

  const page = await browser.newPage()

  try {
    await page.setViewport(viewport)

    await page.goto(`${options.baseUrl}${url}`, {
      waitUntil: 'networkidle2',
      timeout: TIMEOUTS.PAGE_LOAD,
    })

    // Wait for specific selector if provided
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: TIMEOUTS.PAGE_LOAD })
    }

    // Wait for animations and content to settle
    await sleep(options.waitAfterLoad)

    await page.screenshot({
      path: outputPath,
      fullPage: false,
    })

    console.log(`✅ Saved: ${name}\n`)
  } catch (err) {
    const error = err as Error
    console.error(`❌ Failed to generate ${name}: ${error.message}`)

    if (attempt < RETRY_CONFIG.MAX_ATTEMPTS) {
      console.log(`🔄 Retrying in ${RETRY_CONFIG.DELAY_MS}ms...\n`)
      await sleep(RETRY_CONFIG.DELAY_MS * attempt) // Exponential backoff
      await page.close()
      return generateScreenshot(browser, config, options, attempt + 1)
    }

    console.log('')
    throw error
  } finally {
    await page.close().catch((error) => {
      console.warn(`Warning: Failed to close page: ${error.message}`)
    })
  }
}

/**
 * Initialize browser instance
 */
async function initBrowser(): Promise<Browser> {
  console.log('🚀 Launching browser...')

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // Prevent memory issues
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  })

  console.log('✅ Browser launched\n')
  return browser
}

/**
 * Ensure output directory exists
 */
function ensureOutputDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
    console.log(`📁 Created output directory: ${dir}\n`)
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  console.log('📸 PWA Screenshot Generator')
  console.log('═'.repeat(60))
  console.log('')

  const config = getConfig()

  // Check server availability
  console.log('🔍 Checking development server...')
  const serverRunning = await checkServer(config.baseUrl)

  if (!serverRunning) {
    throw new Error(
      `Development server not running at ${config.baseUrl}\n\n` +
        'Please start the dev server first:\n' +
        '  bun run dev\n\n' +
        'Then run this script in another terminal'
    )
  }

  console.log('✅ Development server is running\n')

  ensureOutputDir(config.outputDir)

  const browser = await initBrowser()

  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ name: string; error: string }>,
  }

  try {
    for (const screenshotConfig of SCREENSHOTS) {
      try {
        await generateScreenshot(browser, screenshotConfig, config)
        results.success++
      } catch (err) {
        results.failed++
        results.errors.push({
          name: screenshotConfig.name,
          error: (err as Error).message,
        })
      }
    }
  } finally {
    await browser.close()
  }

  // Summary
  console.log('═'.repeat(60))
  console.log(`✅ Screenshot generation complete!`)
  console.log(`   Success: ${results.success}`)
  console.log(`   Failed: ${results.failed}`)
  console.log('')
  console.log(`📁 Output directory: ${config.outputDir}`)

  if (results.errors.length > 0) {
    console.log('\n❌ Failed screenshots:')
    results.errors.forEach(({ name, error }) => {
      console.log(`   - ${name}: ${error}`)
    })
  }

  console.log('\n💡 Next steps:')
  console.log('  1. Review screenshot quality')
  console.log('  2. Adjust content if needed')
  console.log('  3. Commit to repository')

  if (results.failed > 0) {
    process.exit(1)
  }
}

// Execute with proper error handling
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('\n❌ Fatal error:', (err as Error).message)
    process.exit(1)
  })
}

export { generateScreenshot, checkServer, type ScreenshotConfig, type GeneratorOptions }
