import type { AuditModule, AuditIssue, AuditOptions, AuditResult } from './types'
import { runLocalNodeTool, summarizeAuditIssues } from './utils'

interface KnipIssues {
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

function parseKnipOutput(stdout: string): KnipIssues {
  try {
    return JSON.parse(stdout) as KnipIssues
  } catch {
    return {}
  }
}

function collectIssues(knip: KnipIssues): AuditIssue[] {
  const issues: AuditIssue[] = []

  // Unused files
  if (Array.isArray(knip.files) && knip.files.length > 0) {
    for (const file of knip.files) {
      issues.push({
        severity: 'warning',
        message: `Unused file: ${file}`,
        file,
        rule: 'unused-file',
        suggestion: 'Remove this file if it is no longer needed',
      })
    }
  }

  // Unused dependencies
  if (Array.isArray(knip.dependencies) && knip.dependencies.length > 0) {
    for (const dep of knip.dependencies) {
      issues.push({
        severity: 'warning',
        message: `Unused dependency: ${dep}`,
        rule: 'unused-dependency',
        suggestion: `Run \`bun remove ${dep}\` to remove`,
      })
    }
  }

  // Unused devDependencies
  if (Array.isArray(knip.devDependencies) && knip.devDependencies.length > 0) {
    for (const dep of knip.devDependencies) {
      issues.push({
        severity: 'info',
        message: `Unused devDependency: ${dep}`,
        rule: 'unused-devDependency',
        suggestion: `Run \`bun remove ${dep}\` to remove`,
      })
    }
  }

  // Unused exports (object keyed by file path)
  if (knip.exports && typeof knip.exports === 'object' && !Array.isArray(knip.exports)) {
    for (const [file, exportInfo] of Object.entries(knip.exports)) {
      if (Array.isArray(exportInfo)) {
        for (const exp of exportInfo) {
          const name =
            typeof exp === 'string' ? exp : ((exp as Record<string, unknown>)['name'] ?? exp)
          issues.push({
            severity: 'info',
            message: `Unused export "${name}"`,
            file,
            rule: 'unused-export',
            suggestion: 'Remove this export if it is no longer used',
          })
        }
      }
    }
  }

  // Unlisted dependencies
  if (knip.unlisted && typeof knip.unlisted === 'object' && !Array.isArray(knip.unlisted)) {
    for (const [file, deps] of Object.entries(knip.unlisted)) {
      if (Array.isArray(deps)) {
        for (const dep of deps) {
          issues.push({
            severity: 'error',
            message: `Unlisted dependency "${dep}" used in ${file}`,
            file,
            rule: 'unlisted-dependency',
            suggestion: `Run \`bun add ${dep}\` to add it to package.json`,
          })
        }
      }
    }
  }

  // Unresolved imports
  if (knip.unresolved && typeof knip.unresolved === 'object' && !Array.isArray(knip.unresolved)) {
    for (const [file, imports] of Object.entries(knip.unresolved)) {
      if (Array.isArray(imports)) {
        for (const imp of imports) {
          issues.push({
            severity: 'error',
            message: `Unresolved import "${imp}"`,
            file,
            rule: 'unresolved-import',
            suggestion: 'Check if the module is installed or the path is correct',
          })
        }
      }
    }
  }

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
    const result = await runLocalNodeTool('knip', ['--reporter', 'json'], options.projectRoot)

    const knip = parseKnipOutput(result.stdout)
    const issues = collectIssues(knip)

    const { errorCount, warningCount, infoCount, status } = summarizeAuditIssues(issues)

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
