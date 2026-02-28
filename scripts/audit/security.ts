import { readFile } from 'fs/promises'
import { join } from 'path'
import { glob } from 'fs/promises'
import type { AuditModule, AuditIssue, AuditOptions, AuditResult, AuditStatus } from './types'
import { runCommand } from './utils'

/** Regex patterns for detecting hardcoded secrets in source code */
const SECRET_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /['"](?:sk|pk)[-_](?:live|test)[-_][a-zA-Z0-9]{20,}['"]/, label: 'Stripe key' },
  { pattern: /['"]AIza[0-9A-Za-z_-]{35}['"]/, label: 'Google API key' },
  { pattern: /['"]ghp_[a-zA-Z0-9]{36}['"]/, label: 'GitHub token' },
  { pattern: /['"]glpat-[a-zA-Z0-9_-]{20,}['"]/, label: 'GitLab token' },
  { pattern: /['"]xox[bpors]-[a-zA-Z0-9-]{10,}['"]/, label: 'Slack token' },
  {
    pattern:
      /(?:api[_-]?key|api[_-]?secret|auth[_-]?token|access[_-]?token|secret[_-]?key)\s*[:=]\s*['"][a-zA-Z0-9_\-/.]{16,}['"]/i,
    label: 'Generic API key/token',
  },
  {
    pattern:
      /\b(?:password|passwd|pwd)\b\s*[:=]\s*['"](?=[^'"]*[A-Za-z])(?=[^'"]*\d)[^'"]{8,}['"]/i,
    label: 'Hardcoded password',
  },
]

/** Files/patterns to skip when scanning for secrets */
const SCAN_EXCLUDE = [
  /node_modules/,
  /\.spec\.ts$/,
  /\.test\.ts$/,
  /__tests__/,
  /dist\//,
  /\.d\.ts$/,
  /scripts\/audit\//,
]

async function auditDependencies(options: AuditOptions): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = []

  // Try bun pm audit first
  const bunResult = await runCommand('bun', ['pm', 'audit'], options.projectRoot)

  if (bunResult.exitCode !== 0) {
    // Fallback to npm audit --json
    const npmResult = await runCommand('npm', ['audit', '--json'], options.projectRoot)

    if (npmResult.exitCode !== 0 && npmResult.stdout) {
      try {
        const audit = JSON.parse(npmResult.stdout)
        const vulns = audit.vulnerabilities ?? audit.advisories ?? {}

        for (const [name, info] of Object.entries(vulns) as [string, Record<string, unknown>][]) {
          const sev = String(info.severity ?? 'unknown')
          const title = String(
            info.title ??
              (Array.isArray(info.via) && info.via[0]
                ? (info.via[0] as Record<string, unknown>).title
                : undefined) ??
              'unknown'
          )
          if (sev === 'high' || sev === 'critical') {
            issues.push({
              severity: 'error',
              message: `Vulnerability in ${name}: ${sev} - ${title}`,
              rule: 'dependency-audit',
              suggestion: `Run \`npm audit fix\` or update ${name}`,
            })
          } else if (sev === 'moderate') {
            issues.push({
              severity: 'warning',
              message: `Vulnerability in ${name}: ${sev}`,
              rule: 'dependency-audit',
            })
          }
        }
      } catch {
        // npm audit output wasn't valid JSON — report as info
        issues.push({
          severity: 'info',
          message: 'Could not parse dependency audit output',
          rule: 'dependency-audit',
        })
      }
    }
  } else {
    // bun pm audit succeeded (exit 0 = no issues)
    // If exit code was non-zero but we got output, parse it
    const output = bunResult.stdout + bunResult.stderr
    if (output.toLowerCase().includes('found') && output.toLowerCase().includes('vulnerabilit')) {
      issues.push({
        severity: 'warning',
        message: `Dependency audit reported issues: ${output.trim().split('\n')[0]}`,
        rule: 'dependency-audit',
      })
    }
  }

  return issues
}

async function scanForSecrets(options: AuditOptions): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = []
  const srcDir = join(options.projectRoot, 'src')

  const files: string[] = []
  try {
    for await (const entry of glob('**/*.{ts,vue,js}', { cwd: srcDir })) {
      const fullPath = join(srcDir, entry)
      if (SCAN_EXCLUDE.some((re) => re.test(fullPath))) continue
      files.push(entry)
    }
  } catch {
    issues.push({
      severity: 'info',
      message: 'Could not scan src/ directory for secrets',
      rule: 'secret-scan',
    })
    return issues
  }

  for (const file of files) {
    let content: string
    try {
      content = await readFile(join(srcDir, file), 'utf-8')
    } catch {
      continue
    }

    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Skip comments
      if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue
      // Skip lines referencing env vars (import.meta.env, process.env)
      if (line.includes('import.meta.env') || line.includes('process.env')) continue

      for (const { pattern, label } of SECRET_PATTERNS) {
        if (pattern.test(line)) {
          issues.push({
            severity: 'error',
            message: `Possible hardcoded secret (${label})`,
            file: `src/${file}`,
            line: i + 1,
            rule: 'secret-scan',
            suggestion: 'Move to environment variable',
          })
        }
      }
    }
  }

  return issues
}

async function checkGitignore(options: AuditOptions): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = []

  try {
    const content = await readFile(join(options.projectRoot, '.gitignore'), 'utf-8')

    const requiredPatterns = ['.env', '.env.local', '.env.*.local']
    for (const pattern of requiredPatterns) {
      // Check if the pattern appears as a line (not negated)
      const lines = content.split('\n').map((l) => l.trim())
      const found = lines.some((l) => l === pattern || l === `${pattern}/`)
      if (!found) {
        issues.push({
          severity: 'error',
          message: `.gitignore missing entry for "${pattern}"`,
          file: '.gitignore',
          rule: 'gitignore-env',
          suggestion: `Add "${pattern}" to .gitignore`,
        })
      }
    }
  } catch {
    issues.push({
      severity: 'error',
      message: '.gitignore file not found',
      rule: 'gitignore-env',
    })
  }

  return issues
}

async function checkViteConfig(options: AuditOptions): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = []

  try {
    const content = await readFile(join(options.projectRoot, 'vite.config.ts'), 'utf-8')

    // Check __VUE_PROD_DEVTOOLS__ is set to false
    if (!/__VUE_PROD_DEVTOOLS__\s*:\s*false/.test(content)) {
      issues.push({
        severity: 'error',
        message: '__VUE_PROD_DEVTOOLS__ is not set to false in vite.config.ts',
        file: 'vite.config.ts',
        rule: 'prod-devtools',
        suggestion: 'Add `__VUE_PROD_DEVTOOLS__: false` to the define block',
      })
    }

    // Also check __VUE_PROD_HYDRATION_MISMATCH_DETAILS__
    if (!/__VUE_PROD_HYDRATION_MISMATCH_DETAILS__\s*:\s*false/.test(content)) {
      issues.push({
        severity: 'warning',
        message: '__VUE_PROD_HYDRATION_MISMATCH_DETAILS__ is not set to false',
        file: 'vite.config.ts',
        rule: 'prod-devtools',
        suggestion: 'Add `__VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false` to the define block',
      })
    }
  } catch {
    issues.push({
      severity: 'error',
      message: 'vite.config.ts not found',
      rule: 'prod-devtools',
    })
  }

  return issues
}

const securityAudit: AuditModule = {
  name: 'security',

  async run(options: AuditOptions): Promise<AuditResult> {
    const start = Date.now()
    const allIssues: AuditIssue[] = []

    // 1. Dependency audit
    const depIssues = await auditDependencies(options)
    allIssues.push(...depIssues)

    // 2. Scan for hardcoded secrets
    const secretIssues = await scanForSecrets(options)
    allIssues.push(...secretIssues)

    // 3. Check .gitignore
    const gitignoreIssues = await checkGitignore(options)
    allIssues.push(...gitignoreIssues)

    // 4. Check vite.config.ts
    const viteIssues = await checkViteConfig(options)
    allIssues.push(...viteIssues)

    // Determine status
    const errorCount = allIssues.filter((i) => i.severity === 'error').length
    const warningCount = allIssues.filter((i) => i.severity === 'warning').length

    let status: AuditStatus = 'pass'
    if (errorCount > 0) status = 'fail'
    else if (warningCount > 0) status = 'warn'

    const summary =
      status === 'pass'
        ? 'No security issues found'
        : `Found ${errorCount} error(s) and ${warningCount} warning(s)`

    if (options.verbose && allIssues.length > 0) {
      for (const issue of allIssues) {
        const loc = issue.file ? ` (${issue.file}${issue.line ? `:${issue.line}` : ''})` : ''
        console.log(`    [${issue.rule}] ${issue.message}${loc}`)
      }
    }

    return {
      module: 'security',
      status,
      issues: allIssues,
      summary,
      duration: Date.now() - start,
    }
  },
}

export default securityAudit
