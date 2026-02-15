import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import type { AuditModule, AuditIssue, AuditOptions, AuditResult, AuditStatus } from './types'

const CONTRACT_FILE = 'FRONTEND_API_CONTRACT.md'
const API_DIR = 'src/api'

interface APIEndpoint {
  method: string
  path: string
}

/**
 * Parse FRONTEND_API_CONTRACT.md to extract endpoint definitions.
 * Looks for lines like: - **GET /api/v1/posts/** — ...
 */
function parseContractEndpoints(content: string): APIEndpoint[] {
  const endpoints: APIEndpoint[] = []
  const pattern = /^- \*\*(GET|POST|PUT|PATCH|DELETE)\s+(\/api\/v1\/[^\s*]+)\*\*/gm

  let match: RegExpExecArray | null
  while ((match = pattern.exec(content)) !== null) {
    const method = match[1]
    // Normalize: strip trailing slashes, keep path params as-is
    const path = match[2].replace(/\/+$/, '')
    endpoints.push({ method, path })
  }

  return endpoints
}

/**
 * Normalize a service-level path (e.g. '/posts/${postId}') to a contract-style path
 * (e.g. '/api/v1/posts/{post_id}'). Replaces template literal expressions with {param}.
 */
function normalizeServicePath(rawPath: string): string {
  let path = rawPath

  // Remove template expressions that are query-string appenders
  // e.g. ${qs ? `?${qs}` : ''} or similar ternary expressions
  path = path.replace(/\$\{[^}]*\?[^}]*\}/g, '')

  // Remove incomplete template expressions (truncated by backtick regex)
  // e.g. "${qs " from a nested backtick template literal
  path = path.replace(/\$\{[^}]*$/g, '')

  // Remove template expressions appended directly to a path segment (no preceding /)
  // These are query-string appenders like `/notifications${params}` or `/sync${qs}`
  path = path.replace(/([^/])\$\{[^}]+\}/g, '$1')

  // Replace remaining template expressions (path params after /) with {param}
  path = path.replace(/\$\{[^}]+\}/g, '{param}')

  // Add /api/v1 prefix if not present
  if (!path.startsWith('/api/v1')) {
    path = `/api/v1${path}`
  }

  // Remove query string portions
  path = path.replace(/\?.*$/, '')
  // Remove backticks and other template noise
  path = path.replace(/[`]/g, '')
  // Strip trailing slashes and whitespace
  path = path.replace(/[\s/]+$/, '')
  return path
}

/**
 * Normalize a contract path for comparison: replace named params like {post_id}
 * with a generic {param} placeholder.
 */
function normalizeContractPath(path: string): string {
  return path.replace(/\{[^}]+\}/g, '{param}').replace(/\/+$/, '')
}

/**
 * Scan src/api/*.ts files to extract actual API calls (method + path).
 */
async function extractFrontendEndpoints(projectRoot: string): Promise<APIEndpoint[]> {
  const apiDir = join(projectRoot, API_DIR)
  const endpoints: APIEndpoint[] = []

  if (!existsSync(apiDir)) return endpoints

  const files = await readdir(apiDir)
  const serviceFiles = files.filter(
    (f) => f.endsWith('.ts') && f !== 'index.ts' && f !== 'client.ts',
  )

  for (const file of serviceFiles) {
    const filePath = join(apiDir, file)
    const content = await readFile(filePath, 'utf-8')

    // Match apiClient.get/post/put/patch/delete calls
    // Single-quoted: apiClient.get<...>('/path...')
    const singleQuotePattern =
      /apiClient\.(get|post|put|patch|delete)(?:<[^>]*>)?\(\s*'([^']*)'/g
    // Template literal: apiClient.get<...>(`/path...`)
    // We capture the full content and normalize later
    const templatePattern =
      /apiClient\.(get|post|put|patch|delete)(?:<[^>]*>)?\(\s*`([^`]*)`/g

    let match: RegExpExecArray | null
    for (const pattern of [singleQuotePattern, templatePattern]) {
      while ((match = pattern.exec(content)) !== null) {
        const method = match[1].toUpperCase()
        const rawPath = match[2]

        if (!rawPath) continue
        if (rawPath.startsWith('http')) continue

        const normalized = normalizeServicePath(rawPath)
        // Skip paths that ended up empty or invalid after normalization
        if (normalized === '/api/v1' || !normalized.startsWith('/api/v1/')) continue
        endpoints.push({ method, path: normalized })
      }
      pattern.lastIndex = 0
    }
  }

  return endpoints
}

/**
 * Create a string key for comparison: "METHOD /normalized/path"
 */
function endpointKey(ep: APIEndpoint): string {
  return `${ep.method} ${ep.path}`
}

const apiContractAudit: AuditModule = {
  name: 'api-contract',

  async run(options: AuditOptions): Promise<AuditResult> {
    const start = Date.now()
    const issues: AuditIssue[] = []

    // 1. Parse contract file
    const contractPath = join(options.projectRoot, CONTRACT_FILE)
    if (!existsSync(contractPath)) {
      return {
        module: 'api-contract',
        status: 'fail',
        issues: [
          { severity: 'error', message: `Contract file "${CONTRACT_FILE}" not found` },
        ],
        summary: 'Contract file missing',
        duration: Date.now() - start,
      }
    }

    const contractContent = await readFile(contractPath, 'utf-8')
    const contractEndpoints = parseContractEndpoints(contractContent)

    if (contractEndpoints.length === 0) {
      issues.push({
        severity: 'warning',
        message: 'No endpoints found in contract file — check format',
        file: CONTRACT_FILE,
      })
    }

    // 2. Scan frontend service files
    const frontendEndpoints = await extractFrontendEndpoints(options.projectRoot)

    if (frontendEndpoints.length === 0) {
      issues.push({
        severity: 'warning',
        message: 'No API calls found in frontend service files',
        file: API_DIR,
      })
    }

    // 3. Normalize for comparison
    const contractKeys = new Set(
      contractEndpoints.map((ep) => endpointKey({
        method: ep.method,
        path: normalizeContractPath(ep.path),
      })),
    )

    const frontendKeys = new Set(
      frontendEndpoints.map((ep) => endpointKey({
        method: ep.method,
        path: normalizeContractPath(ep.path),
      })),
    )

    // 4. Frontend calls not in contract
    for (const key of frontendKeys) {
      if (!contractKeys.has(key)) {
        issues.push({
          severity: 'warning',
          message: `Frontend calls ${key} but not defined in contract`,
          rule: 'missing-in-contract',
        })
      }
    }

    // 5. Contract endpoints not implemented in frontend
    for (const key of contractKeys) {
      if (!frontendKeys.has(key)) {
        issues.push({
          severity: 'info',
          message: `Contract defines ${key} but not implemented in frontend`,
          rule: 'missing-in-frontend',
        })
      }
    }

    // Determine status
    const errorCount = issues.filter((i) => i.severity === 'error').length
    const warningCount = issues.filter((i) => i.severity === 'warning').length

    let status: AuditStatus = 'pass'
    if (errorCount > 0) status = 'fail'
    else if (warningCount > 0) status = 'warn'

    const missingInContract = issues.filter((i) => i.rule === 'missing-in-contract').length
    const missingInFrontend = issues.filter((i) => i.rule === 'missing-in-frontend').length

    const summary =
      status === 'pass'
        ? `All ${frontendKeys.size} frontend endpoints match contract`
        : `Contract: ${contractKeys.size} endpoints, Frontend: ${frontendKeys.size} endpoints — ` +
          `${missingInContract} not in contract, ${missingInFrontend} not in frontend`

    if (options.verbose && issues.length > 0) {
      for (const issue of issues) {
        console.log(`    [${issue.rule ?? issue.severity}] ${issue.message}`)
      }
    }

    return {
      module: 'api-contract',
      status,
      issues,
      summary,
      duration: Date.now() - start,
    }
  },
}

export default apiContractAudit
