import { readFile, access } from 'fs/promises'
import { join } from 'path'
import type { AuditModule, AuditIssue, AuditOptions, AuditResult } from './types'
import { summarizeAuditIssues } from './utils'

/** Parse a dotenv file and return variable names (ignoring comments and blank lines) */
function parseEnvVarNames(content: string): Set<string> {
  const names = new Set<string>()
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=/)
    const name = match?.[1]
    if (name) names.add(name)
  }
  return names
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function checkEnvVariables(options: AuditOptions): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = []
  const examplePath = join(options.projectRoot, '.env.example')
  const devPath = join(options.projectRoot, '.env.development')

  let exampleContent: string
  let devContent: string

  try {
    exampleContent = await readFile(examplePath, 'utf-8')
  } catch {
    issues.push({
      severity: 'error',
      message: '.env.example file not found',
      file: '.env.example',
      rule: 'env-vars',
    })
    return issues
  }

  try {
    devContent = await readFile(devPath, 'utf-8')
  } catch {
    issues.push({
      severity: 'error',
      message: '.env.development file not found',
      file: '.env.development',
      rule: 'env-vars',
      suggestion: 'Copy .env.example to .env.development and configure for local development',
    })
    return issues
  }

  const exampleVars = parseEnvVarNames(exampleContent)
  const devVars = parseEnvVarNames(devContent)

  // Variables in .env.example but missing from .env.development
  for (const varName of exampleVars) {
    if (!devVars.has(varName)) {
      issues.push({
        severity: 'warning',
        message: `Variable "${varName}" defined in .env.example but missing in .env.development`,
        file: '.env.development',
        rule: 'env-vars',
        suggestion: `Add ${varName}= to .env.development`,
      })
    }
  }

  // Variables in .env.development but not in .env.example (potentially undocumented)
  for (const varName of devVars) {
    if (!exampleVars.has(varName)) {
      issues.push({
        severity: 'info',
        message: `Variable "${varName}" in .env.development but not documented in .env.example`,
        file: '.env.example',
        rule: 'env-vars',
        suggestion: `Add ${varName} to .env.example for documentation`,
      })
    }
  }

  return issues
}

async function checkCloudflareConfigs(options: AuditOptions): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = []

  const requiredFiles = [
    { path: 'public/_headers', label: 'HTTP headers config' },
    { path: 'public/_routes.json', label: 'Routes config' },
  ]

  for (const { path, label } of requiredFiles) {
    const fullPath = join(options.projectRoot, path)
    if (!(await fileExists(fullPath))) {
      issues.push({
        severity: 'error',
        message: `Cloudflare ${label} missing: ${path}`,
        file: path,
        rule: 'cloudflare-config',
        suggestion: `Create ${path} for Cloudflare Pages deployment`,
      })
    }
  }

  const redirectsPath = join(options.projectRoot, 'public/_redirects')
  const routesPath = join(options.projectRoot, 'public/_routes.json')
  const hasRedirects = await fileExists(redirectsPath)
  const hasRoutes = await fileExists(routesPath)

  if (!hasRedirects && !hasRoutes) {
    issues.push({
      severity: 'error',
      message: 'Missing SPA routing config: need either public/_redirects or public/_routes.json',
      file: 'public',
      rule: 'cloudflare-config',
      suggestion: 'Prefer _routes.json on Cloudflare Pages, or add _redirects as fallback',
    })
  }

  // Validate _routes.json structure if it exists
  if (await fileExists(routesPath)) {
    try {
      const content = await readFile(routesPath, 'utf-8')
      const routes = JSON.parse(content)
      if (!routes.version || !Array.isArray(routes.include)) {
        issues.push({
          severity: 'warning',
          message: '_routes.json missing required fields (version, include)',
          file: 'public/_routes.json',
          rule: 'cloudflare-config',
        })
      }
    } catch {
      issues.push({
        severity: 'error',
        message: '_routes.json contains invalid JSON',
        file: 'public/_routes.json',
        rule: 'cloudflare-config',
      })
    }
  }

  // Validate _redirects has SPA fallback
  if (hasRedirects) {
    try {
      const content = await readFile(redirectsPath, 'utf-8')
      if (!content.includes('/* /index.html 200')) {
        issues.push({
          severity: 'warning',
          message: '_redirects missing SPA fallback rule (/* /index.html 200)',
          file: 'public/_redirects',
          rule: 'cloudflare-config',
          suggestion: 'Add "/* /index.html 200" as the last redirect rule',
        })
      }
    } catch {
      // Already reported as missing above
    }
  }

  return issues
}

async function checkCacheConfig(options: AuditOptions): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = []
  const headersPath = join(options.projectRoot, 'public/_headers')

  if (!(await fileExists(headersPath))) return issues

  try {
    const content = await readFile(headersPath, 'utf-8')

    // Check hashed assets have immutable cache
    if (!content.includes('immutable')) {
      issues.push({
        severity: 'warning',
        message: '_headers missing immutable cache for hashed assets',
        file: 'public/_headers',
        rule: 'cache-config',
        suggestion: 'Add "Cache-Control: public, max-age=31536000, immutable" for /assets/* files',
      })
    }

    // Check HTML has short/no cache
    if (!content.includes('must-revalidate')) {
      issues.push({
        severity: 'warning',
        message: '_headers missing must-revalidate for HTML pages',
        file: 'public/_headers',
        rule: 'cache-config',
        suggestion: 'Add "Cache-Control: public, max-age=0, must-revalidate" for /*.html',
      })
    }
  } catch {
    // File read error — already handled by cloudflare config check
  }

  // Check wrangler.toml exists
  const wranglerPath = join(options.projectRoot, 'wrangler.toml')
  if (!(await fileExists(wranglerPath))) {
    issues.push({
      severity: 'warning',
      message: 'wrangler.toml not found',
      file: 'wrangler.toml',
      rule: 'cache-config',
      suggestion: 'Create wrangler.toml for Cloudflare Pages configuration',
    })
  }

  return issues
}

const envConfigAudit: AuditModule = {
  name: 'env-config',

  async run(options: AuditOptions): Promise<AuditResult> {
    const start = Date.now()
    const allIssues: AuditIssue[] = []

    // 1. Check environment variables
    const envIssues = await checkEnvVariables(options)
    allIssues.push(...envIssues)

    // 2. Check Cloudflare config files
    const cfIssues = await checkCloudflareConfigs(options)
    allIssues.push(...cfIssues)

    // 3. Check cache configuration
    const cacheIssues = await checkCacheConfig(options)
    allIssues.push(...cacheIssues)

    const { errorCount, warningCount, status } = summarizeAuditIssues(allIssues)

    const summary =
      status === 'pass'
        ? 'Environment and deployment config OK'
        : `Found ${errorCount} error(s) and ${warningCount} warning(s)`

    if (options.verbose && allIssues.length > 0) {
      for (const issue of allIssues) {
        const loc = issue.file ? ` (${issue.file})` : ''
        console.log(`    [${issue.rule}] ${issue.message}${loc}`)
      }
    }

    return {
      module: 'env-config',
      status,
      issues: allIssues,
      summary,
      duration: Date.now() - start,
    }
  },
}

export default envConfigAudit
