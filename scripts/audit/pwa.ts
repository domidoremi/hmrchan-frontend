import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import type { AuditModule, AuditIssue, AuditOptions, AuditResult, AuditStatus } from './types'

const REQUIRED_MANIFEST_FIELDS = ['name', 'short_name', 'icons', 'start_url', 'display'] as const

async function checkManifest(options: AuditOptions): Promise<AuditIssue[]> {
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

  // Verify icon files exist
  const icons = manifest.icons as Array<{ src: string }> | undefined
  if (Array.isArray(icons)) {
    for (const icon of icons) {
      if (!icon.src) continue
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

async function checkIndexHtml(options: AuditOptions): Promise<AuditIssue[]> {
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

  // Check manifest link
  if (!/<link[^>]+rel=["']manifest["'][^>]*>/.test(content)) {
    issues.push({
      severity: 'error',
      message: 'index.html missing <link rel="manifest"> tag',
      file: 'index.html',
      rule: 'pwa-html',
      suggestion: 'Add <link rel="manifest" href="/manifest.json" />',
    })
  }

  // Check theme-color meta
  if (!/<meta[^>]+name=["']theme-color["'][^>]*>/.test(content)) {
    issues.push({
      severity: 'error',
      message: 'index.html missing <meta name="theme-color"> tag',
      file: 'index.html',
      rule: 'pwa-html',
      suggestion: 'Add <meta name="theme-color" content="#8b5cf6" />',
    })
  }

  // Check apple-touch-icon
  if (!/<link[^>]+rel=["']apple-touch-icon["'][^>]*>/.test(content)) {
    issues.push({
      severity: 'error',
      message: 'index.html missing <link rel="apple-touch-icon"> tag',
      file: 'index.html',
      rule: 'pwa-html',
      suggestion: 'Add <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />',
    })
  }

  return issues
}

const pwaAudit: AuditModule = {
  name: 'pwa',

  async run(options: AuditOptions): Promise<AuditResult> {
    const start = Date.now()
    const allIssues: AuditIssue[] = []

    const manifestIssues = await checkManifest(options)
    allIssues.push(...manifestIssues)

    const swIssues = await checkServiceWorker(options)
    allIssues.push(...swIssues)

    const htmlIssues = await checkIndexHtml(options)
    allIssues.push(...htmlIssues)

    const errorCount = allIssues.filter((i) => i.severity === 'error').length
    const warningCount = allIssues.filter((i) => i.severity === 'warning').length

    let status: AuditStatus = 'pass'
    if (errorCount > 0) status = 'fail'
    else if (warningCount > 0) status = 'warn'

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
