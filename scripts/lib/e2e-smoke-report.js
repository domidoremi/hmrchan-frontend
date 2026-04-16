import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export function createSmokeSummary(artifactDir, authLogin, authPassword) {
  return {
    artifactDir,
    baseUrl: null,
    authSmokeRequired: false,
    authLoginPresent: Boolean(authLogin),
    authPasswordPresent: Boolean(authPassword),
    authCredentialsDetected: Boolean(authLogin && authPassword),
    authSmokeExecuted: false,
    authSmokeSkipReason: null,
    lastFailedCheck: null,
    lastFailureEvidence: null,
    checks: [],
  }
}

export function resolveAuthSmokeCredentials(env = process.env) {
  const primaryLogin = env.PRIMARY_USERNAME?.trim() ?? ''
  const primaryPassword = env.PRIMARY_PASSWORD ?? ''
  if (primaryLogin || primaryPassword) {
    return {
      login: primaryLogin,
      password: primaryPassword,
      source: 'primary',
    }
  }

  const legacyLogin = env.E2E_AUTH_LOGIN?.trim() ?? ''
  const legacyPassword = env.E2E_AUTH_PASSWORD ?? ''
  if (legacyLogin || legacyPassword) {
    return {
      login: legacyLogin,
      password: legacyPassword,
      source: 'legacy',
    }
  }

  return {
    login: '',
    password: '',
    source: 'none',
  }
}

export function getAuthSkipReason(authLogin, authPassword, source = 'none') {
  if (authLogin && authPassword) return null

  if (source === 'primary') {
    if (!authLogin && !authPassword) {
      return 'PRIMARY_USERNAME/PRIMARY_PASSWORD are not set'
    }
    if (!authLogin) return 'PRIMARY_USERNAME is not set'
    return 'PRIMARY_PASSWORD is not set'
  }

  if (source === 'legacy') {
    if (!authLogin && !authPassword) {
      return 'E2E_AUTH_LOGIN/E2E_AUTH_PASSWORD are not set'
    }
    if (!authLogin) return 'E2E_AUTH_LOGIN is not set'
    return 'E2E_AUTH_PASSWORD is not set'
  }

  if (!authLogin && !authPassword) {
    return 'PRIMARY_USERNAME/PRIMARY_PASSWORD are not set (legacy aliases E2E_AUTH_LOGIN/E2E_AUTH_PASSWORD also supported)'
  }
  if (!authLogin) return 'PRIMARY_USERNAME is not set'
  return 'PRIMARY_PASSWORD is not set'
}

function groupChecks(summary, mode) {
  return summary.checks.filter((check) => check.mode === mode)
}

function countChecks(checks, status) {
  return checks.filter((check) => check.status === status).length
}

function renderReadiness(check) {
  const allSelectors = check.readinessSelectorsAll?.length
    ? `all: ${check.readinessSelectorsAll.join('<br>')}`
    : null
  const anySelectors = check.readinessSelectorsAny?.length
    ? `any: ${check.readinessSelectorsAny.join('<br>')}`
    : null

  return [allSelectors, anySelectors].filter(Boolean).join('<br>') || '-'
}

export function buildSmokeMarkdownSummary(summary) {
  const guestChecks = groupChecks(summary, 'guest')
  const authChecks = groupChecks(summary, 'auth')
  const guestPassed = countChecks(guestChecks, 'passed')
  const guestFailed = countChecks(guestChecks, 'failed')
  const authPassed = countChecks(authChecks, 'passed')
  const authFailed = countChecks(authChecks, 'failed')
  const authSkipped = countChecks(authChecks, 'skipped')

  const renderTable = (checks, label) => {
    const lines = [
      `### ${label}`,
      '',
      '| Check | Status | Path | Shell / Redirect | Readiness | Details |',
      '| --- | --- | --- | --- | --- | --- |',
    ]

    for (const check of checks) {
      const selectorOrRedirect = [
        check.selector,
        check.expectedPath ? `-> ${check.expectedPath}` : null,
      ]
        .filter(Boolean)
        .join('<br>')

      lines.push(
        `| ${check.name} | ${check.status} | ${check.path ?? '-'} | ${selectorOrRedirect || '-'} | ${renderReadiness(check)} | ${check.detail ?? '-'} |`
      )
    }

    lines.push('')
    return lines.join('\n')
  }

  return [
    '## E2E Smoke Summary',
    '',
    `- Base URL: \`${summary.baseUrl ?? 'unknown'}\``,
    `- Auth smoke required: ${summary.authSmokeRequired ? 'yes' : 'no'}`,
    `- Auth credentials detected: ${summary.authCredentialsDetected ? 'yes' : 'no'} (login: ${summary.authLoginPresent ? 'present' : 'missing'}, password: ${summary.authPasswordPresent ? 'present' : 'missing'})`,
    `- Guest smoke: ${guestPassed}/${guestChecks.length} passed${guestFailed ? `, ${guestFailed} failed` : ''}`,
    `- Auth smoke: ${summary.authSmokeExecuted ? `${authPassed}/${authChecks.length} passed${authFailed ? `, ${authFailed} failed` : ''}` : `skipped (${summary.authSmokeSkipReason ?? 'credentials unavailable'})`}`,
    `- Auth skipped routes: ${summary.authSmokeExecuted ? '0' : String(authSkipped)}`,
    `- Last failed check: ${summary.lastFailedCheck ?? 'none'}`,
    `- Last failure path: ${summary.lastFailureEvidence?.pathname ?? summary.lastFailureEvidence?.route ?? 'none'}`,
    `- Last failure title: ${summary.lastFailureEvidence?.title ?? 'n/a'}`,
    `- Failure screenshot: ${summary.lastFailureEvidence?.screenshotPath ?? 'n/a'}`,
    `- Failure HTML snapshot: ${summary.lastFailureEvidence?.htmlSnapshotPath ?? 'n/a'}`,
    `- Preview diagnostics attached: ${summary.lastFailureEvidence?.previewDiagnostics?.length ? 'yes' : 'no'}`,
    '',
    '### Auth Account Contract',
    '',
    '- No MFA',
    '- No step-up / risk verification',
    '- Seeded favorites, history, profile sections, comment-visible post/discussion routes, and devices/security access data',
    '',
    renderTable(guestChecks, 'Guest Smoke'),
    renderTable(authChecks, 'Auth Smoke'),
    ...(summary.lastFailureEvidence?.previewDiagnostics?.length
      ? [
          '### Preview Diagnostics',
          '',
          ...summary.lastFailureEvidence.previewDiagnostics.map((line) => `- ${line}`),
          '',
        ]
      : []),
  ].join('\n')
}

export async function writeSmokeArtifacts(summary) {
  await mkdir(summary.artifactDir, { recursive: true })
  const jsonPath = join(summary.artifactDir, 'summary.json')
  const markdownPath = join(summary.artifactDir, 'summary.md')
  const markdown = buildSmokeMarkdownSummary(summary)

  await writeFile(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
  await writeFile(markdownPath, `${markdown}\n`, 'utf8')
}
