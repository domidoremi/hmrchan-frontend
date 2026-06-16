import { readdir, readFile } from 'fs/promises'
import { join, relative } from 'path'
import type { AuditIssue, AuditModule, AuditOptions, AuditResult } from './types'
import { summarizeIssueSeverities } from './utils'

const SCAN_ROOTS = ['src', 'functions']
const TEXT_FILE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.vue',
  '.json',
  '.css',
  '.md',
])

const LEGACY_PATTERNS: Array<{
  rule: string
  regex: RegExp
  message: string
}> = [
  {
    rule: 'legacy-authz-snapshot',
    regex: /\bAuthzSnapshot\b|\bauthzSnapshot\b/g,
    message: 'Found legacy AuthzSnapshot naming; use runtime authz cache naming instead.',
  },
  {
    rule: 'legacy-session-summary-route',
    regex: /\/auth\/session(?![A-Za-z0-9:_-])/g,
    message:
      'Found legacy /auth/session route reference; runtime should only use backend auth routes.',
  },
  {
    rule: 'legacy-plural-permission-version',
    regex: /\bpermissions_version\b/g,
    message: 'Found legacy permissions_version naming; use permission_version.',
  },
  {
    rule: 'legacy-permission-header',
    regex: /\bX-Permissions-Version\b/g,
    message: 'Found legacy X-Permissions-Version header reference.',
  },
  {
    rule: 'legacy-csrf-header',
    regex: /\bX-CSRF-Token\b/g,
    message: 'Found legacy X-CSRF-Token header reference.',
  },
  {
    rule: 'legacy-request-timestamp-header',
    regex: /\bX-Request-Timestamp\b/g,
    message: 'Found legacy X-Request-Timestamp header reference.',
  },
  {
    rule: 'legacy-idempotency-header',
    regex: /\bX-Idempotency-Key\b/g,
    message: 'Found legacy X-Idempotency-Key header reference.',
  },
  {
    rule: 'legacy-bff-cookie',
    regex: /__Host-momi_session|__Host-momi_csrf/g,
    message: 'Found legacy BFF/proxy cookie naming.',
  },
  {
    rule: 'legacy-split-total-users',
    regex: /\btotal_users\b/g,
    message: 'Found legacy total_users field naming.',
  },
  {
    rule: 'legacy-production-upstream-host',
    regex: /https:\/\/api\.momichan\.com/g,
    message:
      'Found hardcoded production upstream host; use explicit env or same-origin entrypoints.',
  },
]

function shouldSkipFile(filePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/')
  return (
    normalizedPath.includes('/__tests__/') ||
    /\.spec\.[cm]?[jt]sx?$/.test(normalizedPath) ||
    /\.test\.[cm]?[jt]sx?$/.test(normalizedPath)
  )
}

async function collectFiles(rootPath: string): Promise<string[]> {
  const entries = await readdir(rootPath, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const entryPath = join(rootPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)))
      continue
    }

    const extension = entry.name.slice(entry.name.lastIndexOf('.'))
    if (TEXT_FILE_EXTENSIONS.has(extension) && !shouldSkipFile(entryPath)) {
      files.push(entryPath)
    }
  }

  return files
}

function getLineNumber(content: string, matchIndex: number): number {
  return content.slice(0, matchIndex).split('\n').length
}

const legacyAlignmentAudit: AuditModule = {
  name: 'legacy-alignment',

  async run(options: AuditOptions): Promise<AuditResult> {
    const start = Date.now()
    const issues: AuditIssue[] = []

    for (const root of SCAN_ROOTS) {
      const absoluteRoot = join(options.projectRoot, root)
      const files = await collectFiles(absoluteRoot)

      for (const file of files) {
        const content = await readFile(file, 'utf-8')

        for (const pattern of LEGACY_PATTERNS) {
          const match = pattern.regex.exec(content)
          pattern.regex.lastIndex = 0
          if (!match || match.index < 0) continue

          issues.push({
            severity: 'error',
            message: pattern.message,
            file: relative(options.projectRoot, file),
            line: getLineNumber(content, match.index),
            rule: pattern.rule,
          })
        }
      }
    }

    const { status } = summarizeIssueSeverities(issues)

    return {
      module: 'legacy-alignment',
      status,
      issues,
      summary:
        status === 'pass'
          ? 'No legacy backend-alignment residues found in src/ or functions/.'
          : `Found ${issues.length} legacy alignment residue(s).`,
      duration: Date.now() - start,
    }
  },
}

export default legacyAlignmentAudit
