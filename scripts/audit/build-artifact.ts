import { readFile } from 'fs/promises'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import type { AuditModule, AuditIssue, AuditOptions, AuditResult } from './types'
import { summarizeAuditIssues } from './utils'

function hasFileWithExtension(dir: string, ext: string): boolean {
  if (!existsSync(dir)) return false
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, item.name)
    if (item.isDirectory()) {
      if (hasFileWithExtension(fullPath, ext)) return true
    } else if (item.name.endsWith(ext)) {
      return true
    }
  }
  return false
}

const buildArtifactAudit: AuditModule = {
  name: 'build-artifact',

  async run(options: AuditOptions): Promise<AuditResult> {
    const start = Date.now()
    const issues: AuditIssue[] = []
    const distDir = join(options.projectRoot, 'dist')

    // 1. Verify dist/index.html exists
    if (!existsSync(join(distDir, 'index.html'))) {
      issues.push({
        severity: 'error',
        message: 'dist/index.html not found (run build first)',
        file: 'dist/index.html',
        rule: 'build-artifact',
      })
    }

    // 2. Verify dist/assets/ contains JS and CSS files
    const assetsDir = join(distDir, 'assets')
    if (!existsSync(assetsDir)) {
      issues.push({
        severity: 'error',
        message: 'dist/assets/ directory not found',
        file: 'dist/assets/',
        rule: 'build-artifact',
      })
    } else {
      if (!hasFileWithExtension(assetsDir, '.js')) {
        issues.push({
          severity: 'error',
          message: 'No JavaScript files found in dist/assets/',
          file: 'dist/assets/',
          rule: 'build-artifact',
        })
      }
      if (!hasFileWithExtension(assetsDir, '.css')) {
        issues.push({
          severity: 'error',
          message: 'No CSS files found in dist/assets/',
          file: 'dist/assets/',
          rule: 'build-artifact',
        })
      }
    }

    // 3. Verify functions/api/[[path]].ts exists and exports onRequest
    const functionsPath = join(options.projectRoot, 'functions/api/[[path]].ts')
    if (!existsSync(functionsPath)) {
      issues.push({
        severity: 'error',
        message: 'functions/api/[[path]].ts not found',
        file: 'functions/api/[[path]].ts',
        rule: 'build-artifact',
      })
    } else {
      try {
        const content = await readFile(functionsPath, 'utf-8')
        if (!/export\s+(async\s+)?function\s+onRequest/.test(content)) {
          issues.push({
            severity: 'error',
            message: 'functions/api/[[path]].ts does not export onRequest',
            file: 'functions/api/[[path]].ts',
            rule: 'build-artifact',
            suggestion: 'Ensure the file exports an onRequest function',
          })
        }
      } catch {
        issues.push({
          severity: 'warning',
          message: 'Could not read functions/api/[[path]].ts',
          file: 'functions/api/[[path]].ts',
          rule: 'build-artifact',
        })
      }
    }

    // 4. Check SPA fallback config
    const hasRedirects = existsSync(join(options.projectRoot, 'public/_redirects'))
    const hasRoutesJson = existsSync(join(options.projectRoot, 'public/_routes.json'))

    if (!hasRedirects && !hasRoutesJson) {
      issues.push({
        severity: 'error',
        message: 'No SPA fallback config found (missing _redirects and _routes.json)',
        rule: 'build-artifact',
        suggestion: 'Add public/_redirects with "/* /index.html 200" or a _routes.json',
      })
    }

    const { errorCount, warningCount, status } = summarizeAuditIssues(issues)

    const summary =
      status === 'pass'
        ? 'Build artifacts are complete and deployment-ready'
        : `Found ${errorCount} error(s) and ${warningCount} warning(s)`

    return {
      module: 'build-artifact',
      status,
      issues,
      summary,
      duration: Date.now() - start,
    }
  },
}

export default buildArtifactAudit
