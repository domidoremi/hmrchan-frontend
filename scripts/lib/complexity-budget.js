import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const DEFAULT_EXTENSIONS = new Set(['.ts', '.vue'])
const DEFAULT_IGNORED_SEGMENTS = new Set(['__tests__', 'mockData'])
const DEFAULT_IGNORED_SUFFIXES = ['.spec.ts', '.test.ts', '.d.ts']

function normalizePath(filePath) {
  return String(filePath ?? '')
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
}

function shouldSkipFile(relativePath, ignoredSegments, ignoredSuffixes) {
  const normalizedPath = normalizePath(relativePath)
  const segments = normalizedPath.split('/')

  return (
    segments.some((segment) => ignoredSegments.has(segment)) ||
    ignoredSuffixes.some((suffix) => normalizedPath.endsWith(suffix))
  )
}

function walkSourceFiles(rootDir, currentDir, options) {
  if (!existsSync(currentDir)) return []

  return readdirSync(currentDir).flatMap((entry) => {
    const absolutePath = path.join(currentDir, entry)
    const stats = statSync(absolutePath)
    const relativePath = normalizePath(path.relative(rootDir, absolutePath))

    if (stats.isDirectory()) {
      if (options.ignoredSegments.has(entry)) return []
      return walkSourceFiles(rootDir, absolutePath, options)
    }

    if (!options.extensions.has(path.extname(entry).toLowerCase())) return []
    if (shouldSkipFile(relativePath, options.ignoredSegments, options.ignoredSuffixes)) return []

    return [
      {
        absolutePath,
        relativePath,
        lineCount: countLines(readFileSync(absolutePath, 'utf8')),
      },
    ]
  })
}

export function countLines(source) {
  if (source.length === 0) return 0
  const lineBreaks = source.match(/\n/g)?.length ?? 0
  return source.endsWith('\n') ? lineBreaks : lineBreaks + 1
}

export function collectComplexityMetrics({
  rootDir = process.cwd(),
  includeDirs = ['src'],
  extensions = DEFAULT_EXTENSIONS,
  ignoredSegments = DEFAULT_IGNORED_SEGMENTS,
  ignoredSuffixes = DEFAULT_IGNORED_SUFFIXES,
} = {}) {
  const options = {
    extensions: new Set(extensions),
    ignoredSegments: new Set(ignoredSegments),
    ignoredSuffixes: [...ignoredSuffixes],
  }
  const files = includeDirs
    .flatMap((dir) => walkSourceFiles(rootDir, path.join(rootDir, dir), options))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath))

  return {
    rootDir,
    files,
  }
}

export function analyzeComplexityBudget(metrics, budget) {
  const softLimit = budget.softLineLimit ?? 1000
  const hardLimit = budget.hardLineLimit ?? 1500
  const registered = new Map(
    Object.entries(budget.registeredLargeFiles ?? {}).map(([filePath, entry]) => [
      normalizePath(filePath),
      entry,
    ])
  )

  const largeFiles = metrics.files
    .filter((file) => file.lineCount > softLimit)
    .map((file) => {
      const registration = registered.get(file.relativePath) ?? null
      const registeredLimit = registration?.maxLines ?? softLimit
      const isOverRegisteredLimit = file.lineCount > registeredLimit
      const isOverHardLimit = file.lineCount > hardLimit

      return {
        path: file.relativePath,
        lineCount: file.lineCount,
        severity: isOverHardLimit ? 'refactor-queue' : 'requires-note',
        registered: Boolean(registration),
        refactorQueued: Boolean(registration?.refactorQueued),
        maxLines: registeredLimit,
        reason: registration?.reason ?? null,
        violation:
          !registration ||
          isOverRegisteredLimit ||
          (isOverHardLimit && !registration?.refactorQueued),
      }
    })

  const violations = largeFiles.filter((file) => file.violation)

  return {
    status: violations.length > 0 ? 'failed' : 'passed',
    softLineLimit: softLimit,
    hardLineLimit: hardLimit,
    largeFiles,
    violations,
  }
}

export function formatComplexityBudgetReport(result) {
  const lines = [
    `[complexity-budget] status=${result.status}`,
    `softLineLimit: ${result.softLineLimit}`,
    `hardLineLimit: ${result.hardLineLimit}`,
    `largeFileCount: ${result.largeFiles.length}`,
  ]

  if (result.largeFiles.length > 0) {
    lines.push('large files:')
    result.largeFiles.forEach((file) => {
      const queued = file.refactorQueued ? ', refactor queued' : ''
      lines.push(
        `- ${file.path}: ${file.lineCount} lines (${file.severity}, max ${file.maxLines}${queued})`
      )
    })
  }

  if (result.violations.length > 0) {
    lines.push('violations:')
    result.violations.forEach((file) => {
      lines.push(`- ${file.path}: ${file.lineCount} lines exceeds registered complexity budget`)
    })
  }

  return lines.join('\n')
}
