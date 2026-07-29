import { glob, readFile } from 'fs/promises'
import { join } from 'path'
import type { AuditIssue, AuditModule, AuditOptions, AuditResult } from './types'
import { summarizeAuditIssues } from './utils'

interface BoundaryRule {
  rule: string
  pattern: RegExp
  message: string
  suggestion: string
  allowedFiles?: ReadonlySet<string>
}

const SOURCE_GLOB = '**/*.{ts,js,vue}'

const ALLOWED_V_HTML = new Set(['src/views/SchedulePage.vue', 'src/components/ui/VideoPlayer.vue'])

const ALLOWED_VAPOR_COMPONENTS = new Set([
  'src/components/business/AuthorCard.vue',
  'src/components/business/PostCard.vue',
  'src/components/business/PostCardSkeleton.vue',
  'src/components/comment/CommentCard.vue',
  'src/components/comment/CommentList.vue',
  'src/components/community/DiscussionCommentCard.vue',
  'src/components/community/DiscussionCommentList.vue',
  'src/components/ui/Avatar.vue',
  'src/components/ui/Badge.vue',
  'src/components/ui/LoadMoreSection.vue',
  'src/components/ui/StateIndicator.vue',
])

const ALLOWED_REQUEST_IDLE_CALLBACK = new Set(['src/utils/performance.ts'])

const ALLOWED_CANCEL_IDLE_CALLBACK = new Set(['src/utils/performance.ts'])

const ALLOWED_RESIZE_OBSERVER = new Set(['src/hmr/components/HmrSignalField.vue'])

const ALLOWED_INTERSECTION_OBSERVER = new Set([
  'src/composables/useInfiniteScroll.ts',
  'src/utils/performance.ts',
  'src/hmr/composables/useHmrInViewReveal.ts',
  'src/views/PostDetailPage.vue',
])

const ALLOWED_FETCH_PRIORITY = new Set([
  'src/edge/htmlDocument.ts',
  'src/edge/prerenderHtml.ts',
  'src/hmr/components/HmrPriorityImage.vue',
  'src/hmr/components/HmrPostCard.vue',
  'src/views/PostDetailPage.vue',
])

const COMMENT_PREFIXES = ['//', '*', '/*']

const LINE_RULES: BoundaryRule[] = [
  {
    rule: 'explicit-content-auto-size',
    pattern: /\bcontent-auto\b(?!-)/,
    message: 'Use an explicit content-auto-* size instead of the default content-auto class',
    suggestion:
      'Pick content-auto-sm, content-auto-lg, or content-auto-xl based on the section shell size',
  },
  {
    rule: 'no-v-pre',
    pattern: /\bv-pre\b/,
    message: 'New v-pre usage is not allowed in the current performance baseline',
    suggestion:
      'Keep templates compilable and optimize by extracting props-only leaf components instead',
  },
  {
    rule: 'v-html-allowlist',
    pattern: /\bv-html\s*=/,
    message: 'New v-html usage requires manual sanitization review before it can land',
    suggestion:
      'Route HTML through an audited sanitize/escape flow or keep rendering as plain text',
    allowedFiles: ALLOWED_V_HTML,
  },
  {
    rule: 'no-raw-request-idle-callback',
    pattern: /\brequestIdleCallback\s*\(/,
    message: 'Use runWhenIdle() or scheduleTask() instead of raw requestIdleCallback()',
    suggestion:
      'Move idle scheduling into src/utils/performance.ts or src/utils/modernAPIs.ts wrappers',
    allowedFiles: ALLOWED_REQUEST_IDLE_CALLBACK,
  },
  {
    rule: 'no-raw-cancel-idle-callback',
    pattern: /\bcancelIdleCallback\s*\(/,
    message: 'Use the shared idle cleanup helpers instead of raw cancelIdleCallback()',
    suggestion: 'Centralize idle handle cleanup in src/utils/performance.ts',
    allowedFiles: ALLOWED_CANCEL_IDLE_CALLBACK,
  },
  {
    rule: 'no-raw-resize-observer',
    pattern: /\bnew\s+ResizeObserver\s*\(/,
    message: 'New raw ResizeObserver usage requires manual lifecycle review before it can land',
    suggestion: 'Reuse an existing observer boundary or add an audited exception after review',
    allowedFiles: ALLOWED_RESIZE_OBSERVER,
  },
  {
    rule: 'no-raw-intersection-observer',
    pattern: /\bnew\s+IntersectionObserver\s*\(/,
    message:
      'Use the shared observer entry points instead of adding new raw IntersectionObserver() calls',
    suggestion:
      'Prefer useHmrInViewReveal() or extend useInfiniteScroll() unless the file is already an audited exception',
    allowedFiles: ALLOWED_INTERSECTION_OBSERVER,
  },
  {
    rule: 'no-raw-fetch-priority',
    pattern: /\bfetchpriority\s*=/,
    message: 'Use a shared media component prop instead of raw fetchpriority attributes',
    suggestion:
      'Route image priority through HmrPostCard imageFetchPriority or an audited media component wrapper',
    allowedFiles: ALLOWED_FETCH_PRIORITY,
  },
]

function normalizePath(file: string): string {
  return file.replace(/\\/g, '/')
}

function shouldSkipLine(line: string): boolean {
  const trimmed = line.trimStart()
  return COMMENT_PREFIXES.some((prefix) => trimmed.startsWith(prefix))
}

async function listSourceFiles(projectRoot: string): Promise<string[]> {
  const srcDir = join(projectRoot, 'src')
  const files: string[] = []

  for await (const entry of glob(SOURCE_GLOB, { cwd: srcDir })) {
    files.push(normalizePath(`src/${entry}`))
  }

  return files
}

async function scanLineRules(projectRoot: string, files: string[]): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = []

  for (const file of files) {
    const content = await readFile(join(projectRoot, file), 'utf-8')
    const lines = content.split(/\r?\n/)

    for (const [index, line] of lines.entries()) {
      if (shouldSkipLine(line)) continue

      for (const rule of LINE_RULES) {
        if (!rule.pattern.test(line)) continue
        if (rule.allowedFiles?.has(file)) continue

        issues.push({
          severity: 'error',
          message: rule.message,
          file,
          line: index + 1,
          rule: rule.rule,
          suggestion: rule.suggestion,
        })
      }
    }
  }

  return issues
}

async function scanVaporComponents(projectRoot: string, files: string[]): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = []

  for (const file of files) {
    if (!file.endsWith('.vue')) continue

    const content = await readFile(join(projectRoot, file), 'utf-8')
    const lines = content.split(/\r?\n/)
    const vaporLineIndex = lines.findIndex((line) => /<script\s+setup[^>]*\bvapor\b/.test(line))

    if (vaporLineIndex === -1) continue
    if (ALLOWED_VAPOR_COMPONENTS.has(file)) continue

    issues.push({
      severity: 'error',
      message: 'New Vapor component added outside the audited allowlist',
      file,
      line: vaporLineIndex + 1,
      rule: 'vapor-allowlist',
      suggestion:
        'Keep Vapor limited to manually audited props-only leaf components and update the allowlist only after review',
    })
  }

  return issues
}

const frontendPatternsAudit: AuditModule = {
  name: 'frontend-patterns',

  async run(options: AuditOptions): Promise<AuditResult> {
    const start = Date.now()
    const files = await listSourceFiles(options.projectRoot)
    const issues = [
      ...(await scanLineRules(options.projectRoot, files)),
      ...(await scanVaporComponents(options.projectRoot, files)),
    ]

    const { errorCount, warningCount, status } = summarizeAuditIssues(issues)

    const summary =
      issues.length === 0
        ? 'Rendering, idle, observer, and Vapor boundaries match the current repo baseline'
        : `Found ${errorCount} error(s) and ${warningCount} warning(s)`

    if (options.verbose && issues.length > 0) {
      for (const issue of issues) {
        const location = issue.file ? ` (${issue.file}${issue.line ? `:${issue.line}` : ''})` : ''
        console.log(`    [${issue.rule}] ${issue.message}${location}`)
      }
    }

    return {
      module: 'frontend-patterns',
      status,
      issues,
      summary,
      duration: Date.now() - start,
    }
  },
}

export default frontendPatternsAudit
