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
  visualState?: VisualState
}

interface GeneratorOptions {
  outputDir: string
  baseUrl: string
  waitAfterLoad: number
  screenshotConfigs: ScreenshotConfig[]
}

interface VisualState {
  preset?: string
  colorMode?: 'light' | 'dark'
  density?: 'compact' | 'comfortable' | 'spacious'
  locale?: string
}

// Environment configuration with validation
function getConfig(): GeneratorOptions {
  const outputDir = process.env.SCREENSHOT_OUTPUT_DIR || 'public/screenshots'
  const baseUrl = process.env.SCREENSHOT_BASE_URL || 'http://localhost:5173'
  const waitAfterLoad = parseInt(process.env.SCREENSHOT_WAIT || '2000', 10)
  const screenshotConfigs = expandScreenshots(SCREENSHOTS)

  if (isNaN(waitAfterLoad) || waitAfterLoad < 0) {
    throw new Error('SCREENSHOT_WAIT must be a positive number')
  }

  return {
    outputDir: resolve(process.cwd(), outputDir),
    baseUrl,
    waitAfterLoad,
    screenshotConfigs,
  }
}

function parseCsv(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function appendVariantSuffix(filename: string, suffix: string): string {
  const lastDotIndex = filename.lastIndexOf('.')
  if (lastDotIndex === -1) return `${filename}--${suffix}`
  return `${filename.slice(0, lastDotIndex)}--${suffix}${filename.slice(lastDotIndex)}`
}

function expandScreenshots(baseConfigs: ScreenshotConfig[]): ScreenshotConfig[] {
  const presets = parseCsv(process.env.SCREENSHOT_PRESETS)
  const colorModes = parseCsv(process.env.SCREENSHOT_COLOR_MODES) as Array<'light' | 'dark'>
  const densities = parseCsv(process.env.SCREENSHOT_DENSITIES) as Array<
    'compact' | 'comfortable' | 'spacious'
  >
  const locale = process.env.SCREENSHOT_LOCALE || 'zh-CN'

  const shouldExpand = presets.length > 0 || colorModes.length > 0 || densities.length > 0

  if (!shouldExpand) {
    return baseConfigs
  }

  const resolvedPresets = presets.length > 0 ? presets : ['minimal-editorial']
  const resolvedColorModes = colorModes.length > 0 ? colorModes : ['light']
  const resolvedDensities = densities.length > 0 ? densities : ['comfortable']

  return baseConfigs.flatMap((config) =>
    resolvedPresets.flatMap((preset) =>
      resolvedColorModes.flatMap((colorMode) =>
        resolvedDensities.map((density) => {
          const suffix = [preset, colorMode, density].join('--')
          return {
            ...config,
            name: appendVariantSuffix(config.name, suffix),
            description: `${config.description} [${preset} / ${colorMode} / ${density}]`,
            visualState: {
              preset,
              colorMode,
              density,
              locale,
            },
          }
        })
      )
    )
  )
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
  {
    name: 'search-desktop.png',
    url: '/search?q=design',
    viewport: { width: 1920, height: 1080 },
    description: 'Search - Desktop',
    waitForSelector: '.search-page',
  },
  {
    name: 'community-desktop.png',
    url: '/community',
    viewport: { width: 1920, height: 1080 },
    description: 'Community - Desktop',
    waitForSelector: '.community-page',
  },
  {
    name: 'schedule-desktop.png',
    url: '/schedule',
    viewport: { width: 1920, height: 1080 },
    description: 'Schedule - Desktop',
    waitForSelector: '.schedule-page',
  },
  {
    name: 'login-desktop.png',
    url: '/login',
    viewport: { width: 1440, height: 960 },
    description: 'Login - Desktop',
    waitForSelector: '.auth-page--login',
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
 * Generate mock post data for screenshots
 */
function generateMockPosts(count: number) {
  const tags = ['风景', '人物', '动物', '建筑', '美食', '旅行', '艺术', '自然']
  const platforms = ['pixiv', 'twitter', 'danbooru', 'gelbooru']

  return Array.from({ length: count }, (_, i) => ({
    id: `post-${i + 1}`,
    title: `精美作品 ${i + 1}`,
    description: '这是一张精美的图片作品',
    media_url: `https://picsum.photos/seed/${i + 1}/800/1200`,
    thumbnail_url: `https://picsum.photos/seed/${i + 1}/400/600`,
    media_type: 'image',
    width: 800,
    height: 1200,
    file_size: 1024000,
    tags: tags.slice(0, Math.floor(Math.random() * 3) + 2),
    author: {
      id: `author-${(i % 5) + 1}`,
      name: `创作者${(i % 5) + 1}`,
      avatar: `https://i.pravatar.cc/150?img=${(i % 5) + 1}`,
      post_count: Math.floor(Math.random() * 1000) + 100,
    },
    platform: platforms[i % platforms.length],
    platform_id: `${platforms[i % platforms.length]}_${i + 1}`,
    view_count: Math.floor(Math.random() * 10000) + 100,
    like_count: Math.floor(Math.random() * 1000) + 10,
    favorite_count: Math.floor(Math.random() * 500) + 5,
    comment_count: Math.floor(Math.random() * 100) + 1,
    created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }))
}

/**
 * Generate mock author data for screenshots
 */
function generateMockAuthors(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `author-${i + 1}`,
    name: `创作者${i + 1}`,
    avatar: `https://i.pravatar.cc/150?img=${i + 1}`,
    bio: `这是创作者${i + 1}的个人简介`,
    post_count: Math.floor(Math.random() * 1000) + 100,
    follower_count: Math.floor(Math.random() * 5000) + 500,
    following_count: Math.floor(Math.random() * 500) + 50,
    created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
  }))
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

    if (config.visualState) {
      await page.evaluateOnNewDocument((visualState: VisualState) => {
        try {
          if (visualState.locale) {
            window.localStorage.setItem('locale', visualState.locale)
          }

          if (visualState.colorMode) {
            window.localStorage.setItem(
              'theme',
              JSON.stringify({
                theme: visualState.colorMode,
              })
            )
          }

          window.localStorage.setItem(
            'settings',
            JSON.stringify({
              appearancePreset: visualState.preset,
              densityMode: visualState.density,
            })
          )
        } catch {
          // Ignore storage access issues in screenshot mode.
        }
      }, config.visualState)
    }

    // 拦截 API 请求，返回 mock 数据
    await page.setRequestInterception(true)
    page.on('request', (request) => {
      const url = request.url()

      // 放行非 API 请求
      if (!url.includes('/api/v1/')) {
        request.continue()
        return
      }

      // Mock API 响应
      if (url.includes('/posts')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: generateMockPosts(12),
            total: 100,
            page: 1,
            page_size: 12,
            total_pages: 9,
          }),
        })
      } else if (url.includes('/authors')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: generateMockAuthors(8),
            total: 50,
            page: 1,
            page_size: 8,
            total_pages: 7,
          }),
        })
      } else {
        // 其他 API 请求返回空数据
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0 }),
        })
      }
    })

    await page.goto(`${options.baseUrl}${url}`, {
      waitUntil: 'networkidle2',
      timeout: TIMEOUTS.PAGE_LOAD,
    })

    // Wait for specific selector if provided
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: TIMEOUTS.PAGE_LOAD })
    }

    if (config.visualState) {
      await page.waitForFunction(
        (visualState: VisualState) => {
          const root = document.documentElement
          const presetMatches =
            !visualState.preset || root.getAttribute('data-preset') === visualState.preset
          const colorModeMatches =
            !visualState.colorMode || root.getAttribute('data-color-mode') === visualState.colorMode
          const densityMatches =
            !visualState.density || root.getAttribute('data-density') === visualState.density

          return presetMatches && colorModeMatches && densityMatches
        },
        { timeout: TIMEOUTS.PAGE_LOAD },
        config.visualState
      )
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
    for (const screenshotConfig of config.screenshotConfigs) {
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
