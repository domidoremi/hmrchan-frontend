import { readFile, readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { join, relative } from 'path'
import type { AuditModule, AuditIssue, AuditOptions, AuditResult } from './types'
import { summarizeAuditIssues } from './utils'

const REQUIRED_MANIFEST_FIELDS = ['name', 'short_name', 'icons', 'start_url', 'display'] as const
const I18N_LOCALE_CONTRACT_FILE = 'src/i18n/locales.ts'
const SITEMAP_GENERATOR_FILE = 'scripts/generate-sitemap.js'
const PUBLIC_ASSET_BUDGETS = [
  {
    label: 'PWA icon',
    root: 'public/icons',
    extensions: ['.png', '.webp'],
    maxBytes: 320 * 1024,
  },
  {
    label: 'HMRChan font',
    root: 'public/hmrchan/reference',
    extensions: ['.otf', '.woff', '.woff2'],
    maxBytes: 160 * 1024,
  },
  {
    label: 'HMRChan sprite',
    root: 'public/hmrchan/pets',
    extensions: ['.png', '.webp'],
    maxBytes: 2 * 1024 * 1024,
  },
  {
    label: 'snapshot media',
    root: 'public/snapshot-media',
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    maxBytes: 64 * 1024,
  },
] as const
const REQUIRED_INDEXED_SITEMAP_PATHS = [
  '/',
  '/explore',
  '/community',
  '/schedule',
  '/about',
  '/contact',
  '/join-us',
] as const
const NOINDEX_SITEMAP_PATHS = [
  '/settings',
  '/login',
  '/register',
  '/auth/callback',
  '/auth/passkey-recovery',
  '/profile',
  '/profile/favorites',
  '/profile/security',
  '/thank-you',
] as const
const SITE_ORIGIN = 'https://momichan.com'

function getAttribute(tag: string, attribute: string): string | null {
  const match = tag.match(new RegExp(`\\s${attribute}=["']([^"']*)["']`, 'i'))
  return match?.[1]?.trim() || null
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  )
}

function formatAssetSize(bytes: number): string {
  const kib = bytes / 1024
  return Number.isInteger(kib) ? `${kib} KiB` : `${kib.toFixed(1)} KiB`
}

function toRepoPath(options: AuditOptions, filePath: string): string {
  return relative(options.projectRoot, filePath).replace(/\\/g, '/')
}

async function listFilesRecursive(rootPath: string): Promise<string[]> {
  let entries: Awaited<ReturnType<typeof readdir>>
  try {
    entries = await readdir(rootPath, { withFileTypes: true })
  } catch (error) {
    if (isNodeErrorCode(error, 'ENOENT')) return []
    throw error
  }

  const files: string[] = []
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = join(rootPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(entryPath)))
    } else if (entry.isFile()) {
      files.push(entryPath)
    }
  }
  return files
}

function matchesAssetExtensions(filePath: string, extensions: readonly string[]): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase()
  return extensions.some((extension) => normalizedPath.endsWith(extension))
}

function findLinkTag(content: string, rel: string): string | null {
  const escapedRel = rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = content.match(
    new RegExp(`<link\\b(?=[^>]*\\brel=["']${escapedRel}["'])[^>]*>`, 'i')
  )
  return match?.[0] ?? null
}

function findMetaTag(content: string, name: string): string | null {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = content.match(
    new RegExp(`<meta\\b(?=[^>]*\\bname=["']${escapedName}["'])[^>]*>`, 'i')
  )
  return match?.[0] ?? null
}

function getDocumentLang(content: string): string | null {
  const htmlTag = content.match(/<html\b[^>]*>/i)?.[0] ?? null
  return htmlTag ? getAttribute(htmlTag, 'lang') : null
}

function getDefaultLocaleDeclaration(content: string): string | null {
  const match = content.match(
    /export\s+const\s+defaultLocale(?:\s*:\s*[^=]+)?\s*=\s*['"]([^'"]+)['"]/
  )
  return match?.[1]?.trim() || null
}

function getSupportedLocalesDeclaration(content: string): string[] {
  const match = content.match(
    /export\s+const\s+supportedLocales(?:\s*:\s*[^=]+)?\s*=\s*\[([\s\S]*?)\]/
  )
  return match?.[1]?.match(/['"]([^'"]+)['"]/g)?.map((item) => item.slice(1, -1)) ?? []
}

function getSitemapUrlEntries(content: string): string[] {
  return [...content.matchAll(/<url\b[\s\S]*?<\/url>/g)].map((match) => match[0])
}

function getSitemapLoc(entry: string): string {
  return entry.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim() || 'unknown'
}

function getSitemapLocPath(loc: string): string | null {
  try {
    return new URL(loc).pathname
  } catch {
    return null
  }
}

function getSitemapLocOrigin(loc: string): string | null {
  try {
    return new URL(loc).origin
  } catch {
    return null
  }
}

function getSitemapGeneratorRoutePaths(content: string): string[] {
  const match = content.match(/const\s+ROUTES\s*=\s*\[([\s\S]*?)\]\s*(?:as\s+const\s*)?/)
  return (
    match?.[1]
      ?.match(/path:\s*['"]([^'"]+)['"]/g)
      ?.map((item) => item.match(/['"]([^'"]+)['"]/)?.[1] ?? '')
      ?.filter(Boolean) ?? []
  )
}

type SitemapAlternateLink = {
  hreflang: string
  href: string
}

function getSitemapAlternateLinks(entry: string): SitemapAlternateLink[] {
  return [...entry.matchAll(/<xhtml:link\b(?=[^>]*\brel=["']alternate["'])[^>]*>/g)].map(
    (match) => {
      const tag = match[0]
      return {
        hreflang: getAttribute(tag, 'hreflang') ?? '',
        href: getAttribute(tag, 'href') ?? '',
      }
    }
  )
}

function doLocaleListsMatch(actual: string[], expected: string[]): boolean {
  return (
    actual.length === expected.length && actual.every((value, index) => value === expected[index])
  )
}

function validateSitemapRoutePolicy(
  indexedPaths: Set<string>,
  file: string,
  sourceLabel: string
): AuditIssue[] {
  const issues: AuditIssue[] = []
  const missingIndexedPath = REQUIRED_INDEXED_SITEMAP_PATHS.find((path) => !indexedPaths.has(path))

  if (missingIndexedPath) {
    issues.push({
      severity: 'error',
      message: `${sourceLabel} missing indexed public route: ${missingIndexedPath}`,
      file,
      rule: 'pwa-sitemap-route',
      suggestion: `Add ${new URL(missingIndexedPath, SITE_ORIGIN).toString()} to the sitemap source.`,
    })
  }

  const noindexPath = NOINDEX_SITEMAP_PATHS.find((path) => indexedPaths.has(path))

  if (noindexPath) {
    issues.push({
      severity: 'error',
      message: `${sourceLabel} must not index noindex shell route: ${noindexPath}`,
      file,
      rule: 'pwa-sitemap-route',
      suggestion: `Remove ${new URL(noindexPath, SITE_ORIGIN).toString()} from the sitemap source.`,
    })
  }

  return issues
}

function validateSitemapGeneratorRoutePolicy(routePaths: string[]): AuditIssue[] {
  const issues = validateSitemapRoutePolicy(
    new Set(routePaths),
    SITEMAP_GENERATOR_FILE,
    'scripts/generate-sitemap.js'
  )
  const allowedPaths = new Set<string>(REQUIRED_INDEXED_SITEMAP_PATHS)
  const unapprovedPath = routePaths.find((path) => !allowedPaths.has(path))

  if (unapprovedPath) {
    issues.push({
      severity: 'error',
      message: `scripts/generate-sitemap.js contains unapproved indexed route: ${unapprovedPath}`,
      file: SITEMAP_GENERATOR_FILE,
      rule: 'pwa-sitemap-route',
      suggestion: `Remove ${new URL(unapprovedPath, SITE_ORIGIN).toString()} from the static sitemap generator route list or add it to the indexed route policy.`,
    })
  }

  return issues
}

async function resolveI18nLocaleContract(options: AuditOptions): Promise<{
  defaultLocale: string | null
  supportedLocales: string[]
  issues: AuditIssue[]
}> {
  const i18nPath = join(options.projectRoot, I18N_LOCALE_CONTRACT_FILE)

  try {
    const content = await readFile(i18nPath, 'utf-8')
    const defaultLocale = getDefaultLocaleDeclaration(content)
    const supportedLocales = getSupportedLocalesDeclaration(content)
    const issues: AuditIssue[] = []

    if (!defaultLocale) {
      issues.push({
        severity: 'error',
        message: 'Cannot resolve frontend default locale from src/i18n/locales.ts',
        file: I18N_LOCALE_CONTRACT_FILE,
        rule: 'pwa-language-source',
        suggestion:
          'Export defaultLocale as a string literal so PWA language checks can bind to it.',
      })
    }

    if (supportedLocales.length === 0) {
      issues.push({
        severity: 'error',
        message: 'Cannot resolve frontend supported locales from src/i18n/locales.ts',
        file: I18N_LOCALE_CONTRACT_FILE,
        rule: 'pwa-language-source',
        suggestion:
          'Export supportedLocales as a string-literal array so PWA language checks can bind to it.',
      })
    }

    if (defaultLocale && supportedLocales.length > 0 && !supportedLocales.includes(defaultLocale)) {
      issues.push({
        severity: 'error',
        message: `defaultLocale must be included in supportedLocales: ${defaultLocale}`,
        file: I18N_LOCALE_CONTRACT_FILE,
        rule: 'pwa-language-source',
      })
    }

    return { defaultLocale, supportedLocales, issues }
  } catch {
    // Reported below as a missing locale source.
  }

  return {
    defaultLocale: null,
    supportedLocales: [],
    issues: [
      {
        severity: 'error',
        message: 'Cannot resolve frontend default locale from src/i18n/locales.ts',
        file: I18N_LOCALE_CONTRACT_FILE,
        rule: 'pwa-language-source',
        suggestion:
          'Export defaultLocale as a string literal so PWA language checks can bind to it.',
      },
    ],
  }
}

async function checkManifest(
  options: AuditOptions,
  defaultAppLocale: string
): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = []
  const manifestPath = join(options.projectRoot, 'public/manifest.json')

  let manifest: Record<string, unknown>
  try {
    const content = await readFile(manifestPath, 'utf-8')
    manifest = JSON.parse(content)
  } catch {
    issues.push({
      severity: 'error',
      message: 'Cannot read or parse public/manifest.json',
      file: 'public/manifest.json',
      rule: 'pwa-manifest',
    })
    return issues
  }

  // Verify required fields
  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (!(field in manifest) || manifest[field] === undefined || manifest[field] === null) {
      issues.push({
        severity: 'error',
        message: `manifest.json missing required field: "${field}"`,
        file: 'public/manifest.json',
        rule: 'pwa-manifest',
      })
    }
  }

  const manifestLang = typeof manifest.lang === 'string' ? manifest.lang.trim() : ''
  if (manifestLang !== defaultAppLocale) {
    issues.push({
      severity: 'error',
      message: `manifest.json lang must match default app locale: ${defaultAppLocale}`,
      file: 'public/manifest.json',
      rule: 'pwa-language',
      suggestion: `Set manifest lang to "${defaultAppLocale}".`,
    })
  }

  // Verify icon files exist
  const icons = manifest.icons as Array<{ src?: unknown }> | undefined
  if (Array.isArray(icons) && icons.length > 0) {
    for (const icon of icons) {
      if (typeof icon.src !== 'string' || icon.src.trim().length === 0) {
        issues.push({
          severity: 'error',
          message: 'manifest.json icon entry missing src',
          file: 'public/manifest.json',
          rule: 'pwa-icons',
        })
        continue
      }
      // Icon src is relative to public root (e.g. "/icons/icon-72x72.png")
      const iconPath = join(options.projectRoot, 'public', icon.src.replace(/^\//, ''))
      if (!existsSync(iconPath)) {
        issues.push({
          severity: 'error',
          message: `Declared icon file not found: ${icon.src}`,
          file: iconPath,
          rule: 'pwa-icons',
        })
      }
    }
  } else {
    issues.push({
      severity: 'error',
      message: 'manifest.json must declare at least one install icon',
      file: 'public/manifest.json',
      rule: 'pwa-icons',
    })
  }

  return issues
}

async function checkPublicAssetBudgets(options: AuditOptions): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = []

  for (const budget of PUBLIC_ASSET_BUDGETS) {
    const rootPath = join(options.projectRoot, budget.root)
    const assetPaths = await listFilesRecursive(rootPath)
    for (const assetPath of assetPaths) {
      if (!matchesAssetExtensions(assetPath, budget.extensions)) continue

      const assetStat = await stat(assetPath)
      if (assetStat.size <= budget.maxBytes) continue

      const repoPath = toRepoPath(options, assetPath)
      issues.push({
        severity: 'error',
        message: `${budget.label} exceeds ${formatAssetSize(budget.maxBytes)} budget: ${repoPath} is ${formatAssetSize(assetStat.size)}`,
        file: repoPath,
        rule: 'pwa-asset-budget',
        suggestion: `Compress or split ${repoPath} before shipping.`,
      })
    }
  }

  return issues
}

async function checkServiceWorker(options: AuditOptions): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = []
  const swSourcePath = join(options.projectRoot, 'src/sw/index.ts')
  const swPluginPath = join(options.projectRoot, 'build/vite/plugins/serviceWorkerBuild.ts')
  const viteConfigPath = join(options.projectRoot, 'vite.config.ts')

  if (!existsSync(swSourcePath)) {
    issues.push({
      severity: 'error',
      message: 'src/sw/index.ts not found',
      file: 'src/sw/index.ts',
      rule: 'pwa-sw',
    })
    return issues
  }

  if (!existsSync(swPluginPath)) {
    issues.push({
      severity: 'error',
      message: 'serviceWorkerBuild plugin not found',
      file: 'build/vite/plugins/serviceWorkerBuild.ts',
      rule: 'pwa-sw-build',
    })
  }

  try {
    const viteConfigContent = await readFile(viteConfigPath, 'utf-8')
    if (!viteConfigContent.includes('serviceWorkerBuildPlugin')) {
      issues.push({
        severity: 'error',
        message: 'vite.config.ts does not reference serviceWorkerBuildPlugin',
        file: 'vite.config.ts',
        rule: 'pwa-sw-build',
        suggestion: 'Register the dedicated SW build plugin so dist/sw.js is emitted from src/sw/',
      })
    }
  } catch {
    issues.push({
      severity: 'error',
      message: 'vite.config.ts not found',
      file: 'vite.config.ts',
      rule: 'pwa-sw-build',
    })
  }

  return issues
}

async function checkIndexHtml(
  options: AuditOptions,
  defaultAppLocale: string
): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = []
  const indexPath = join(options.projectRoot, 'index.html')

  let content: string
  try {
    content = await readFile(indexPath, 'utf-8')
  } catch {
    issues.push({
      severity: 'error',
      message: 'index.html not found in project root',
      file: 'index.html',
      rule: 'pwa-html',
    })
    return issues
  }

  if (getDocumentLang(content) !== defaultAppLocale) {
    issues.push({
      severity: 'error',
      message: `index.html html lang must match default app locale: ${defaultAppLocale}`,
      file: 'index.html',
      rule: 'pwa-language',
      suggestion: `Set <html lang="${defaultAppLocale}">.`,
    })
  }

  const manifestTag = findLinkTag(content, 'manifest')
  if (!manifestTag) {
    issues.push({
      severity: 'error',
      message: 'index.html missing <link rel="manifest"> tag',
      file: 'index.html',
      rule: 'pwa-html',
      suggestion: 'Add <link rel="manifest" href="/manifest.json" />',
    })
  } else if (getAttribute(manifestTag, 'href') !== '/manifest.json') {
    issues.push({
      severity: 'error',
      message: 'index.html manifest link must reference /manifest.json',
      file: 'index.html',
      rule: 'pwa-html',
      suggestion: 'Set <link rel="manifest" href="/manifest.json" />',
    })
  }

  const themeColorTag = findMetaTag(content, 'theme-color')
  if (!themeColorTag) {
    issues.push({
      severity: 'error',
      message: 'index.html missing <meta name="theme-color"> tag',
      file: 'index.html',
      rule: 'pwa-html',
      suggestion: 'Add <meta name="theme-color" content="#8b5cf6" />',
    })
  } else if (!getAttribute(themeColorTag, 'content')) {
    issues.push({
      severity: 'error',
      message: 'index.html theme-color meta must declare content',
      file: 'index.html',
      rule: 'pwa-html',
      suggestion: 'Set a non-empty theme-color content value.',
    })
  }

  const appleTouchIconTag = findLinkTag(content, 'apple-touch-icon')
  if (!appleTouchIconTag) {
    issues.push({
      severity: 'error',
      message: 'index.html missing <link rel="apple-touch-icon"> tag',
      file: 'index.html',
      rule: 'pwa-html',
      suggestion: 'Add <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />',
    })
  } else {
    const appleTouchIconHref = getAttribute(appleTouchIconTag, 'href')
    if (!appleTouchIconHref) {
      issues.push({
        severity: 'error',
        message: 'index.html apple-touch-icon link must declare href',
        file: 'index.html',
        rule: 'pwa-html',
        suggestion: 'Set apple-touch-icon href to an existing public icon.',
      })
    } else {
      const iconPath = join(options.projectRoot, 'public', appleTouchIconHref.replace(/^\//, ''))
      if (!existsSync(iconPath)) {
        issues.push({
          severity: 'error',
          message: `apple-touch-icon file not found: ${appleTouchIconHref}`,
          file: iconPath,
          rule: 'pwa-html',
        })
      }
    }
  }

  return issues
}

async function checkOfflineHtml(
  options: AuditOptions,
  defaultAppLocale: string
): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = []
  const offlinePath = join(options.projectRoot, 'public/offline.html')

  let content: string
  try {
    content = await readFile(offlinePath, 'utf-8')
  } catch {
    issues.push({
      severity: 'error',
      message: 'public/offline.html not found',
      file: 'public/offline.html',
      rule: 'pwa-offline',
    })
    return issues
  }

  if (getDocumentLang(content) !== defaultAppLocale) {
    issues.push({
      severity: 'error',
      message: `public/offline.html html lang must match default app locale: ${defaultAppLocale}`,
      file: 'public/offline.html',
      rule: 'pwa-language',
      suggestion: `Set <html lang="${defaultAppLocale}">.`,
    })
  }

  return issues
}

async function checkSitemap(
  options: AuditOptions,
  supportedLocales: string[]
): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = []
  const sitemapPath = join(options.projectRoot, 'public/sitemap.xml')

  let content: string
  try {
    content = await readFile(sitemapPath, 'utf-8')
  } catch {
    issues.push({
      severity: 'error',
      message: 'public/sitemap.xml not found',
      file: 'public/sitemap.xml',
      rule: 'pwa-sitemap',
    })
    return issues
  }

  const urlEntries = getSitemapUrlEntries(content)
  const localizedEntries = urlEntries.map((entry) => ({
    loc: getSitemapLoc(entry),
    alternateLinks: getSitemapAlternateLinks(entry),
  }))
  const invalidOriginEntry = localizedEntries.find(
    (entry) => getSitemapLocOrigin(entry.loc) !== SITE_ORIGIN
  )

  if (invalidOriginEntry) {
    issues.push({
      severity: 'error',
      message: `public/sitemap.xml loc origin must match ${SITE_ORIGIN}: ${invalidOriginEntry.loc}`,
      file: 'public/sitemap.xml',
      rule: 'pwa-sitemap-origin',
      suggestion: `Use ${SITE_ORIGIN} for sitemap loc URLs.`,
    })
  }

  const indexedPaths = new Set(
    localizedEntries
      .map((entry) => getSitemapLocPath(entry.loc))
      .filter((path): path is string => Boolean(path))
  )

  issues.push(
    ...validateSitemapRoutePolicy(indexedPaths, 'public/sitemap.xml', 'public/sitemap.xml')
  )

  const invalidEntry = localizedEntries.find(
    (entry) =>
      !doLocaleListsMatch(
        entry.alternateLinks.map((link) => link.hreflang),
        supportedLocales
      )
  )

  if (invalidEntry) {
    issues.push({
      severity: 'error',
      message: `public/sitemap.xml hreflang values must match supported locales for ${invalidEntry.loc}: ${supportedLocales.join(', ')}`,
      file: 'public/sitemap.xml',
      rule: 'pwa-sitemap-language',
      suggestion: 'Regenerate sitemap hreflang values from supportedLocales.',
    })
  }

  const invalidAlternateHrefEntry = localizedEntries.find((entry) =>
    entry.alternateLinks.some((link) => link.href !== entry.loc)
  )

  if (invalidAlternateHrefEntry) {
    issues.push({
      severity: 'error',
      message: `public/sitemap.xml alternate href values must match loc for ${invalidAlternateHrefEntry.loc}`,
      file: 'public/sitemap.xml',
      rule: 'pwa-sitemap-language',
      suggestion: 'Regenerate sitemap alternate links from each route loc.',
    })
  }

  return issues
}

async function checkSitemapGenerator(options: AuditOptions): Promise<AuditIssue[]> {
  const generatorPath = join(options.projectRoot, SITEMAP_GENERATOR_FILE)

  let content: string
  try {
    content = await readFile(generatorPath, 'utf-8')
  } catch {
    return [
      {
        severity: 'error',
        message: 'scripts/generate-sitemap.js not found',
        file: SITEMAP_GENERATOR_FILE,
        rule: 'pwa-sitemap-generator',
      },
    ]
  }

  const routePaths = getSitemapGeneratorRoutePaths(content)
  if (routePaths.length === 0) {
    return [
      {
        severity: 'error',
        message: 'Cannot resolve sitemap generator route list',
        file: SITEMAP_GENERATOR_FILE,
        rule: 'pwa-sitemap-generator',
      },
    ]
  }

  return validateSitemapGeneratorRoutePolicy(routePaths)
}

const pwaAudit: AuditModule = {
  name: 'pwa',

  async run(options: AuditOptions): Promise<AuditResult> {
    const start = Date.now()
    const allIssues: AuditIssue[] = []
    const localeContract = await resolveI18nLocaleContract(options)
    allIssues.push(...localeContract.issues)

    const defaultAppLocale = localeContract.defaultLocale
    if (!defaultAppLocale || localeContract.supportedLocales.length === 0) {
      const { errorCount, warningCount } = summarizeAuditIssues(allIssues)
      return {
        module: 'pwa',
        status: 'fail',
        issues: allIssues,
        summary: `Found ${errorCount} error(s) and ${warningCount} warning(s)`,
        duration: Date.now() - start,
      }
    }

    const manifestIssues = await checkManifest(options, defaultAppLocale)
    allIssues.push(...manifestIssues)

    const assetBudgetIssues = await checkPublicAssetBudgets(options)
    allIssues.push(...assetBudgetIssues)

    const swIssues = await checkServiceWorker(options)
    allIssues.push(...swIssues)

    const htmlIssues = await checkIndexHtml(options, defaultAppLocale)
    allIssues.push(...htmlIssues)

    const offlineIssues = await checkOfflineHtml(options, defaultAppLocale)
    allIssues.push(...offlineIssues)

    const sitemapIssues = await checkSitemap(options, localeContract.supportedLocales)
    allIssues.push(...sitemapIssues)

    const sitemapGeneratorIssues = await checkSitemapGenerator(options)
    allIssues.push(...sitemapGeneratorIssues)

    const { errorCount, warningCount, status } = summarizeAuditIssues(allIssues)

    const summary =
      status === 'pass'
        ? 'PWA configuration is complete'
        : `Found ${errorCount} error(s) and ${warningCount} warning(s)`

    return {
      module: 'pwa',
      status,
      issues: allIssues,
      summary,
      duration: Date.now() - start,
    }
  },
}

export default pwaAudit
