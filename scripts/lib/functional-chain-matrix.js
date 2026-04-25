import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const ACCOUNT_SPECS = Object.freeze([
  Object.freeze({
    role: 'primary',
    usernameKey: 'PRIMARY_USERNAME',
    passwordKey: 'PRIMARY_PASSWORD',
    required: true,
  }),
  Object.freeze({
    role: 'peer',
    usernameKey: 'PEER_USERNAME',
    passwordKey: 'PEER_PASSWORD',
    required: false,
  }),
  Object.freeze({
    role: 'admin',
    usernameKey: 'ADMIN_USERNAME',
    passwordKey: 'ADMIN_PASSWORD',
    required: false,
  }),
  Object.freeze({
    role: 'locked',
    usernameKey: 'LOCKED_USERNAME',
    passwordKey: 'LOCKED_PASSWORD',
    required: false,
  }),
  Object.freeze({
    role: 'disabled',
    usernameKey: 'DISABLED_USERNAME',
    passwordKey: 'DISABLED_PASSWORD',
    required: false,
  }),
])

function readTrimmed(env, key) {
  return typeof env[key] === 'string' ? env[key].trim() : ''
}

export function resolveFunctionalChainAccounts(env = process.env) {
  return ACCOUNT_SPECS.map((spec) => {
    const username = readTrimmed(env, spec.usernameKey)
    const password = typeof env[spec.passwordKey] === 'string' ? env[spec.passwordKey] : ''
    const configured = Boolean(username && password)
    const missing = [username ? null : spec.usernameKey, password ? null : spec.passwordKey].filter(
      Boolean
    )

    return {
      ...spec,
      username,
      password,
      configured,
      missing,
      skipReason: configured ? null : `${missing.join('/')} not set`,
    }
  })
}

export function validateFunctionalChainAccounts(accounts) {
  const primary = accounts.find((account) => account.role === 'primary')
  if (!primary?.configured) {
    return primary?.skipReason ?? 'PRIMARY_USERNAME/PRIMARY_PASSWORD not set'
  }
  return null
}

export function createFunctionalChainSummary({ artifactDir, baseUrl = null, accounts = [] }) {
  return {
    artifactDir,
    baseUrl,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: 'running',
    lastFailedCheck: null,
    checks: [],
    accounts: accounts.map((account) => ({
      role: account.role,
      usernamePresent: Boolean(account.username),
      passwordPresent: Boolean(account.password),
      configured: Boolean(account.configured),
      required: Boolean(account.required),
    })),
  }
}

export function appendFunctionalChainCheck(summary, check) {
  summary.checks.push({
    detail: null,
    ...check,
    finishedAt: check.finishedAt ?? new Date().toISOString(),
  })
  if (check.status === 'failed' || check.status === 'environment-blocked') {
    summary.lastFailedCheck = check.name
  }
}

export function finalizeFunctionalChainSummary(summary) {
  summary.finishedAt = new Date().toISOString()
  if (summary.checks.some((check) => check.status === 'failed')) {
    summary.status = 'failed'
    return summary
  }
  if (summary.checks.some((check) => check.status === 'environment-blocked')) {
    summary.status = 'environment-blocked'
    return summary
  }
  summary.status = 'passed'
  return summary
}

function countChecks(checks, status) {
  return checks.filter((check) => check.status === status).length
}

export function buildFunctionalChainMarkdownSummary(summary) {
  const checks = summary.checks
  const lines = [
    '## Functional Chain Local Matrix Summary',
    '',
    `- Status: ${summary.status}`,
    `- Base URL: \`${summary.baseUrl ?? 'unknown'}\``,
    `- Artifact dir: \`${summary.artifactDir}\``,
    `- Checks: ${countChecks(checks, 'passed')}/${checks.length} passed, ${countChecks(
      checks,
      'failed'
    )} failed, ${countChecks(checks, 'skipped')} skipped, ${countChecks(
      checks,
      'environment-blocked'
    )} environment-blocked`,
    `- Last failed check: ${summary.lastFailedCheck ?? 'none'}`,
    '',
    '### Accounts',
    '',
    '| Role | Username | Password | Required |',
    '| --- | --- | --- | --- |',
  ]

  for (const account of summary.accounts) {
    lines.push(
      `| ${account.role} | ${account.usernamePresent ? 'present' : 'missing'} | ${
        account.passwordPresent ? 'present' : 'missing'
      } | ${account.required ? 'yes' : 'no'} |`
    )
  }

  lines.push(
    '',
    '### Checks',
    '',
    '| Check | Status | Account | Detail |',
    '| --- | --- | --- | --- |'
  )

  for (const check of checks) {
    lines.push(
      `| ${check.name} | ${check.status} | ${check.accountRole ?? '-'} | ${check.detail ?? '-'} |`
    )
  }

  lines.push('')
  return lines.join('\n')
}

export async function writeFunctionalChainArtifacts(summary) {
  await mkdir(summary.artifactDir, { recursive: true })
  await writeFile(
    join(summary.artifactDir, 'summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`
  )
  await writeFile(
    join(summary.artifactDir, 'summary.md'),
    `${buildFunctionalChainMarkdownSummary(summary)}\n`
  )
}

export function isUuidString(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value ?? '')
  )
}
