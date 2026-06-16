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

import { writeFileSync } from 'fs'
import { resolve } from 'path'

const SITEMAP_PATH = resolve(process.cwd(), 'public/sitemap.xml')
const BASE_URL = 'https://momichan.com'
const DRY_RUN = process.argv.includes('--dry-run')

// 支持的语言
const LANGUAGES = ['zh-CN', 'zh-TW', 'ja', 'en']

/**
 * 可被搜索引擎索引的公开路由。
 * 仅收录当前真实公开页面，避免与 robots.txt 产生漂移。
 */
const ROUTES = [
  {
    path: '/',
    priority: 1.0,
    changefreq: 'daily',
    multilang: true,
  },
  {
    path: '/explore',
    priority: 0.9,
    changefreq: 'daily',
    multilang: false,
  },
  {
    path: '/search',
    priority: 0.8,
    changefreq: 'weekly',
    multilang: false,
  },
  {
    path: '/authors',
    priority: 0.8,
    changefreq: 'weekly',
    multilang: false,
  },
  {
    path: '/community',
    priority: 0.7,
    changefreq: 'daily',
    multilang: false,
  },
  {
    path: '/schedule',
    priority: 0.8,
    changefreq: 'weekly',
    multilang: false,
  },
  {
    path: '/about',
    priority: 0.6,
    changefreq: 'monthly',
    multilang: false,
  },
  {
    path: '/contact',
    priority: 0.5,
    changefreq: 'monthly',
    multilang: false,
  },
]

/**
 * 生成 URL 条目
 * @param {Object} route - 路由配置对象
 * @param {string} route.path - 路由路径
 * @param {number} route.priority - SEO 优先级 (0.0-1.0)
 * @param {string} route.changefreq - 更新频率
 * @param {boolean} route.multilang - 是否支持多语言
 * @param {string} lastmod - 最后修改日期 (ISO 格式)
 * @returns {string} XML 格式的 URL 条目
 */
function generateUrlEntry(route, lastmod) {
  const loc = `${BASE_URL}${route.path}`
  const parts = [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${route.changefreq}</changefreq>`,
    `    <priority>${route.priority}</priority>`,
  ]

  // 添加多语言支持
  if (route.multilang) {
    const langLinks = LANGUAGES.map(
      (lang) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${loc}" />`
    )
    parts.push(...langLinks)
  }

  parts.push('  </url>')

  return parts.join('\n')
}

/**
 * 生成完整的 sitemap
 * @returns {string} 完整的 sitemap XML 内容
 */
function generateSitemap() {
  const timestamp = new Date().toISOString()
  const lastmod = timestamp.split('T')[0]

  const header = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    '  ',
    `  <!-- 自动生成于 ${timestamp} -->`,
    '  <!-- 使用 scripts/generate-sitemap.js 生成 -->',
    '  ',
  ]

  const urlEntries = ROUTES.map((route) => generateUrlEntry(route, lastmod))

  const footer = ['</urlset>']

  return [...header, ...urlEntries, ...footer].join('\n')
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
  console.log('')
  console.log('💡 Next steps:')
  console.log('  1. Verify sitemap: https://www.xml-sitemaps.com/validate-xml-sitemap.html')
  console.log('  2. Submit to Google: https://search.google.com/search-console')
  console.log('  3. Submit to Bing: https://www.bing.com/webmasters')
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

    // 生成 sitemap
    const sitemap = generateSitemap()

    // 验证
    validateSitemap(sitemap)

    if (DRY_RUN) {
      showPreview(sitemap)
      process.exit(0)
    }

    // 写入文件
    writeFileSync(SITEMAP_PATH, sitemap, 'utf-8')

    showSuccess(SITEMAP_PATH, sitemap.length)
  } catch (error) {
    console.error('❌ Failed to generate sitemap:', error.message)
    process.exit(1)
  }
}

// 执行主函数
main()
