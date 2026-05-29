import type { AuditModule, AuditOptions, AuditReport, AuditResult } from './types'
import { colorize, formatDuration } from './utils'
import typeCheckAudit from './type-check'
import lintAudit from './lint'
import buildAudit from './build'
import testAudit from './test'
import securityAudit from './security'
import deadCodeAudit from './dead-code'
import pwaAudit from './pwa'
import buildArtifactAudit from './build-artifact'
import cssAudit from './css'
import i18nAudit from './i18n'
import envConfigAudit from './env-config'
import frontendPatternsAudit from './frontend-patterns'
import authSurfaceAudit from './auth-surface'
import legacyAlignmentAudit from './legacy-alignment'
import frontendContractAudit from './frontend-contract'

// --- Module registry ---
const modules: AuditModule[] = [
  typeCheckAudit,
  lintAudit,
  buildAudit,
  testAudit,
  securityAudit,
  deadCodeAudit,
  pwaAudit,
  buildArtifactAudit,
  cssAudit,
  i18nAudit,
  legacyAlignmentAudit,
  envConfigAudit,
  authSurfaceAudit,
  frontendContractAudit,
  frontendPatternsAudit,
]

// --- CLI arg parsing ---
function parseArgs(argv: string[]): {
  fix: boolean
  verbose: boolean
  list: boolean
  only: string[]
} {
  let fix = false
  let verbose = false
  let list = false
  const only: string[] = []

  for (const arg of argv) {
    if (arg === '--fix') fix = true
    else if (arg === '--verbose') verbose = true
    else if (arg === '--list') list = true
    else if (arg.startsWith('--only=')) {
      only.push(
        ...arg
          .slice('--only='.length)
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean)
      )
    }
  }

  return { fix, verbose, list, only }
}

// --- Report printer ---
function printReport(report: AuditReport): void {
  console.log('')
  console.log(colorize('═══════════════════════════════════════════════', 'bold'))
  console.log(colorize('  Audit Report', 'bold'))
  console.log(colorize('═══════════════════════════════════════════════', 'bold'))
  console.log('')

  for (const result of report.results) {
    const icon = result.status === 'pass' ? '✓' : result.status === 'warn' ? '⚠' : '✗'
    const line = `  ${icon} ${result.module.padEnd(20)} ${result.status.toUpperCase().padEnd(6)} ${formatDuration(result.duration)}`
    console.log(colorize(line, result.status))

    if (result.issues.length > 0) {
      for (const issue of result.issues) {
        const loc = issue.file ? ` (${issue.file}${issue.line ? `:${issue.line}` : ''})` : ''
        console.log(colorize(`      ${issue.severity}: ${issue.message}${loc}`, 'dim'))
      }
    }
  }

  console.log('')
  console.log(colorize('───────────────────────────────────────────────', 'dim'))
  console.log(
    `  ${colorize(`Pass: ${report.passCount}`, 'pass')}  ${colorize(`Warn: ${report.warnCount}`, 'warn')}  ${colorize(`Fail: ${report.failCount}`, 'fail')}  Issues: ${report.totalIssues}`
  )
  console.log(`  Total duration: ${formatDuration(report.totalDuration)}`)
  console.log('')
}

// --- Main ---
async function main(): Promise<void> {
  const { fix, verbose, list, only } = parseArgs(process.argv.slice(2))

  const options: AuditOptions = {
    fix,
    verbose,
    projectRoot: process.cwd(),
  }

  if (list) {
    console.log(modules.map((m) => m.name).join('\n'))
    return
  }

  const requestedModules = new Set(only.map((name) => name.toLowerCase()))
  const activeModules =
    requestedModules.size > 0
      ? modules.filter((m) => requestedModules.has(m.name.toLowerCase()))
      : modules

  if (requestedModules.size > 0 && activeModules.length !== requestedModules.size) {
    const matchedModuleNames = new Set(activeModules.map((m) => m.name.toLowerCase()))
    const missingModules = [...requestedModules].filter((name) => !matchedModuleNames.has(name))
    console.error(`No module found matching "${missingModules.join(', ')}"`)
    console.error(`Available modules: ${modules.map((m) => m.name).join(', ') || '(none)'}`)
    process.exit(1)
  }

  console.log(colorize(`\n  Running ${activeModules.length} audit module(s)...`, 'bold'))
  if (fix) console.log(colorize('  Auto-fix mode enabled', 'dim'))
  console.log('')

  const results: AuditResult[] = []
  const startTime = Date.now()

  for (const mod of activeModules) {
    if (verbose) console.log(colorize(`  → ${mod.name}...`, 'dim'))
    const result = await mod.run(options)
    results.push(result)
  }

  const totalDuration = Date.now() - startTime

  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    results,
    totalIssues: results.reduce((sum, r) => sum + r.issues.length, 0),
    passCount: results.filter((r) => r.status === 'pass').length,
    warnCount: results.filter((r) => r.status === 'warn').length,
    failCount: results.filter((r) => r.status === 'fail').length,
    totalDuration,
  }

  printReport(report)

  if (report.failCount > 0) process.exit(1)
}

main().catch((err) => {
  console.error('Audit runner failed:', err)
  process.exit(1)
})
