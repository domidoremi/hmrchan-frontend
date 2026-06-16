import type { AuditModule, AuditIssue, AuditOptions, AuditResult } from './types'
import { createLocalAuditEnv } from '../lib/audit-env.js'
import { runLocalNodeTool, summarizeIssueSeverities } from './utils'

interface KnipIssues {
  issues?: KnipIssues[]
  files?: string[]
  dependencies?: string[]
  devDependencies?: string[]
  unlisted?: Record<string, unknown>
  unresolved?: Record<string, unknown>
  exports?: Record<string, unknown>
  types?: Record<string, unknown>
  duplicates?: Record<string, unknown[]>
  [key: string]: unknown
}

function normalizeKnipIssueName(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value
  if (!value || typeof value !== 'object') return null

  const name = (value as Record<string, unknown>).name
  return typeof name === 'string' && name.length > 0 ? name : null
}

function parseKnipOutput(stdout: string): KnipIssues {
  try {
    return JSON.parse(stdout) as KnipIssues
  } catch {
    return {}
  }
}

function pushListIssues(
  issues: AuditIssue[],
  values: unknown,
  buildIssue: (value: string) => AuditIssue
): void {
  if (!Array.isArray(values) || values.length === 0) return

  for (const value of values) {
    const name = normalizeKnipIssueName(value)
    if (!name) continue
    issues.push(buildIssue(name))
  }
}

function pushObjectListIssues(
  issues: AuditIssue[],
  values: unknown,
  buildIssue: (file: string, value: unknown) => AuditIssue
): void {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return

  for (const [file, entries] of Object.entries(values)) {
    if (!Array.isArray(entries) || entries.length === 0) continue
    for (const entry of entries) {
      issues.push(buildIssue(file, entry))
    }
  }
}

function collectIssues(knip: KnipIssues): AuditIssue[] {
  if (Array.isArray(knip.issues)) {
    return knip.issues.flatMap((issueGroup) => collectIssues(issueGroup))
  }

  const issues: AuditIssue[] = []

  pushListIssues(issues, knip.files, (file) => ({
    severity: 'warning',
    message: `Unused file: ${file}`,
    file,
    rule: 'unused-file',
    suggestion: 'Remove this file if it is no longer needed',
  }))

  pushListIssues(issues, knip.dependencies, (dep) => ({
    severity: 'warning',
    message: `Unused dependency: ${dep}`,
    rule: 'unused-dependency',
    suggestion: `Run \`bun remove ${dep}\` to remove`,
  }))

  pushListIssues(issues, knip.devDependencies, (dep) => ({
    severity: 'info',
    message: `Unused devDependency: ${dep}`,
    rule: 'unused-devDependency',
    suggestion: `Run \`bun remove ${dep}\` to remove`,
  }))

  pushObjectListIssues(issues, knip.exports, (file, exp) => {
    const name = typeof exp === 'string' ? exp : ((exp as Record<string, unknown>).name ?? exp)
    return {
      severity: 'info',
      message: `Unused export "${name}"`,
      file,
      rule: 'unused-export',
      suggestion: 'Remove this export if it is no longer used',
    }
  })

  pushObjectListIssues(issues, knip.unlisted, (file, dep) => ({
    severity: 'error',
    message: `Unlisted dependency "${dep}" used in ${file}`,
    file,
    rule: 'unlisted-dependency',
    suggestion: `Run \`bun add ${dep}\` to add it to package.json`,
  }))

  pushObjectListIssues(issues, knip.unresolved, (file, imp) => ({
    severity: 'error',
    message: `Unresolved import "${imp}"`,
    file,
    rule: 'unresolved-import',
    suggestion: 'Check if the module is installed or the path is correct',
  }))

  return issues
}

const deadCodeAudit: AuditModule = {
  name: 'dead-code',

  async run(options: AuditOptions): Promise<AuditResult> {
    const start = Date.now()

    // In fix mode, run knip --fix first
    if (options.fix) {
      await runLocalNodeTool('knip', ['--fix'], options.projectRoot)
    }

    // Run knip with JSON reporter
    const knipEnv = createLocalAuditEnv(process.env, {
      cwd: options.projectRoot,
      includeContractFallback: true,
    })
    const result = await runLocalNodeTool('knip', ['--reporter', 'json'], options.projectRoot, {
      env: knipEnv,
    })

    const knip = parseKnipOutput(result.stdout)
    const issues = collectIssues(knip)

    if (result.exitCode !== 0 && issues.length === 0) {
      const errorOutput = (result.stderr || result.stdout).slice(0, 500)
      issues.push({
        severity: 'error',
        message: `knip failed (exit code ${result.exitCode}): ${errorOutput}`,
        rule: 'knip-exit-code',
      })
    }

    const { errorCount, warningCount, infoCount, status } = summarizeIssueSeverities(issues)

    const summary =
      status === 'pass'
        ? 'No dead code issues found'
        : `Found ${errorCount} error(s), ${warningCount} warning(s), and ${infoCount} info(s)`

    if (options.verbose && issues.length > 0) {
      for (const issue of issues) {
        const loc = issue.file ? ` (${issue.file})` : ''
        console.log(`    [${issue.rule}] ${issue.message}${loc}`)
      }
    }

    return {
      module: 'dead-code',
      status,
      issues,
      summary,
      duration: Date.now() - start,
    }
  },
}

export default deadCodeAudit
