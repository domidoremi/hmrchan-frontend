#!/usr/bin/env node
/**
 * 自动生成 sitemap.xml
 *
 * 功能：
 * - 从路由配置自动生成 sitemap
 * - 支持多语言 hreflang 标签
 * - 自动设置优先级和更新频率
 * - 支持动态路由（需要从 API 获取）
 *
 * 使用：
 *   node scripts/generate-sitemap.js [--dry-run]
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const SITEMAP_PATH = resolve(process.cwd(), 'public/sitemap.xml')
const ROBOTS_PATH = resolve(process.cwd(), 'public/robots.txt')
const I18N_SOURCE_PATH = resolve(process.cwd(), 'src/i18n/locales.ts')
const DEFAULT_PUBLIC_SITE_ORIGIN = 'https://momichan.xyz'
const DRY_RUN = process.argv.includes('--dry-run')
const outputArgIndex = process.argv.indexOf('--output')
const robotsOutputArgIndex = process.argv.indexOf('--robots-output')
const SITEMAP_OUTPUT_PATH =
  outputArgIndex >= 0 && process.argv[outputArgIndex + 1]
    ? resolve(process.cwd(), process.argv[outputArgIndex + 1])
    : SITEMAP_PATH
const ROBOTS_OUTPUT_PATH =
  robotsOutputArgIndex >= 0 && process.argv[robotsOutputArgIndex + 1]
    ? resolve(process.cwd(), process.argv[robotsOutputArgIndex + 1])
    : ROBOTS_PATH

function resolvePublicSiteOrigin() {
  const candidate = process.env.PUBLIC_SITE_ORIGIN?.trim() || DEFAULT_PUBLIC_SITE_ORIGIN
  try {
    return new URL(candidate).origin
  } catch {
    throw new Error(`Invalid PUBLIC_SITE_ORIGIN: ${candidate}`)
  }
}

const BASE_URL = resolvePublicSiteOrigin()

function resolveSupportedLocales() {
  const content = readFileSync(I18N_SOURCE_PATH, 'utf-8')
  const match = content.match(
    /export\s+const\s+supportedLocales(?:\s*:\s*[^=]+)?\s*=\s*\[([\s\S]*?)\]/
  )
  const locales = match?.[1]?.match(/['"]([^'"]+)['"]/g)?.map((item) => item.slice(1, -1)) ?? []

  if (locales.length === 0) {
    throw new Error('Cannot resolve supportedLocales from src/i18n/locales.ts')
  }

  return locales
}

const LANGUAGES = resolveSupportedLocales()

/**
 * 可被搜索引擎索引的公开路由。
 * 仅收录当前真实公开页面，避免与 robots.txt 产生漂移。
 */
const ROUTES = [
  {
    path: '/',
    priority: 1.0,
    changefreq: 'daily',
  },
  {
    path: '/explore',
    priority: 0.9,
    changefreq: 'daily',
  },
  {
    path: '/community',
    priority: 0.7,
    changefreq: 'daily',
  },
  {
    path: '/schedule',
    priority: 0.8,
    changefreq: 'weekly',
  },
  {
    path: '/about',
    priority: 0.6,
    changefreq: 'monthly',
  },
  {
    path: '/contact',
    priority: 0.5,
    changefreq: 'monthly',
  },
  {
    path: '/join-us',
    priority: 0.6,
    changefreq: 'monthly',
  },
]

/**
 * 生成 URL 条目
 * @param {Object} route - 路由配置对象
 * @param {string} route.path - 路由路径
 * @param {number} route.priority - SEO 优先级 (0.0-1.0)
 * @param {string} route.changefreq - 更新频率
 * @returns {string} XML 格式的 URL 条目
 */
function generateUrlEntry(route) {
  const loc = `${BASE_URL}${route.path}`
  const parts = [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <changefreq>${route.changefreq}</changefreq>`,
    `    <priority>${route.priority}</priority>`,
  ]

  const langLinks = LANGUAGES.map(
    (lang) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${loc}" />`
  )
  parts.push(...langLinks)

  parts.push('  </url>')

  return parts.join('\n')
}

/**
 * 生成完整的 sitemap
 * @returns {string} 完整的 sitemap XML 内容
 */
function generateSitemap() {
  const header = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    '  ',
    '  <!-- 使用 scripts/generate-sitemap.js 生成 -->',
    '  ',
  ]

  const urlEntries = ROUTES.map((route) => generateUrlEntry(route))

  const footer = ['</urlset>']

  return `${[...header, ...urlEntries, ...footer].join('\n')}\n`
}

function generateRobots() {
  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${BASE_URL}/sitemap.xml`, ''].join('\n')
}

/**
 * 验证 sitemap 格式
 * @param {string} content - sitemap XML 内容
 * @returns {boolean} 验证是否通过
 * @throws {Error} 验证失败时抛出错误
 */
function validateSitemap(content) {
  const validations = [
    {
      test: () => content.includes('<?xml version="1.0"'),
      error: 'Missing XML declaration',
    },
    {
      test: () => content.includes('<urlset'),
      error: 'Missing urlset element',
    },
    {
      test: () => content.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'),
      error: 'Missing sitemap namespace',
    },
  ]

  // 执行所有验证
  for (const validation of validations) {
    if (!validation.test()) {
      throw new Error(validation.error)
    }
  }

  // 检查 URL 数量
  const urlCount = (content.match(/<url>/g) || []).length
  if (urlCount === 0) {
    throw new Error('No URLs found in sitemap')
  }

  console.log(`✅ Sitemap validation passed (${urlCount} URLs)`)
  return true
}

/**
 * 显示预览
 * @param {string} content - sitemap 内容
 * @param {number} lines - 预览行数
 */
function showPreview(content, lines = 20) {
  console.log('🔍 Dry run mode - no files modified')
  console.log('')
  console.log('Preview:')
  console.log('─'.repeat(60))
  console.log(content.split('\n').slice(0, lines).join('\n'))
  console.log('...')
  console.log('─'.repeat(60))
}

/**
 * 显示成功信息
 * @param {string} path - 文件路径
 * @param {number} size - 文件大小（字节）
 */
function showSuccess(path, size) {
  console.log(`✅ Sitemap generated successfully`)
  console.log(`📁 Output: ${path}`)
  console.log(`📊 Size: ${(size / 1024).toFixed(2)} KB`)
}

/**
 * 主执行函数
 */
async function main() {
  try {
    console.log('🗺️  Generating sitemap...')
    console.log(`📍 Base URL: ${BASE_URL}`)
    console.log(`📄 Routes: ${ROUTES.length}`)
    console.log(`🌐 Languages: ${LANGUAGES.join(', ')}`)
    console.log('')

    // 生成 sitemap / robots
    const sitemap = generateSitemap()
    const robots = generateRobots()

    // 验证
    validateSitemap(sitemap)

    if (DRY_RUN) {
      showPreview(sitemap)
      console.log('')
      console.log('Robots:')
      console.log('─'.repeat(60))
      console.log(robots.trimEnd())
      console.log('─'.repeat(60))
      process.exit(0)
    }

    // 写入文件
    writeFileSync(SITEMAP_OUTPUT_PATH, sitemap, 'utf-8')
    writeFileSync(ROBOTS_OUTPUT_PATH, robots, 'utf-8')

    showSuccess(SITEMAP_OUTPUT_PATH, sitemap.length)
    console.log(`🤖 Robots output: ${ROBOTS_OUTPUT_PATH}`)
  } catch (error) {
    console.error('❌ Failed to generate sitemap:', error.message)
    process.exit(1)
  }
}

// 执行主函数
main()
