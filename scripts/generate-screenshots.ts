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
  apiMode: 'mock' | 'live'
  screenshotConfigs: ScreenshotConfig[]
}

interface VisualState {
  preset?: string
  colorMode?: 'light' | 'dark'
  locale?: string
}

// Environment configuration with validation
function getConfig(): GeneratorOptions {
  const outputDir = process.env.SCREENSHOT_OUTPUT_DIR || 'public/screenshots'
  const baseUrl = process.env.SCREENSHOT_BASE_URL || 'http://127.0.0.1:5173'
  const waitAfterLoad = parseInt(process.env.SCREENSHOT_WAIT || '2000', 10)
  const apiMode = process.env.SCREENSHOT_API_MODE === 'live' ? 'live' : 'mock'
  const screenshotConfigs = expandScreenshots(SCREENSHOTS)

  if (isNaN(waitAfterLoad) || waitAfterLoad < 0) {
    throw new Error('SCREENSHOT_WAIT must be a positive number')
  }

  return {
    outputDir: resolve(process.cwd(), outputDir),
    baseUrl,
    waitAfterLoad,
    apiMode,
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
  const locale = process.env.SCREENSHOT_LOCALE || 'zh-CN'

  const shouldExpand = presets.length > 0 || colorModes.length > 0

  if (!shouldExpand) {
    return baseConfigs
  }

  const resolvedPresets = presets.length > 0 ? presets : ['minimal-editorial']
  const resolvedColorModes = colorModes.length > 0 ? colorModes : ['light']

  return baseConfigs.flatMap((config) =>
    resolvedPresets.flatMap((preset) =>
      resolvedColorModes.map((colorMode) => {
        const suffix = [preset, colorMode].join('--')
        return {
          ...config,
          name: appendVariantSuffix(config.name, suffix),
          description: `${config.description} [${preset} / ${colorMode}]`,
          visualState: {
            preset,
            colorMode,
            locale,
          },
        }
      })
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
    viewport: { width: 1440, height: 960 },
    description: 'Home - Desktop',
  },
  {
    name: 'explore-mobile.png',
    url: '/explore',
    viewport: { width: 390, height: 844 },
    description: 'Explore - Mobile',
    waitForSelector: '.explore-editorial-grid',
  },
  {
    name: 'explore-desktop.png',
    url: '/explore',
    viewport: { width: 1440, height: 960 },
    description: 'Explore - Desktop',
    waitForSelector: '.explore-editorial-grid',
  },
  {
    name: 'search-desktop.png',
    url: '/search?q=design',
    viewport: { width: 1440, height: 960 },
    description: 'Search - Desktop',
    waitForSelector: '.search-page',
  },
  {
    name: 'community-desktop.png',
    url: '/community',
    viewport: { width: 1440, height: 960 },
    description: 'Community - Desktop',
    waitForSelector: '.community-page',
  },
  {
    name: 'schedule-desktop.png',
    url: '/schedule',
    viewport: { width: 1440, height: 960 },
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
  const tags = ['籾山ひめり', '高嶺のなでしこ', '舞台', '日常', '应援', '直播', '照片', '回忆']
  const platforms = ['official', 'x', 'instagram', 'youtube']
  const media = [
    '/snapshot-media/home/hero-spotlight-f2e0f8f6-0434-4e37-874e-bb9b506585bf.webp',
    '/snapshot-media/home/story-1-90c52c15-ab0a-473d-8981-f2420a91fdc1.webp',
    '/snapshot-media/home/featured-2-5acfcb8e-235b-4c81-91cc-7711b043005a.webp',
    '/snapshot-media/home/story-0-403aefeb-e9e2-4f16-884d-1875ee34916f.webp',
    '/snapshot-media/home/featured-1-bb51c72a-fd3d-4439-b009-8db595568e36.webp',
  ]

  return Array.from({ length: count }, (_, i) => ({
    id: `post-${i + 1}`,
    title: `ひめり相册 · ${String(i + 1).padStart(2, '0')}`,
    description: '舞台与日常里，值得一起收藏的一刻。',
    media_url: media[i % media.length],
    thumbnail_url: media[i % media.length],
    media_type: 'image',
    width: 800,
    height: 1200,
    file_size: 1024000,
    tags: [tags[i % tags.length], tags[(i + 2) % tags.length]],
    author: {
      id: `author-${(i % 5) + 1}`,
      name: ['ひめり相册', '舞台来信', 'なでしこ手帐', '粉色应援团', '周末放送'][i % 5],
      avatar: media[(i + 1) % media.length],
      post_count: 120 + i * 17,
    },
    platform: platforms[i % platforms.length],
    platform_id: `${platforms[i % platforms.length]}_${i + 1}`,
    view_count: 2400 + i * 317,
    like_count: 240 + i * 29,
    favorite_count: 90 + i * 13,
    comment_count: 12 + i * 3,
    created_at: new Date(Date.UTC(2026, 6, 17, 12) - i * 3_600_000).toISOString(),
    updated_at: new Date(Date.UTC(2026, 6, 17, 12)).toISOString(),
  }))
}

/**
 * Generate mock author data for screenshots
 */
function generateMockAuthors(count: number) {
  const names = ['ひめり相册', '舞台来信', 'なでしこ手帐', '粉色应援团', '周末放送']
  const avatars = [
    '/snapshot-media/home/hero-spotlight-f2e0f8f6-0434-4e37-874e-bb9b506585bf.webp',
    '/snapshot-media/home/story-1-90c52c15-ab0a-473d-8981-f2420a91fdc1.webp',
    '/snapshot-media/home/story-0-403aefeb-e9e2-4f16-884d-1875ee34916f.webp',
    '/snapshot-media/home/featured-2-5acfcb8e-235b-4c81-91cc-7711b043005a.webp',
    '/snapshot-media/home/featured-1-bb51c72a-fd3d-4439-b009-8db595568e36.webp',
  ]

  return Array.from({ length: count }, (_, i) => ({
    id: `author-${i + 1}`,
    name: names[i % names.length],
    avatar: avatars[i % avatars.length],
    bio: '记录籾山ひめり与高嶺のなでしこ的舞台、日常和应援回忆。',
    post_count: 120 + i * 17,
    follower_count: 880 + i * 213,
    following_count: 32 + i * 7,
    created_at: new Date(Date.UTC(2025, 6, 17) + i * 86_400_000).toISOString(),
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

          const persistedSettings = JSON.parse(window.localStorage.getItem('settings') || '{}')
          window.localStorage.setItem(
            'settings',
            JSON.stringify({
              ...persistedSettings,
              settings: {
                ...(persistedSettings.settings || {}),
                appearancePreset: visualState.preset,
                enableAnimations: false,
                animationIntensity: 'none',
              },
            })
          )
        } catch {
          // Ignore storage access issues in screenshot mode.
        }
      }, config.visualState)
    }

    if (options.apiMode === 'mock') {
      await page.setRequestInterception(true)
      page.on('request', (request) => {
        const url = request.url()

        if (!url.includes('/api/v1/')) {
          request.continue()
          return
        }

        if (url.includes('/posts')) {
          request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              items: generateMockPosts(12),
              next_cursor: null,
              has_more: false,
            }),
          })
        } else if (url.includes('/authors')) {
          request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              items: generateMockAuthors(8),
              next_cursor: null,
              has_more: false,
            }),
          })
        } else {
          request.respond({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({
              detail: 'Screenshot mode uses tracked public snapshots for this surface.',
            }),
          })
        }
      })
    }

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

          return presetMatches && colorModeMatches
        },
        { timeout: TIMEOUTS.PAGE_LOAD },
        config.visualState
      )
    }

    // Wait for animations and content to settle
    await sleep(options.waitAfterLoad)

    // The Vite-only Vue DevTools launcher is not part of the product UI.
    await page.evaluate(() => {
      document.getElementById('__vue-devtools-container__')?.remove()
    })

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
if (import.meta.main) {
  main().catch((err) => {
    console.error('\n❌ Fatal error:', (err as Error).message)
    process.exit(1)
  })
}

export { generateScreenshot, checkServer, type ScreenshotConfig, type GeneratorOptions }
