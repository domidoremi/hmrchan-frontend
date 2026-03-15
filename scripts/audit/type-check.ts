import type { AuditModule, AuditIssue, AuditOptions, AuditResult } from './types'
import { runLocalNodeTool } from './utils'

function parseTypeErrors(output: string): AuditIssue[] {
  const issues: AuditIssue[] = []
  // vue-tsc errors look like: src/file.ts(10,5): error TS2345: Argument of type ...
  const errorPattern = /^(.+?)\((\d+),\d+\):\s*error\s+TS\d+:\s*(.+)$/gm
  let match: RegExpExecArray | null

  while ((match = errorPattern.exec(output)) !== null) {
    issues.push({
      severity: 'error',
      message: match[3].trim(),
      file: match[1].trim(),
      line: parseInt(match[2], 10),
    })
  }

  return issues
}

const typeCheckAudit: AuditModule = {
  name: 'type-check',

  async run(options: AuditOptions): Promise<AuditResult> {
    const start = Date.now()

    const result = await runLocalNodeTool('vue-tsc', ['--noEmit'], options.projectRoot)

    // vue-tsc outputs errors to stdout (not stderr) in most setups
    const combined = result.stdout + '\n' + result.stderr
    const issues = parseTypeErrors(combined)

    const status = issues.length === 0 && result.exitCode === 0 ? 'pass' : 'fail'
    const summary =
      status === 'pass' ? 'All type checks passed' : `Found ${issues.length} type error(s)`

    if (options.verbose && issues.length > 0) {
      for (const issue of issues) {
        console.log(`    ${issue.file}:${issue.line} - ${issue.message}`)
      }
    }

    return {
      module: 'type-check',
      status,
      issues,
      summary,
      duration: Date.now() - start,
    }
  },
}

export default typeCheckAudit
