import type { AuditModule, AuditIssue, AuditOptions, AuditResult } from './types'
import { runLocalNodeTool, summarizeAuditIssues } from './utils'

interface ESLintMessage {
  ruleId: string | null
  severity: number // 1 = warning, 2 = error
  message: string
  line: number
  column: number
}

interface ESLintFileResult {
  filePath: string
  messages: ESLintMessage[]
  errorCount: number
  warningCount: number
}

function parseESLintJSON(output: string): ESLintFileResult[] {
  try {
    // ESLint JSON output may have non-JSON preamble; find the array
    const start = output.indexOf('[')
    if (start === -1) return []
    return JSON.parse(output.slice(start)) as ESLintFileResult[]
  } catch {
    return []
  }
}

function toAuditIssues(files: ESLintFileResult[], projectRoot: string): AuditIssue[] {
  const issues: AuditIssue[] = []

  for (const file of files) {
    // Make path relative
    const relPath = file.filePath.startsWith(projectRoot)
      ? file.filePath.slice(projectRoot.length + 1).replace(/\\/g, '/')
      : file.filePath

    for (const msg of file.messages) {
      issues.push({
        severity: msg.severity === 2 ? 'error' : 'warning',
        message: msg.message,
        file: relPath,
        line: msg.line,
        ...(msg.ruleId == null ? {} : { rule: msg.ruleId }),
      })
    }
  }

  return issues
}

const lintAudit: AuditModule = {
  name: 'lint',

  async run(options: AuditOptions): Promise<AuditResult> {
    const start = Date.now()

    // In fix mode, run auto-fix first
    if (options.fix) {
      await runLocalNodeTool('eslint', ['.', '--fix'], options.projectRoot)
    }

    // Run lint check with JSON output
    const result = await runLocalNodeTool(
      'eslint',
      ['.', '--max-warnings=0', '--format', 'json'],
      options.projectRoot
    )

    const files = parseESLintJSON(result.stdout)
    const issues = toAuditIssues(files, options.projectRoot)

    const { errorCount, warningCount, status } = summarizeAuditIssues(issues)

    const summary =
      status === 'pass'
        ? 'No lint issues found'
        : `Found ${errorCount} error(s) and ${warningCount} warning(s)`

    if (options.verbose && issues.length > 0) {
      for (const issue of issues) {
        console.log(`    ${issue.file}:${issue.line} [${issue.rule}] ${issue.message}`)
      }
    }

    return {
      module: 'lint',
      status,
      issues,
      summary,
      duration: Date.now() - start,
    }
  },
}

export default lintAudit
