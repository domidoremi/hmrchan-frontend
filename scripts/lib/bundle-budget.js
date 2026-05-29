import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const IMAGE_EXTENSIONS = new Set([
  '.avif',
  '.gif',
  '.ico',
  '.jpg',
  '.jpeg',
  '.png',
  '.svg',
  '.webp',
])
const SCRIPT_EXTENSIONS = new Set(['.js', '.mjs'])
const STYLE_EXTENSIONS = new Set(['.css'])
const CHUNK_EXTENSIONS = new Set([...SCRIPT_EXTENSIONS, ...STYLE_EXTENSIONS])

function walkFiles(dir) {
  if (!existsSync(dir)) return []

  return readdirSync(dir).flatMap((entry) => {
    const absolutePath = path.join(dir, entry)
    const stats = statSync(absolutePath)

    if (stats.isDirectory()) {
      return walkFiles(absolutePath)
    }

    return [
      {
        absolutePath,
        size: stats.size,
      },
    ]
  })
}

function normalizePathForReport(filePath, rootDir) {
  return path.relative(rootDir, filePath).replace(/\\/g, '/')
}

export function countHomeInitialAssets(indexHtml) {
  const matches = [
    ...String(indexHtml ?? '').matchAll(
      /<(?:script|link)\b[^>]+(?:src|href)="(?<url>\/assets\/[^">]+)"/g
    ),
  ]
  const uniqueUrls = new Set(matches.map((match) => match.groups?.url).filter(Boolean))

  return {
    tagReferences: matches.length,
    uniqueAssetReferences: uniqueUrls.size,
    urls: [...uniqueUrls].sort(),
  }
}

export function collectBundleBudgetMetrics({ distDir = path.resolve(process.cwd(), 'dist') } = {}) {
  const files = walkFiles(distDir).map((file) => ({
    ...file,
    relativePath: normalizePathForReport(file.absolutePath, distDir),
    extension: path.extname(file.absolutePath).toLowerCase(),
  }))

  const jsFiles = files.filter((file) => SCRIPT_EXTENSIONS.has(file.extension))
  const cssFiles = files.filter((file) => STYLE_EXTENSIONS.has(file.extension))
  const imageFiles = files.filter((file) => IMAGE_EXTENSIONS.has(file.extension))
  const chunkFiles = files.filter((file) => CHUNK_EXTENSIONS.has(file.extension))
  const largestChunk = chunkFiles.toSorted((left, right) => right.size - left.size)[0] ?? {
    relativePath: null,
    size: 0,
  }
  const indexHtmlPath = path.join(distDir, 'index.html')
  const homeInitialAssets = existsSync(indexHtmlPath)
    ? countHomeInitialAssets(readFileSync(indexHtmlPath, 'utf8'))
    : { tagReferences: 0, uniqueAssetReferences: 0, urls: [] }

  return {
    distDir,
    totalJsBytes: jsFiles.reduce((total, file) => total + file.size, 0),
    totalCssBytes: cssFiles.reduce((total, file) => total + file.size, 0),
    totalImageBytes: imageFiles.reduce((total, file) => total + file.size, 0),
    largestChunkBytes: largestChunk.size,
    largestChunkPath: largestChunk.relativePath,
    homeInitialAssetCount: homeInitialAssets.uniqueAssetReferences,
    homeInitialAssetTagCount: homeInitialAssets.tagReferences,
    homeInitialAssetUrls: homeInitialAssets.urls,
    fileCounts: {
      js: jsFiles.length,
      css: cssFiles.length,
      images: imageFiles.length,
      chunks: chunkFiles.length,
      total: files.length,
    },
  }
}

const METRIC_REASON_CODES = {
  totalJsBytes: 'total-js-budget-exceeded',
  totalCssBytes: 'total-css-budget-exceeded',
  totalImageBytes: 'total-image-budget-exceeded',
  largestChunkBytes: 'largest-chunk-budget-exceeded',
  homeInitialAssetCount: 'home-initial-asset-count-exceeded',
}

function buildViolation(metric, actual, limit) {
  return {
    metric,
    actual,
    limit,
    overBy: actual - limit,
    reasonCode: METRIC_REASON_CODES[metric] ?? 'bundle-budget-exceeded',
  }
}

export function analyzeBundleBudget(metrics, budget) {
  const checks = [
    ['totalJsBytes', metrics.totalJsBytes, budget.maxTotalJsBytes],
    ['totalCssBytes', metrics.totalCssBytes, budget.maxTotalCssBytes],
    ['totalImageBytes', metrics.totalImageBytes, budget.maxTotalImageBytes],
    ['largestChunkBytes', metrics.largestChunkBytes, budget.maxLargestChunkBytes],
    ['homeInitialAssetCount', metrics.homeInitialAssetCount, budget.maxHomeInitialAssetCount],
  ]
  const violations = checks
    .filter(([, actual, limit]) => Number.isFinite(limit) && actual > limit)
    .map(([metric, actual, limit]) => buildViolation(metric, actual, limit))

  return {
    status: violations.length > 0 ? 'failed' : 'passed',
    metrics,
    budget,
    violations,
  }
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return 'n/a'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`
}

function formatMetric(metric, actual, limit) {
  const isByteMetric = metric.endsWith('Bytes')
  const actualText = isByteMetric ? formatBytes(actual) : String(actual)
  const limitText = isByteMetric ? formatBytes(limit) : String(limit)
  return `${metric}: ${actualText} / ${limitText}`
}

export function formatBundleBudgetReport(result) {
  const lines = [
    `[bundle-budget] status=${result.status}`,
    formatMetric('totalJsBytes', result.metrics.totalJsBytes, result.budget.maxTotalJsBytes),
    formatMetric('totalCssBytes', result.metrics.totalCssBytes, result.budget.maxTotalCssBytes),
    formatMetric(
      'totalImageBytes',
      result.metrics.totalImageBytes,
      result.budget.maxTotalImageBytes
    ),
    formatMetric(
      'largestChunkBytes',
      result.metrics.largestChunkBytes,
      result.budget.maxLargestChunkBytes
    ),
    `largestChunkPath: ${result.metrics.largestChunkPath ?? 'n/a'}`,
    formatMetric(
      'homeInitialAssetCount',
      result.metrics.homeInitialAssetCount,
      result.budget.maxHomeInitialAssetCount
    ),
  ]

  if (result.violations.length > 0) {
    lines.push('violations:')
    result.violations.forEach((violation) => {
      const overByText = violation.metric.endsWith('Bytes')
        ? formatBytes(violation.overBy)
        : String(violation.overBy)
      lines.push(
        `- ${formatMetric(violation.metric, violation.actual, violation.limit)} (${violation.reasonCode}; over by ${overByText})`
      )
      if (violation.metric === 'largestChunkBytes') {
        lines.push(`  largestChunkPath: ${result.metrics.largestChunkPath ?? 'n/a'}`)
      }
      if (violation.metric === 'homeInitialAssetCount') {
        lines.push(`  homeInitialAssetUrls: ${result.metrics.homeInitialAssetUrls.join(', ')}`)
      }
    })
  }

  return lines.join('\n')
}
