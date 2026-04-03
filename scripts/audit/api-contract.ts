import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { parse as parseYaml } from 'yaml'
import type { AuditModule, AuditIssue, AuditOptions, AuditResult, AuditStatus } from './types'

const CONTRACT_OPENAPI_DIR = 'docs/backend-handoff/contracts/openapi'
const API_DIR = 'src/api'
const EXCLUDED_SERVICE_FILES = new Set(['adminService.ts', 'systemService.ts'])
const OUT_OF_SCOPE_FRONTEND_ENDPOINTS = new Set([
  'POST /api/v1/discussions/{param}/pin',
  'DELETE /api/v1/discussions/{param}/pin',
  'POST /api/v1/discussions/comments/{param}/pin',
  'DELETE /api/v1/discussions/comments/{param}/pin',
  'POST /api/v1/discussions/comments/{param}/feature',
  'DELETE /api/v1/discussions/comments/{param}/feature',
])

interface APIEndpoint {
  method: string
  path: string
}

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete'])

type OpenApiDocument = {
  paths?: Record<string, Record<string, unknown> | undefined>
}

async function extractContractEndpoints(projectRoot: string): Promise<{
  endpoints: APIEndpoint[]
  issues: AuditIssue[]
}> {
  const openApiDir = join(projectRoot, CONTRACT_OPENAPI_DIR)
  const issues: AuditIssue[] = []
  const endpoints: APIEndpoint[] = []

  if (!existsSync(openApiDir)) {
    issues.push({
      severity: 'warning',
      message: `OpenAPI contract directory "${CONTRACT_OPENAPI_DIR}" not found; API contract audit skipped`,
    })
    return { endpoints, issues }
  }

  const files = (await readdir(openApiDir)).filter((file) => file.endsWith('.yaml'))
  if (files.length === 0) {
    issues.push({
      severity: 'warning',
      message: `No OpenAPI contract files found in "${CONTRACT_OPENAPI_DIR}"`,
      file: CONTRACT_OPENAPI_DIR,
    })
    return { endpoints, issues }
  }

  for (const file of files) {
    const fullPath = join(openApiDir, file)
    const relPath = `${CONTRACT_OPENAPI_DIR}/${file}`

    try {
      const content = await readFile(fullPath, 'utf-8')
      const parsed = parseYaml(content) as OpenApiDocument | null
      const paths = parsed?.paths

      if (!paths || typeof paths !== 'object') {
        issues.push({
          severity: 'warning',
          message: `No paths found in OpenAPI contract`,
          file: relPath,
          rule: 'missing-openapi-paths',
        })
        continue
      }

      for (const [path, operations] of Object.entries(paths)) {
        if (!path.startsWith('/api/v1/')) continue
        if (!operations || typeof operations !== 'object') continue

        for (const method of Object.keys(operations)) {
          if (!HTTP_METHODS.has(method)) continue

          endpoints.push({
            method: method.toUpperCase(),
            path: path.replace(/\/+$/, ''),
          })
        }
      }
    } catch (error) {
      issues.push({
        severity: 'warning',
        message: `Failed to parse OpenAPI contract: ${error instanceof Error ? error.message : String(error)}`,
        file: relPath,
        rule: 'invalid-openapi-contract',
      })
    }
  }

  return { endpoints, issues }
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
    (f) =>
      f.endsWith('.ts') && f !== 'index.ts' && f !== 'client.ts' && !EXCLUDED_SERVICE_FILES.has(f)
  )

  for (const file of serviceFiles) {
    const filePath = join(apiDir, file)
    const content = await readFile(filePath, 'utf-8')

    // Match apiClient.get/post/put/patch/delete calls
    // Single-quoted: apiClient.get<...>('/path...')
    const singleQuotePattern = /apiClient\.(get|post|put|patch|delete)(?:<[^>]*>)?\(\s*'([^']*)'/g
    // Template literal: apiClient.get<...>(`/path...`)
    // We capture the full content and normalize later
    const templatePattern = /apiClient\.(get|post|put|patch|delete)(?:<[^>]*>)?\(\s*`([^`]*)`/g

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

    // 1. Parse OpenAPI contract files
    const { endpoints: contractEndpoints, issues: contractIssues } = await extractContractEndpoints(
      options.projectRoot
    )
    issues.push(...contractIssues)

    if (contractEndpoints.length === 0) {
      return {
        module: 'api-contract',
        status: 'warn',
        issues:
          issues.length > 0
            ? issues
            : [
                {
                  severity: 'warning',
                  message: `No contract endpoints found in "${CONTRACT_OPENAPI_DIR}"`,
                  file: CONTRACT_OPENAPI_DIR,
                },
              ],
        summary: 'OpenAPI contract missing or empty; audit skipped',
        duration: Date.now() - start,
      }
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
      contractEndpoints.map((ep) =>
        endpointKey({
          method: ep.method,
          path: normalizeContractPath(ep.path),
        })
      )
    )

    const frontendKeys = new Set(
      frontendEndpoints.map((ep) =>
        endpointKey({
          method: ep.method,
          path: normalizeContractPath(ep.path),
        })
      )
    )

    // 4. Frontend calls not in contract
    for (const key of frontendKeys) {
      if (OUT_OF_SCOPE_FRONTEND_ENDPOINTS.has(key)) {
        continue
      }
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
