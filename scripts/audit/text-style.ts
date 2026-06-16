import { glob, readFile } from 'fs/promises'
import { join } from 'path'
import type { AuditIssue, AuditModule, AuditOptions, AuditResult } from './types'
import { summarizeIssueSeverities } from './utils'

const MARKDOWN_GLOB = '**/*.md'

const EXCLUDED_PATH_PARTS = [
  '/node_modules/',
  '/dist/',
  '/output/',
  '/coverage/',
  '/.git/',
  '/.vite/',
]

const DISALLOWED_HEADING_PATTERNS: Array<{ rule: string; regex: RegExp; message: string }> = [
  {
    rule: 'no-discussion-heading',
    regex:
      /^#+\s+.*(?:Why|Can it|Should we|One-line version|Final conclusion|Strengths|Recommendations|问题|优势|建议|是否|为什么|一句话|最终结论)\b/i,
    message: 'Documentation headings must use implementation-oriented labels.',
  },
]

const DISALLOWED_TEXT_PATTERNS: Array<{ rule: string; regex: RegExp; message: string }> = [
  {
    rule: 'no-advisory-wording',
    regex:
      /\b(?:recommend|recommended|suggest|suggested|maybe|perhaps|I think|we should|you should)\b|可能|也许|应该|建议/,
    message: 'Documentation text must use constraints, defaults, outputs, and failure behavior.',
  },
]

function normalizePath(file: string): string {
  return file.replace(/\\/g, '/')
}

function shouldSkipFile(file: string): boolean {
  const normalized = `/${normalizePath(file)}`
  return EXCLUDED_PATH_PARTS.some((part) => normalized.includes(part))
}

function stripInlineCode(line: string): string {
  return line.replace(/`[^`]*`/g, '')
}

function scanMarkdownFile(file: string, content: string): AuditIssue[] {
  const issues: AuditIssue[] = []
  const lines = content.split(/\r?\n/)

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const textLine = stripInlineCode(line)

    for (const pattern of DISALLOWED_HEADING_PATTERNS) {
      if (!pattern.regex.test(textLine)) continue
      issues.push({
        severity: 'error',
        message: pattern.message,
        file,
        line: index + 1,
        rule: pattern.rule,
      })
    }

    for (const pattern of DISALLOWED_TEXT_PATTERNS) {
      if (!pattern.regex.test(textLine)) continue
      issues.push({
        severity: 'error',
        message: pattern.message,
        file,
        line: index + 1,
        rule: pattern.rule,
      })
    }
  }

  return issues
}

const textStyleAudit: AuditModule = {
  name: 'text-style',

  async run(options: AuditOptions): Promise<AuditResult> {
    const start = Date.now()
    const issues: AuditIssue[] = []

    for await (const entry of glob(MARKDOWN_GLOB, { cwd: options.projectRoot })) {
      const file = normalizePath(entry)
      if (shouldSkipFile(file)) continue

      const content = await readFile(join(options.projectRoot, file), 'utf-8')
      issues.push(...scanMarkdownFile(file, content))
    }

    const { status } = summarizeIssueSeverities(issues)

    return {
      module: 'text-style',
      status,
      issues,
      summary:
        status === 'pass'
          ? 'Documentation text follows implementation-oriented wording rules.'
          : `Found ${issues.length} documentation wording issue(s).`,
      duration: Date.now() - start,
    }
  },
}

export default textStyleAudit
