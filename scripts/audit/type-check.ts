import type { AuditModule, AuditIssue, AuditOptions, AuditResult } from './types'
import { getNodeCommand, runCommand } from './utils'

function parseTypeErrors(output: string): AuditIssue[] {
  const issues: AuditIssue[] = []
  const errorPattern =
    /^(?:(?:NEW|RESOLVED_OR_CHANGED):\s*)?(.+?)\((\d+),\d+\):\s*error\s+TS\d+:\s*(.+)$/gm
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

    const result = await runCommand(
      getNodeCommand(),
      ['scripts/type-check.mjs'],
      options.projectRoot
    )

    // vue-tsc outputs errors to stdout (not stderr) in most setups
    const combined = result.stdout + '\n' + result.stderr
    const issues = parseTypeErrors(combined)

    const status = issues.length === 0 && result.exitCode === 0 ? 'pass' : 'fail'
    const summary =
      status === 'pass'
        ? 'Type diagnostics match the reviewed baseline'
        : issues.length > 0
          ? `Found ${issues.length} type diagnostic change(s)`
          : 'Type-check baseline mismatch or tool failure'

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
