#!/usr/bin/env node

/** Generates sitemap.xml and robots.txt from public routes and optional API detail resources. */
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const SITEMAP_PATH = resolve(process.cwd(), 'public/sitemap.xml')
const ROBOTS_PATH = resolve(process.cwd(), 'public/robots.txt')
const DEFAULT_PUBLIC_SITE_ORIGIN = 'https://next.momichan.com'
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
const UUID_LIKE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/

/** Public routes that are eligible for search-engine indexing. */
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

const DYNAMIC_ROUTE_SOURCES = [
  {
    endpoint: '/posts?limit=100',
    pathPrefix: '/posts/',
    collectionKeys: ['items', 'posts', 'results'],
    idKeys: ['id', 'post_id', 'uuid'],
    priority: 0.7,
    changefreq: 'daily',
  },
  {
    endpoint: '/authors?limit=100',
    pathPrefix: '/author/',
    collectionKeys: ['items', 'authors', 'results'],
    idKeys: ['id', 'author_id', 'uuid'],
    priority: 0.6,
    changefreq: 'weekly',
  },
  {
    endpoint: '/discussions?limit=100',
    pathPrefix: '/community/discussions/',
    collectionKeys: ['items', 'discussions', 'results'],
    idKeys: ['id', 'discussion_id', 'uuid'],
    priority: 0.6,
    changefreq: 'daily',
  },
  {
    endpoint: '/schedules?limit=100',
    pathPrefix: '/schedule/',
    collectionKeys: ['items', 'schedules', 'results'],
    idKeys: ['id', 'schedule_id', 'uuid'],
    priority: 0.6,
    changefreq: 'weekly',
  },
]

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isPublicResourceId(value) {
  return UUID_LIKE_RE.test(value) || ULID_RE.test(value)
}

function extractCollection(payload, keys) {
  const unwrapped = isRecord(payload) && 'data' in payload ? payload.data : payload
  if (Array.isArray(unwrapped)) return unwrapped
  if (!isRecord(unwrapped)) return []

  for (const key of keys) {
    if (Array.isArray(unwrapped[key])) return unwrapped[key]
  }

  return []
}

function resolveResourceId(item, keys) {
  if (!isRecord(item)) return null
  for (const key of keys) {
    const value = item[key]
    if (typeof value === 'string' && isPublicResourceId(value.trim())) return value.trim()
  }
  return null
}

function resolveDynamicApiBaseUrl() {
  const candidate = process.env.PUBLIC_SITEMAP_API_BASE_URL?.trim()
  if (!candidate) return null

  try {
    return new URL(candidate).toString().replace(/\/+$/, '')
  } catch {
    throw new Error(`Invalid PUBLIC_SITEMAP_API_BASE_URL: ${candidate}`)
  }
}

function dynamicRouteForPath(path) {
  const source = DYNAMIC_ROUTE_SOURCES.find((item) => path.startsWith(item.pathPrefix))
  if (!source) return null
  const id = path.slice(source.pathPrefix.length)
  if (!isPublicResourceId(id)) return null
  return { path, priority: source.priority, changefreq: source.changefreq }
}

function readPreservedDynamicRoutes() {
  try {
    const content = readFileSync(SITEMAP_PATH, 'utf-8')
    return [...content.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((match) => {
        try {
          const url = new URL(match[1])
          return url.origin === BASE_URL ? dynamicRouteForPath(url.pathname) : null
        } catch {
          return null
        }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

async function fetchDynamicRoutes(apiBaseUrl) {
  const routeGroups = await Promise.all(
    DYNAMIC_ROUTE_SOURCES.map(async (source) => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      try {
        const response = await fetch(`${apiBaseUrl}${source.endpoint}`, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'MomiChan-Sitemap/1.0',
          },
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return extractCollection(await response.json(), source.collectionKeys)
          .map((item) => resolveResourceId(item, source.idKeys))
          .filter(Boolean)
          .map((id) => ({
            path: `${source.pathPrefix}${id}`,
            priority: source.priority,
            changefreq: source.changefreq,
          }))
      } catch (error) {
        console.warn(
          `Dynamic sitemap source unavailable (${source.endpoint}): ${error instanceof Error ? error.message : String(error)}`
        )
        return []
      } finally {
        clearTimeout(timeout)
      }
    })
  )

  return routeGroups.flat()
}

async function resolveDynamicRoutes() {
  const preservedRoutes = readPreservedDynamicRoutes()
  const apiBaseUrl = resolveDynamicApiBaseUrl()
  const fetchedRoutes = apiBaseUrl ? await fetchDynamicRoutes(apiBaseUrl) : []
  const routesByPath = new Map()

  for (const route of [...preservedRoutes, ...fetchedRoutes]) {
    routesByPath.set(route.path, route)
  }

  return [...routesByPath.values()].sort((left, right) => left.path.localeCompare(right.path))
}

function generateUrlEntry(route) {
  const loc = `${BASE_URL}${route.path}`
  const parts = [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <changefreq>${route.changefreq}</changefreq>`,
    `    <priority>${route.priority}</priority>`,
  ]

  parts.push('  </url>')

  return parts.join('\n')
}

function generateSitemap(routes) {
  const header = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  ',
    '  <!-- 使用 scripts/generate-sitemap.js 生成 -->',
    '  ',
  ]

  const urlEntries = routes.map((route) => generateUrlEntry(route))

  const footer = ['</urlset>']

  return `${[...header, ...urlEntries, ...footer].join('\n')}\n`
}

function generateRobots() {
  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${BASE_URL}/sitemap.xml`, ''].join('\n')
}

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

  for (const validation of validations) {
    if (!validation.test()) {
      throw new Error(validation.error)
    }
  }

  const urlCount = (content.match(/<url>/g) || []).length
  if (urlCount === 0) {
    throw new Error('No URLs found in sitemap')
  }

  console.log(`✅ Sitemap validation passed (${urlCount} URLs)`)
  return true
}

function showPreview(content, lines = 20) {
  console.log('🔍 Dry run mode - no files modified')
  console.log('')
  console.log('Preview:')
  console.log('─'.repeat(60))
  console.log(content.split('\n').slice(0, lines).join('\n'))
  console.log('...')
  console.log('─'.repeat(60))
}

function showSuccess(path, size) {
  console.log(`✅ Sitemap generated successfully`)
  console.log(`📁 Output: ${path}`)
  console.log(`📊 Size: ${(size / 1024).toFixed(2)} KB`)
}

async function main() {
  try {
    console.log('🗺️  Generating sitemap...')
    console.log(`📍 Base URL: ${BASE_URL}`)
    const dynamicRoutes = await resolveDynamicRoutes()
    const routes = [...ROUTES, ...dynamicRoutes]
    console.log(`📄 Routes: ${routes.length} (${dynamicRoutes.length} dynamic)`)
    console.log('')

    const sitemap = generateSitemap(routes)
    const robots = generateRobots()

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

    writeFileSync(SITEMAP_OUTPUT_PATH, sitemap, 'utf-8')
    writeFileSync(ROBOTS_OUTPUT_PATH, robots, 'utf-8')

    showSuccess(SITEMAP_OUTPUT_PATH, sitemap.length)
    console.log(`🤖 Robots output: ${ROBOTS_OUTPUT_PATH}`)
  } catch (error) {
    console.error('❌ Failed to generate sitemap:', error.message)
    process.exit(1)
  }
}

main()
