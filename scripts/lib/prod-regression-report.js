import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

function truncate(value, max = 400) {
  const text = String(value ?? '')
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 1))}…`
}

export function renderSkippedChecks(skips) {
  if (skips.length === 0) {
    return ['- 无 skipped 项', '']
  }

  const grouped = new Map()
  for (const item of skips) {
    const classification = item.classification ?? 'coverage-gap'
    const entries = grouped.get(classification) ?? []
    entries.push(item)
    grouped.set(classification, entries)
  }

  const lines = []
  for (const [classification, entries] of [...grouped.entries()].sort((left, right) =>
    String(left[0]).localeCompare(String(right[0]))
  )) {
    lines.push(`### ${classification}`)
    for (const entry of entries) {
      lines.push(
        `- **${entry.scope} / ${entry.name}**: ${truncate(entry.reason, 400)}${entry.severity ? ` (${entry.severity})` : ''}`
      )
    }
    lines.push('')
  }

  return lines
}

export function buildRunnerPreflightChecks({
  config,
  artifactDirReady,
  artifactDirError,
  contractIssues,
  routeOverview,
}) {
  return [
    {
      name: 'primary username',
      status: config.primaryUsername ? 'passed' : 'failed',
      classification: config.primaryUsername ? null : 'credential-missing',
      detail: config.primaryUsername ? 'PRIMARY_USERNAME present' : 'PRIMARY_USERNAME is missing',
    },
    {
      name: 'primary password',
      status: config.primaryPassword ? 'passed' : 'failed',
      classification: config.primaryPassword ? null : 'credential-missing',
      detail: config.primaryPassword ? 'PRIMARY_PASSWORD present' : 'PRIMARY_PASSWORD is missing',
    },
    {
      name: 'secondary email mode',
      status: config.secondaryEmailMode === 'user-assisted' ? 'passed' : 'failed',
      classification: config.secondaryEmailMode === 'user-assisted' ? null : 'dependency',
      detail:
        config.secondaryEmailMode === 'user-assisted'
          ? 'SECONDARY_EMAIL_MODE=user-assisted'
          : `Expected user-assisted, got ${config.secondaryEmailMode}`,
    },
    {
      name: 'artifact directory',
      status: artifactDirReady ? 'passed' : 'failed',
      classification: artifactDirReady ? null : 'dependency',
      detail: artifactDirReady
        ? `Artifacts will be written to ${config.artifactDir}`
        : artifactDirError ?? `Failed to prepare ${config.artifactDir}`,
    },
    {
      name: 'shared route contract',
      status: contractIssues.length === 0 ? 'passed' : 'failed',
      classification: contractIssues.length === 0 ? null : 'contract-drift',
      detail:
        contractIssues.length === 0
          ? `Validated ${routeOverview.guestRouteCount + routeOverview.authRouteCount} smoke routes and ${routeOverview.manualRunnerRouteCount} manual runner routes`
          : contractIssues.map((issue) => issue.message).join(' | '),
    },
    {
      name: 'route coverage summary',
      status: 'passed',
      classification: null,
      detail: [
        `guest=${routeOverview.guestRouteCount}`,
        `auth=${routeOverview.authRouteCount}`,
        `manualRunner=${routeOverview.manualRunnerRouteCount}`,
        `profile=${routeOverview.profileRouteCount}`,
        `detailReadiness=${routeOverview.detailReadinessRouteCount}`,
      ].join(', '),
    },
  ]
}

export function buildRunnerPreflightSummary({ config, checks, routeOverview }) {
  const failedChecks = checks.filter((check) => check.status === 'failed')

  return {
    kind: 'preflight',
    generatedAt: new Date().toISOString(),
    status: failedChecks.length === 0 ? 'passed' : 'failed',
    baseUrl: config.baseUrl,
    artifactDir: config.artifactDir,
    browserMode: config.headless ? 'headless' : 'headed',
    checks,
    routeOverview,
  }
}

export function buildRunnerPreflightMarkdownSummary(summary) {
  const failedChecks = summary.checks.filter((check) => check.status === 'failed')
  const renderRows = summary.checks.map(
    (check) =>
      `| ${check.name} | ${check.status} | ${check.classification ?? '-'} | ${check.detail ?? '-'} |`
  )

  const failedLines =
    failedChecks.length > 0
      ? failedChecks.map(
          (check) => `- ${check.name}: ${check.classification ?? 'failed'} · ${check.detail ?? 'n/a'}`
        )
      : ['- none']

  return [
    '# momichan.com 生产深度回归预检',
    '',
    `- 状态: ${summary.status}`,
    `- Base URL: ${summary.baseUrl}`,
    `- Artifact Dir: ${summary.artifactDir}`,
    `- Browser mode: ${summary.browserMode}`,
    `- Guest smoke routes: ${summary.routeOverview.guestRouteCount}`,
    `- Auth smoke routes: ${summary.routeOverview.authRouteCount}`,
    `- Manual runner routes: ${summary.routeOverview.manualRunnerRouteCount}`,
    `- Profile routes: ${summary.routeOverview.profileRouteCount}`,
    `- Detail readiness routes: ${summary.routeOverview.detailReadinessRouteCount}`,
    '',
    '## Checks',
    '',
    '| Check | Status | Classification | Details |',
    '| --- | --- | --- | --- |',
    ...renderRows,
    '',
    '## Failed Checks',
    '',
    ...failedLines,
    '',
    '## Runner Route Coverage',
    '',
    ...summary.routeOverview.manualRunnerRouteNames.map((name) => `- ${name}`),
    '',
    '## Detail Readiness Coverage',
    '',
    ...summary.routeOverview.detailReadinessRouteNames.map((name) => `- ${name}`),
    '',
  ].join('\n')
}

export async function writeRunnerPreflightArtifacts(summary) {
  const diagnosticsDir = join(summary.artifactDir, 'diagnostics')
  await mkdir(diagnosticsDir, { recursive: true })

  const jsonPath = join(summary.artifactDir, 'summary.json')
  const markdownPath = join(summary.artifactDir, 'summary.md')
  const diagnosticsPath = join(diagnosticsDir, 'preflight.json')
  const markdown = buildRunnerPreflightMarkdownSummary(summary)

  await writeFile(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
  await writeFile(markdownPath, `${markdown}\n`, 'utf8')
  await writeFile(diagnosticsPath, `${JSON.stringify(summary.checks, null, 2)}\n`, 'utf8')
}
