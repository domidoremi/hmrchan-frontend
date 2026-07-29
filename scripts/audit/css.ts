import { readFile } from 'fs/promises'
import { join } from 'path'
import { glob } from 'fs/promises'
import type { AuditModule, AuditIssue, AuditOptions, AuditResult, Severity } from './types'
import { summarizeIssueSeverities } from './utils'

interface CSSRule {
  id: string
  pattern: RegExp
  severity: Severity
  message: string
  suggestion?: string
  /** If provided, lines matching any exclude pattern are skipped */
  excludePatterns?: RegExp[]
}

/**
 * Properties where hardcoded px is acceptable (micro-level details).
 * border, box-shadow, outline, icon sizes, max-width, min-width
 */
const PX_EXCLUDE_PATTERNS = [
  /\bborder\b/i,
  /\bbox-shadow\b/i,
  /\boutline\b/i,
  /\bmax-width\b/i,
  /\bmin-width\b/i,
  /\bmax-height\b/i,
  /\bmin-height\b/i,
  /\bborder-radius\b/i,
  /\bborder-width\b/i,
  /\bscrollbar/i,
  /\bbackdrop-filter\b/i,
  /\bfilter\b/i,
  /\btransform\b/i,
  /\btranslate\b/i,
  /\btext-shadow\b/i,
  /\bstroke-width\b/i,
  /\bbackground-size\b/i,
  /\bbackground-position\b/i,
  /\b-webkit-/i,
]

/** Layout properties where hardcoded px is problematic */
const PX_LAYOUT_PATTERN =
  /\b(?:width|height|padding|margin|gap|top|right|bottom|left|inset|flex-basis)\s*:\s*[^;]*\d+px/i
const ABSOLUTE_POSITION_TWEAK_PATTERN =
  /\b(?:top|right|bottom|left|inset)\s*:\s*-?\d+(?:\.\d+)?px\b/i
const MICRO_PX_THRESHOLD = 4

const CSS_RULES: CSSRule[] = [
  {
    id: 'no-hardcoded-px',
    pattern: PX_LAYOUT_PATTERN,
    severity: 'error',
    message: 'Hardcoded px in layout property',
    suggestion: 'Use %, rem, vw/vh, or fluid functions (clamp, min, max) instead',
    excludePatterns: PX_EXCLUDE_PATTERNS,
  },
  {
    id: 'no-legacy-vh',
    pattern: /\b\d+vh\b/,
    severity: 'warning',
    message: 'Legacy vh unit detected',
    suggestion: 'Use dvh/svh/lvh for better mobile support',
    excludePatterns: [/\b\d+(?:dvh|svh|lvh)\b/],
  },
  {
    id: 'font-size-rem',
    pattern: /\bfont-size\s*:\s*[^;]*\d+px/i,
    severity: 'warning',
    message: 'Font size using px instead of rem',
    suggestion: 'Use rem or clamp() for font sizes',
  },
]

/** Extract <style> block content from a .vue file, with line offsets */
function extractStyleBlocks(content: string): Array<{ css: string; startLine: number }> {
  const blocks: Array<{ css: string; startLine: number }> = []
  const regex = /<style[^>]*>([\s\S]*?)<\/style>/gi
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    const beforeMatch = content.slice(0, match.index)
    const startLine = beforeMatch.split('\n').length
    blocks.push({ css: match[1], startLine })
  }

  return blocks
}

/** Check if a line is a CSS comment or inside a comment-like context */
function isCommentLine(line: string): boolean {
  const trimmed = line.trim()
  return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')
}

/** Skip at-rules such as @media (max-width: 768px) */
function isAtRuleLine(line: string): boolean {
  return line.trimStart().startsWith('@')
}

/** Check if a line contains a CSS variable declaration (custom property) */
function isVarDeclaration(line: string): boolean {
  return /^\s*--/.test(line)
}

function countOccurrences(source: string, token: string): number {
  return source.split(token).length - 1
}

function isWithinReducedMotionBlock(lines: string[], currentIndex: number): boolean {
  let braceBalance = 0

  for (let i = currentIndex; i >= 0; i--) {
    const line = lines[i]
    braceBalance += countOccurrences(line, '}')
    braceBalance -= countOccurrences(line, '{')

    if (/@media[^{]*prefers-reduced-motion\s*:\s*reduce/i.test(line)) {
      return braceBalance <= 0
    }
  }

  return false
}

function isAllowedImportantLine(lines: string[], currentIndex: number, filePath: string): boolean {
  if (isWithinReducedMotionBlock(lines, currentIndex)) return true

  return /third-party|vendor|compat/i.test(filePath)
}

/** Extract all px numeric values from a CSS line */
function extractPxValues(line: string): number[] {
  const matches = line.match(/-?\d+(?:\.\d+)?px\b/g) ?? []
  return matches.map((m) => Number.parseFloat(m.replace('px', '')))
}

/** Check whether current vh usage is followed by a modern dvh/svh/lvh fallback */
function hasModernViewportFallback(
  lines: string[],
  currentIndex: number,
  property: string
): boolean {
  const maxLookahead = Math.min(lines.length, currentIndex + 4)

  for (let i = currentIndex + 1; i < maxLookahead; i++) {
    const candidate = lines[i]
    if (!candidate || isCommentLine(candidate) || candidate.trim() === '') continue

    const propMatch = candidate.match(/^\s*([a-z-]+)\s*:/i)
    if (!propMatch) break
    if (propMatch[1].toLowerCase() !== property.toLowerCase()) break

    if (/\b\d+(?:dvh|svh|lvh)\b/.test(candidate)) {
      return true
    }

    break
  }

  return false
}

function analyzeCSS(css: string, filePath: string, lineOffset: number): AuditIssue[] {
  const issues: AuditIssue[] = []
  const lines = css.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (isCommentLine(line) || isVarDeclaration(line) || isAtRuleLine(line)) continue

    if (line.includes('!important') && !isAllowedImportantLine(lines, i, filePath)) {
      issues.push({
        severity: 'error',
        message: '!important used outside approved exceptions',
        file: filePath,
        line: lineOffset + i,
        rule: 'no-important-outside-exceptions',
        suggestion:
          'Remove !important or confine it to reduced-motion, third-party overrides, or documented compatibility fallbacks',
      })
    }

    for (const rule of CSS_RULES) {
      if (!rule.pattern.test(line)) continue

      if (rule.id === 'no-hardcoded-px') {
        const pxValues = extractPxValues(line)
        if (pxValues.length > 0 && pxValues.every((v) => Math.abs(v) <= MICRO_PX_THRESHOLD)) {
          continue
        }

        if (ABSOLUTE_POSITION_TWEAK_PATTERN.test(line)) {
          continue
        }
      }

      if (rule.id === 'no-legacy-vh') {
        const propMatch = line.match(/^\s*([a-z-]+)\s*:/i)
        if (propMatch && hasModernViewportFallback(lines, i, propMatch[1])) {
          continue
        }
      }

      // Check exclude patterns
      if (rule.excludePatterns?.some((ep) => ep.test(line))) continue

      issues.push({
        severity: rule.severity,
        message: rule.message,
        file: filePath,
        line: lineOffset + i,
        rule: rule.id,
        suggestion: rule.suggestion,
      })
    }
  }

  return issues
}

function countStyleBlocks(content: string): { scoped: number; unscoped: number } {
  const matches = content.matchAll(/<style(?<attrs>[^>]*)>/gi)
  let scoped = 0
  let unscoped = 0

  for (const match of matches) {
    const attrs = match.groups?.attrs ?? ''
    if (/\bscoped\b/i.test(attrs)) scoped += 1
    else unscoped += 1
  }

  return { scoped, unscoped }
}

function analyzeVueStyleArchitecture(content: string, filePath: string): AuditIssue[] {
  const issues: AuditIssue[] = []
  const { scoped, unscoped } = countStyleBlocks(content)
  const styleBlocks = extractStyleBlocks(content)

  if (scoped > 0 && unscoped > 0) {
    issues.push({
      severity: 'error',
      message: 'Mixed scoped and unscoped <style> blocks detected',
      file: filePath,
      rule: 'no-mixed-style-blocks',
      suggestion:
        'Move global selectors into layered CSS files and keep the SFC style block scoped',
    })
  }

  if (/^src\/views\//.test(filePath) && /:global\((?:#app|\[data-)/.test(content)) {
    issues.push({
      severity: 'warning',
      message: 'View-level global theme selector detected',
      file: filePath,
      rule: 'no-view-global-theme-selectors',
      suggestion: 'Move page theme selectors into layered page-system CSS',
    })
  }

  if (/^src\/components\/ui\//.test(filePath) && /:global\((?:#app|\[data-)/.test(content)) {
    issues.push({
      severity: 'warning',
      message: 'Base UI component contains page/theme global selector',
      file: filePath,
      rule: 'no-ui-global-theme-selectors',
      suggestion: 'Move theme context rules into layered component CSS',
    })
  }

  if (/^src\/(?:components|views)\//.test(filePath)) {
    for (const block of styleBlocks) {
      const lines = block.css.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (isCommentLine(line)) continue

        if (line.includes(':global(')) {
          issues.push({
            severity: 'error',
            message: 'Scoped :global selector detected in first-party SFC',
            file: filePath,
            line: block.startLine + i,
            rule: 'no-first-party-global',
            suggestion:
              'Move app-state and theme selectors into layered CSS files under src/styles/',
          })
        }

        if (line.includes(':deep(') && filePath !== 'src/components/ui/TurnstileWidget.vue') {
          issues.push({
            severity: 'error',
            message: 'First-party :deep selector detected',
            file: filePath,
            line: block.startLine + i,
            rule: 'no-first-party-deep',
            suggestion:
              'Expose a class or CSS variable contract instead of styling child internals',
          })
        }
      }
    }
  }

  return issues
}

async function scanStyleEntrypoints(projectRoot: string): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = []
  const mainPath = join(projectRoot, 'src', 'main.ts')

  let content = ''
  try {
    content = await readFile(mainPath, 'utf-8')
  } catch {
    return issues
  }

  const imports = [...content.matchAll(/import\s+['"](.+?\.css)['"]/g)].map((match) => match[1])
  const disallowed = imports.filter(
    (spec) => spec.startsWith('./styles/') && spec !== './styles/index.css'
  )

  for (const spec of disallowed) {
    issues.push({
      severity: 'error',
      message: `Layer bypass style import detected: ${spec}`,
      file: 'src/main.ts',
      rule: 'single-style-entrypoint',
      suggestion: 'Import project styles through src/styles/index.css only',
    })
  }

  return issues
}

async function scanVueFiles(projectRoot: string): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = []
  const srcDir = join(projectRoot, 'src')

  try {
    for await (const entry of glob('**/*.vue', { cwd: srcDir })) {
      const fullPath = join(srcDir, entry)
      const relPath = `src/${entry}`

      let content: string
      try {
        content = await readFile(fullPath, 'utf-8')
      } catch {
        continue
      }

      const styleBlocks = extractStyleBlocks(content)
      issues.push(...analyzeVueStyleArchitecture(content, relPath))
      for (const block of styleBlocks) {
        issues.push(...analyzeCSS(block.css, relPath, block.startLine))
      }
    }
  } catch {
    issues.push({
      severity: 'info',
      message: 'Could not scan src/ directory for Vue files',
      rule: 'css-scan',
    })
  }

  return issues
}

async function scanCSSFiles(projectRoot: string): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = []
  const srcDir = join(projectRoot, 'src')

  try {
    for await (const entry of glob('**/*.css', { cwd: srcDir })) {
      const fullPath = join(srcDir, entry)
      const relPath = `src/${entry}`

      let content: string
      try {
        content = await readFile(fullPath, 'utf-8')
      } catch {
        continue
      }

      issues.push(...analyzeCSS(content, relPath, 1))
    }
  } catch {
    // Silently skip if no CSS files found
  }

  return issues
}

const cssAudit: AuditModule = {
  name: 'css',

  async run(options: AuditOptions): Promise<AuditResult> {
    const start = Date.now()
    const allIssues: AuditIssue[] = []

    // Scan .vue <style> blocks
    const vueIssues = await scanVueFiles(options.projectRoot)
    allIssues.push(...vueIssues)

    // Scan .css files
    const cssIssues = await scanCSSFiles(options.projectRoot)
    allIssues.push(...cssIssues)

    // Validate layered style entrypoint usage
    const entrypointIssues = await scanStyleEntrypoints(options.projectRoot)
    allIssues.push(...entrypointIssues)

    const { errorCount, warningCount, infoCount, status } = summarizeIssueSeverities(allIssues)

    const summary =
      status === 'pass'
        ? 'CSS conforms to project standards'
        : `Found ${errorCount} error(s), ${warningCount} warning(s), ${infoCount} info(s)`

    if (options.verbose && allIssues.length > 0) {
      for (const issue of allIssues) {
        const loc = issue.file ? ` (${issue.file}${issue.line ? `:${issue.line}` : ''})` : ''
        console.log(`    [${issue.rule}] ${issue.message}${loc}`)
      }
    }

    return {
      module: 'css',
      status,
      issues: allIssues,
      summary,
      duration: Date.now() - start,
    }
  },
}

export default cssAudit
