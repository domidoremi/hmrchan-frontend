const SITE_ORIGIN = 'https://momichan.com'
const UUID_V7_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type SitemapChangeFrequency = 'daily' | 'weekly' | 'monthly'

export type SitemapEntry = {
  path: string
  changefreq: SitemapChangeFrequency
  priority: number
  lastmod?: string
}

export type SitemapCollectionSource = {
  name: 'posts' | 'authors' | 'discussions' | 'schedules'
  endpoint: string
  pathPrefix: '/post/' | '/author/' | '/community/discussions/' | '/schedule/'
  changefreq: SitemapChangeFrequency
  priority: number
  lastmodFields: readonly string[]
}

export const STATIC_SITEMAP_ENTRIES: readonly SitemapEntry[] = [
  { path: '/', priority: 1, changefreq: 'daily' },
  { path: '/explore', priority: 0.9, changefreq: 'daily' },
  { path: '/search', priority: 0.8, changefreq: 'weekly' },
  { path: '/authors', priority: 0.8, changefreq: 'weekly' },
  { path: '/community', priority: 0.7, changefreq: 'daily' },
  { path: '/schedule', priority: 0.8, changefreq: 'weekly' },
  { path: '/about', priority: 0.6, changefreq: 'monthly' },
  { path: '/contact', priority: 0.5, changefreq: 'monthly' },
]

export const SITEMAP_COLLECTION_SOURCES: readonly SitemapCollectionSource[] = [
  {
    name: 'posts',
    endpoint: '/api/v1/posts?limit=100',
    pathPrefix: '/post/',
    changefreq: 'weekly',
    priority: 0.7,
    lastmodFields: ['updated_at', 'published_at', 'created_at'],
  },
  {
    name: 'authors',
    endpoint: '/api/v1/authors?limit=100',
    pathPrefix: '/author/',
    changefreq: 'weekly',
    priority: 0.6,
    lastmodFields: ['updated_at', 'created_at'],
  },
  {
    name: 'discussions',
    endpoint: '/api/v1/discussions?limit=50',
    pathPrefix: '/community/discussions/',
    changefreq: 'daily',
    priority: 0.6,
    lastmodFields: ['last_activity_at', 'updated_at', 'created_at'],
  },
  {
    name: 'schedules',
    endpoint: '/api/v1/schedules?limit=200&published_only=true',
    pathPrefix: '/schedule/',
    changefreq: 'weekly',
    priority: 0.6,
    lastmodFields: ['updated_at', 'created_at'],
  },
]

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeLastModified(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return undefined
  return new Date(timestamp).toISOString().slice(0, 10)
}

export function createSitemapDetailEntries(
  source: SitemapCollectionSource,
  items: readonly unknown[]
): SitemapEntry[] {
  return items.flatMap((item) => {
    if (!isRecord(item)) return []
    const id = typeof item['id'] === 'string' ? item['id'].trim() : ''
    if (!id || (source.name !== 'schedules' && !UUID_V7_RE.test(id))) return []

    const lastmod = source.lastmodFields.reduce<string | undefined>(
      (resolved, field) => resolved ?? normalizeLastModified(item[field]),
      undefined
    )
    const entry: SitemapEntry = {
      path: `${source.pathPrefix}${encodeURIComponent(id)}`,
      changefreq: source.changefreq,
      priority: source.priority,
    }
    if (lastmod) entry.lastmod = lastmod
    return [entry]
  })
}

export function mergeSitemapEntries(
  staticEntries: readonly SitemapEntry[],
  dynamicEntries: readonly SitemapEntry[]
): SitemapEntry[] {
  const entries = new Map<string, SitemapEntry>()
  staticEntries.forEach((entry) => entries.set(entry.path, entry))
  dynamicEntries.forEach((entry) => entries.set(entry.path, entry))
  return Array.from(entries.values())
}

export function renderSitemap(entries: readonly SitemapEntry[]): string {
  const urlEntries = entries.map((entry) => {
    const lines = [
      '  <url>',
      `    <loc>${escapeXml(new URL(entry.path, SITE_ORIGIN).toString())}</loc>`,
    ]
    if (entry.lastmod) lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`)
    lines.push(`    <changefreq>${entry.changefreq}</changefreq>`)
    lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`)
    lines.push('  </url>')
    return lines.join('\n')
  })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <!-- Canonical public routes; dynamic details are added by the edge function. -->',
    ...urlEntries,
    '</urlset>',
    '',
  ].join('\n')
}
