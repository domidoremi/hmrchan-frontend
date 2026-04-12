import { spawn } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'
import type { AuditIssue, AuditModule, AuditOptions, AuditResult, AuditStatus } from './types'

interface BannedSurfaceTerm {
  term: string
  rule: string
  suggestion: string
}

function joinFragments(parts: string[]): string {
  return parts.join('')
}

const BANNED_SURFACE_TERMS: BannedSurfaceTerm[] = [
  {
    term: joinFragments(['auth', '.momichan.xyz']),
    rule: 'legacy-auth-host',
    suggestion: 'Use the canonical main-site or public-API wording instead of historical hosts',
  },
  {
    term: joinFragments(['console', '.momichan.xyz']),
    rule: 'legacy-console-host',
    suggestion: 'Replace explicit historical backend hosts with generalized rollout terminology',
  },
  {
    term: joinFragments(['console-api', '.momichan.xyz']),
    rule: 'legacy-console-api-host',
    suggestion:
      'Replace explicit historical backend API hosts with generalized rollout terminology',
  },
  {
    term: joinFragments(['authentik', '-db-init']),
    rule: 'legacy-auth-service',
    suggestion: 'Reference the retired service group with generalized terminology only',
  },
  {
    term: joinFragments(['authentik', '-server']),
    rule: 'legacy-auth-service',
    suggestion: 'Reference the retired service group with generalized terminology only',
  },
  {
    term: joinFragments(['authentik', '-worker']),
    rule: 'legacy-auth-service',
    suggestion: 'Reference the retired service group with generalized terminology only',
  },
  {
    term: joinFragments(['Auth', 'entik']),
    rule: 'legacy-brand',
    suggestion: 'Replace legacy brand wording with current product language',
  },
  {
    term: joinFragments(['OI', 'DC']),
    rule: 'legacy-protocol-label',
    suggestion:
      'Use current Google handoff / auth callback wording instead of legacy protocol labels',
  },
  {
    term: joinFragments(['统一', '登录']),
    rule: 'legacy-product-copy',
    suggestion: 'Use the current email + Google login product copy instead of the retired phrase',
  },
]

const RG_EXCLUDE_GLOBS = ['node_modules/**', 'dist/**', 'coverage/**', 'output/**', '.git/**']
const EXCLUDED_ROOT_DIRS = ['node_modules', 'dist', 'coverage', 'output', '.git']
const EXCLUDED_RELATIVE_PREFIXES: string[] = []

function normalizeRelativePath(filePath: string): string {
  return filePath.split(sep).join('/')
}

function isExcludedPath(relativePath: string): boolean {
  return (
    EXCLUDED_ROOT_DIRS.some(
      (rootDir) => relativePath === rootDir || relativePath.startsWith(`${rootDir}/`)
    ) ||
    EXCLUDED_RELATIVE_PREFIXES.some(
      (prefix) => relativePath === prefix.slice(0, -1) || relativePath.startsWith(prefix)
    )
  )
}

function isRipgrepUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  return (
    message.includes('executable not found') ||
    message.includes('spawn rg') ||
    message.includes('enoent')
  )
}

function runRipgrep(projectRoot: string, terms: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ['-n', '-I']
    for (const glob of RG_EXCLUDE_GLOBS) {
      args.push('-g', `!${glob}`)
    }
    for (const term of terms) {
      args.push('-e', term)
    }
    args.push('.')

    const child = spawn('rg', args, {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout)
        return
      }
      if (code === 1) {
        resolve('')
        return
      }
      reject(new Error(stderr || `rg exited with code ${code}`))
    })
  })
}

export async function scanProjectFiles(
  projectRoot: string,
  currentDir: string,
  terms: string[]
): Promise<string[]> {
  const entries = await readdir(currentDir, { withFileTypes: true })
  const matches: string[] = []

  for (const entry of entries) {
    const absolutePath = resolve(currentDir, entry.name)
    const relativePath = normalizeRelativePath(relative(projectRoot, absolutePath))

    if (isExcludedPath(relativePath)) {
      continue
    }

    if (entry.isDirectory()) {
      matches.push(...(await scanProjectFiles(projectRoot, absolutePath, terms)))
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    const buffer = await readFile(absolutePath)
    if (buffer.includes(0)) {
      continue
    }

    const contents = buffer.toString('utf8')
    if (!terms.some((term) => contents.includes(term))) {
      continue
    }

    const lines = contents.split(/\r?\n/)
    lines.forEach((line, index) => {
      if (terms.some((term) => line.includes(term))) {
        matches.push(`${relativePath}:${index + 1}:${line}`)
      }
    })
  }

  return matches
}

export async function searchTrackedFiles(
  projectRoot: string,
  terms: string[],
  textSearcher: (projectRoot: string, terms: string[]) => Promise<string> = runRipgrep
): Promise<string> {
  try {
    return await textSearcher(projectRoot, terms)
  } catch (error) {
    if (!isRipgrepUnavailableError(error)) {
      throw error
    }

    const matches = await scanProjectFiles(projectRoot, projectRoot, terms)
    return matches.join('\n')
  }
}

function parseRipgrepOutput(stdout: string): AuditIssue[] {
  const issues: AuditIssue[] = []
  const termByValue = new Map(BANNED_SURFACE_TERMS.map((item) => [item.term, item]))

  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const match = line.match(/^(.+?):(\d+):(.*)$/)
    if (!match) continue

    const [, file, lineNumber, content] = match
    const matchedTerm = BANNED_SURFACE_TERMS.find((item) => content.includes(item.term))
    if (!matchedTerm) continue

    const issueMeta = termByValue.get(matchedTerm.term)
    if (!issueMeta) continue

    issues.push({
      severity: 'error',
      message: `Found retired auth-surface wording in tracked frontend files`,
      file,
      line: Number(lineNumber),
      rule: issueMeta.rule,
      suggestion: issueMeta.suggestion,
    })
  }

  return issues
}

const authSurfaceAudit: AuditModule = {
  name: 'auth-surface',

  async run(options: AuditOptions): Promise<AuditResult> {
    const start = Date.now()

    let issues: AuditIssue[]
    try {
      const stdout = await searchTrackedFiles(
        options.projectRoot,
        BANNED_SURFACE_TERMS.map((item) => item.term)
      )
      issues = parseRipgrepOutput(stdout)
    } catch (error) {
      issues = [
        {
          severity: 'error',
          message: `Auth-surface audit failed: ${error instanceof Error ? error.message : String(error)}`,
          rule: 'auth-surface-audit',
          suggestion: 'Ensure ripgrep is available and rerun the repo audit',
        },
      ]
    }

    const errorCount = issues.filter((issue) => issue.severity === 'error').length
    const warningCount = issues.filter((issue) => issue.severity === 'warning').length

    let status: AuditStatus = 'pass'
    if (errorCount > 0) status = 'fail'
    else if (warningCount > 0) status = 'warn'

    if (options.verbose && issues.length > 0) {
      for (const issue of issues) {
        const location = issue.file ? ` (${issue.file}${issue.line ? `:${issue.line}` : ''})` : ''
        console.log(`    [${issue.rule}] ${issue.message}${location}`)
      }
    }

    return {
      module: 'auth-surface',
      status,
      issues,
      summary:
        issues.length === 0
          ? 'Frontend docs/config/code are free of retired auth hosts, service names, and copy'
          : `Found ${errorCount} error(s) and ${warningCount} warning(s)`,
      duration: Date.now() - start,
    }
  },
}

export default authSurfaceAudit
